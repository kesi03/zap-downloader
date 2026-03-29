import typer
import os
import subprocess
import signal
import shutil
import toml
from pathlib import Path
from rich.console import Console
from typing import Optional, Dict, Any, List

console = Console()

PID_FILE = "zap-daemon.pid"
PROCESS_NAME = "zap-daemon"


def parse_toml_config(toml_path: str) -> Dict[str, Any]:
    with open(toml_path, "r") as f:
        return toml.load(f)


def resolve_toml_paths(
    config: Dict[str, Any], default_workspace: str
) -> Dict[str, Any]:
    workspace = config.get("ENV", {}).get("ZAP_DOWNLOADER_WORKSPACE", default_workspace)

    env = config.get("ENV", {})
    env["ZAP_DOWNLOADER_WORKSPACE"] = workspace

    paths = config.get("PATHS", {})
    paths["JAR_PATH"] = paths.get("JAR_PATH", "")
    paths["DIR"] = paths.get("DIR", ".zap")
    paths["INSTALL_DIR"] = paths.get(
        "INSTALL_DIR", os.path.join(workspace, "install").replace("\\", "/")
    )

    return config


def start_daemon(
    toml: Optional[str] = typer.Option(
        None, "--toml", "-t", help="Path to zap.toml configuration file"
    ),
    dir: Optional[str] = typer.Option(
        None, "--dir", "-d", help="ZAP installation directory (where zap.jar is)"
    ),
    workspace: Optional[str] = typer.Option(
        None, "--workspace", "-w", help="ZAP working directory"
    ),
    host: str = typer.Option("0.0.0.0", "--host", help="ZAP host to bind to"),
    port: int = typer.Option(8080, "--port", "-P", help="ZAP proxy port"),
    api_key: str = typer.Option("", "--api-key", "-k", help="ZAP API key"),
    name: str = typer.Option(
        "zap-daemon", "--name", "-N", help="Process name for tracking"
    ),
):
    """Start ZAP as a daemon."""
    from ..workspace import get_workspace

    config: Dict[str, Any] = {}
    use_toml = False

    if toml:
        if not os.path.exists(toml):
            console.print(f"[red]TOML file not found: {toml}[/red]")
            raise typer.Exit(1)
        console.print(f"[blue]Using TOML config: {toml}[/blue]")
        config = parse_toml_config(toml)
        config = resolve_toml_paths(config, workspace or get_workspace())
        use_toml = True

    workspace = workspace or get_workspace()

    if use_toml:
        host = config.get("SERVER", {}).get("HOST", "0.0.0.0")
        port = config.get("SERVER", {}).get("PORT", 8080)
        api_key = ""
        zap_home = config.get("ENV", {}).get("ZAP_DOWNLOADER_ZAP_HOME", ".zap")
        zap_install_dir = config.get("PATHS", {}).get(
            "INSTALL_DIR", os.path.join(workspace, "install")
        )
        workspace = config.get("ENV", {}).get("ZAP_DOWNLOADER_WORKSPACE", workspace)
    else:
        zap_home = ".zap"
        zap_install_dir = dir if dir else os.path.join(workspace, "zap")

    jar_path = None

    if use_toml and config.get("PATHS", {}).get("JAR_PATH"):
        if os.path.exists(config["PATHS"]["JAR_PATH"]):
            jar_path = config["PATHS"]["JAR_PATH"]

    if not jar_path and os.path.exists(zap_install_dir):
        for f in os.listdir(zap_install_dir):
            if f.endswith(".jar") and f.startswith("zap"):
                jar_path = os.path.join(zap_install_dir, f)
                break

    if not jar_path:
        console.print(f"[red]JAR file not found in: {zap_install_dir}[/red]")
        raise typer.Exit(1)

    if not os.path.exists(workspace):
        os.makedirs(workspace, exist_ok=True)

    tmp_dir = os.path.join(workspace, "tmp")
    if not os.path.exists(tmp_dir):
        os.makedirs(tmp_dir, exist_ok=True)

    zap_dir = os.path.join(workspace, zap_home)
    if not os.path.exists(zap_dir):
        os.makedirs(zap_dir, exist_ok=True)

    install_dir = os.path.dirname(jar_path)
    plugin_install_dir = os.path.join(install_dir, "plugin")
    plugin_zap_dir = os.path.join(zap_dir, "plugin")

    if not os.path.exists(plugin_zap_dir) and os.path.exists(plugin_install_dir):
        os.makedirs(plugin_zap_dir, exist_ok=True)
        for f in os.listdir(plugin_install_dir):
            src = os.path.join(plugin_install_dir, f)
            dest = os.path.join(plugin_zap_dir, f)
            if not os.path.exists(dest):
                shutil.copy2(src, dest)

    java_options: List[str] = []

    if use_toml and config.get("JAVA_OPTIONS", {}).get("flags"):
        java_options.extend(config["JAVA_OPTIONS"]["flags"])
    else:
        java_options.append("-Xmx2g")

    java_options.append(f"-Djava.io.tmpdir={tmp_dir}")

    config_flags: List[str] = []

    if use_toml and config.get("CONFIG", {}).get("flags"):
        config_flags.extend(config["CONFIG"]["flags"])
    else:
        if api_key:
            config_flags.append(f"api.key={api_key}")
        else:
            config_flags.append("api.disablekey=true")
        config_flags.append("api.addrs.addr.name=.*")
        config_flags.append("api.addrs.addr.regex=true")

    cmd = [
        "java",
    ]
    cmd.extend(java_options)
    cmd.extend(
        [
            "-jar",
            jar_path,
            "-daemon",
            "-dir",
            zap_dir,
            "-installdir",
            install_dir,
            "-host",
            host,
            "-port",
            str(port),
        ]
    )

    for flag in config_flags:
        cmd.extend(["-config", flag])

    console.print(f"[blue]Starting ZAP daemon...[/blue]")
    console.print(f"[gray]JAR: {jar_path}[/gray]")
    console.print(f"[gray]Port: {port}[/gray]")
    console.print(f"[gray]Working dir: {workspace}[/gray]")
    if use_toml:
        console.print(f"[gray]Config: TOML ({toml})[/gray]")

    try:
        if os.name == "nt":
            DETACHED_PROCESS = 0x00000008
            subprocess.Popen(
                cmd,
                cwd=workspace,
                creationflags=DETACHED_PROCESS,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
            console.print(f"[green]ZAP daemon started on {host}:{port}[/green]")
        else:
            with open(os.path.join(workspace, "zap.log"), "w") as f:
                subprocess.Popen(
                    cmd,
                    cwd=workspace,
                    stdout=f,
                    stderr=subprocess.STDOUT,
                    start_new_session=True,
                )
            console.print(f"[green]ZAP daemon started on {host}:{port}[/green]")
            console.print(f"[blue]Logs: {os.path.join(workspace, 'zap.log')}[/blue]")

    except Exception as e:
        console.print(f"[red]Failed to start ZAP daemon: {e}[/red]")
        raise typer.Exit(1)


def stop_daemon(
    workspace: Optional[str] = typer.Option(
        None, "--workspace", "-w", help="ZAP working directory"
    ),
    name: str = typer.Option("zap-daemon", "--name", "-N", help="Process name"),
):
    """Stop ZAP daemon."""
    from ..workspace import get_workspace

    if not workspace:
        workspace = get_workspace()

    console.print(f"[blue]Stopping ZAP daemon...[/blue]")

    pid_file = os.path.join(workspace, f"{name}.pid")

    try:
        if os.name == "nt":
            result = subprocess.run(["tasklist"], capture_output=True, text=True)
            for line in result.stdout.split("\n"):
                if "java.exe" in line:
                    subprocess.run(["taskkill", "/F", "/IM", "java.exe"], check=False)
                    console.print("[green]ZAP daemon stopped[/green]")
                    return
        else:
            with open(pid_file, "r") as f:
                pid = int(f.read().strip())
            os.kill(pid, signal.SIGTERM)
            os.remove(pid_file)
            console.print("[green]ZAP daemon stopped[/green]")
            return
    except FileNotFoundError:
        pass
    except ProcessLookupError:
        pass
    except Exception as e:
        console.print(f"[red]Error stopping daemon: {e}[/red]")

    console.print("[yellow]No running daemon found[/yellow]")
