import typer
import os
import subprocess
import signal
import shutil
import toml
import socket
import time
import requests
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
    if not workspace:
        workspace = default_workspace

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

        toml_dir = os.path.dirname(os.path.abspath(toml))
        workspace = toml_dir

        config = parse_toml_config(toml)
        config = resolve_toml_paths(config, toml_dir)
        use_toml = True

    if not use_toml:
        workspace = workspace or get_workspace()

    if use_toml:
        host = config.get("SERVER", {}).get("HOST", "0.0.0.0")
        port = config.get("SERVER", {}).get("PORT", 8080)
        api_key = ""
        zap_home = config.get("ENV", {}).get("ZAP_DOWNLOADER_ZAP_HOME", ".zap")
        install_dir_from_config = config.get("PATHS", {}).get("INSTALL_DIR", "install")
        if os.path.isabs(install_dir_from_config):
            zap_install_dir = install_dir_from_config
        else:
            zap_install_dir = os.path.join(workspace, install_dir_from_config)
        workspace_cfg = config.get("ENV", {}).get("ZAP_DOWNLOADER_WORKSPACE", "")
        workspace = workspace_cfg if workspace_cfg else workspace
    else:
        zap_home = ".zap"
        zap_install_dir = dir if dir else os.path.join(workspace, "zap")

    jar_path = None

    if use_toml and config.get("PATHS", {}).get("JAR_PATH"):
        jar_path_rel = config["PATHS"]["JAR_PATH"]
        if os.path.isabs(jar_path_rel):
            candidate = jar_path_rel
        else:
            candidate = os.path.join(zap_install_dir, jar_path_rel)

        if os.path.exists(candidate):
            jar_path = candidate

    if not jar_path and os.path.exists(zap_install_dir):
        for root, dirs, files in os.walk(zap_install_dir):
            for f in files:
                if f.endswith(".jar") and f.startswith("zap"):
                    jar_path = os.path.join(root, f)
                    break
            if jar_path:
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

    log_file = os.path.join(workspace, "zap.log")

    try:
        with open(log_file, "w") as f:
            if os.name == "nt":
                subprocess.Popen(
                    cmd,
                    cwd=workspace,
                    stdout=f,
                    stderr=subprocess.STDOUT,
                    creationflags=0x08000000,
                )
            else:
                subprocess.Popen(
                    cmd,
                    cwd=workspace,
                    stdout=f,
                    stderr=subprocess.STDOUT,
                    start_new_session=True,
                )
        console.print(f"[green]ZAP daemon started on {host}:{port}[/green]")
        console.print(f"[blue]Logs: {log_file}[/blue]")

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


def status_daemon(
    name: str = typer.Option("zap-daemon", "--name", "-N", help="Process name"),
):
    """Check if ZAP daemon is running."""
    import json

    console.print(f"[blue]Checking ZAP daemon status...[/blue]")

    try:
        if os.name == "nt":
            result = subprocess.run(["tasklist"], capture_output=True, text=True)
            found = "java.exe" in result.stdout

            if found:
                console.print(f"[green]Process: java.exe (ZAP daemon)[/green]")
                console.print(f"[gray]Status: running[/gray]")

                for line in result.stdout.split("\n"):
                    if "java.exe" in line:
                        parts = line.split()
                        if len(parts) >= 2:
                            console.print(f"[gray]PID: {parts[1]}[/gray]")
            else:
                console.print("[yellow]ZAP daemon not running[/yellow]")
        else:
            console.print(
                "[yellow]Status check not implemented for this platform[/yellow]"
            )
    except Exception as e:
        console.print(f"[red]Error checking status: {e}[/red]")


def ping_daemon(
    host: str = typer.Option("127.0.0.1", "--host", "-H", help="Host to check"),
    port: int = typer.Option(8080, "--port", "-P", help="Port to check"),
    timeout: int = typer.Option(
        2000, "--timeout", "-T", help="Timeout in milliseconds"
    ),
    json_output: bool = typer.Option(False, "--json", help="Return as JSON"),
):
    """Check if the ZAP daemon host:port is reachable."""
    console.print(f"[blue]Pinging {host}:{port}...[/blue]")

    result = {"host": host, "port": port, "reachable": False, "error": None}

    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(timeout / 1000)
        sock.connect((host, port))
        sock.close()
        result["reachable"] = True
        console.print(f"[green]OK {host}:{port} is reachable[/green]")
    except Exception as e:
        result["error"] = str(e)
        console.print(f"[red]FAIL {host}:{port} is NOT reachable[/red]")
        console.print(f"[gray]Reason: {e}[/gray]")

    if json_output:
        console.print(json.dumps(result, indent=2))


def health_daemon(
    host: str = typer.Option("127.0.0.1", "--host", "-H", help="Host"),
    port: int = typer.Option(8080, "--port", "-P", help="Port"),
):
    """Check ZAP daemon health via API."""
    url = f"http://{host}:{port}/JSON/core/view/version/"

    console.print(f"[blue]Checking ZAP health at {url}[/blue]")

    try:
        resp = requests.get(url, timeout=10)
        if resp.status_code == 200:
            console.print(f"[green]OK ZAP is healthy[/green]")
            console.print(resp.text)
        else:
            console.print(f"[red]FAIL ZAP returned status {resp.status_code}[/red]")
    except Exception as e:
        console.print(f"[red]Health check failed: {e}[/red]")
        raise typer.Exit(1)


def check_started_daemon(
    host: str = typer.Option("127.0.0.1", "--host", "-H", help="Host"),
    port: int = typer.Option(8080, "--port", "-P", help="Port"),
    timeout: int = typer.Option(60, "--timeout", "-T", help="Max wait time in seconds"),
):
    """Wait until ZAP daemon responds to API."""
    url = f"http://{host}:{port}/JSON/core/view/version/"

    console.print(f"[blue]Waiting for ZAP to start at {url}[/blue]")

    start_time = time.time()
    while time.time() - start_time < timeout:
        try:
            resp = requests.get(url, timeout=5)
            if resp.status_code == 200:
                console.print(f"[green]OK ZAP started[/green]")
                console.print(f"[gray]Version response: {resp.text}[/gray]")
                return
        except:
            pass
        time.sleep(1)

    console.print(f"[red]Daemon failed to start within {timeout} seconds[/red]")
    raise typer.Exit(1)


def logs_daemon(
    name: str = typer.Option("zap-daemon", "--name", "-N", help="Process name"),
    lines: int = typer.Option(200, "--lines", "-n", help="Number of log lines"),
    err: bool = typer.Option(False, "--err", "-e", help="Show error log"),
    both: bool = typer.Option(False, "--both", "-b", help="Show both logs"),
    workspace: str = typer.Option(
        None, "--workspace", "-w", help="Workspace directory"
    ),
):
    """Show ZAP daemon logs."""
    from ..workspace import get_workspace

    workspace = workspace or get_workspace()
    log_file = os.path.join(workspace, "zap.log")
    zap_dir = os.path.join(workspace, ".zap")
    zap_log = os.path.join(zap_dir, "ZAP.log")

    if os.path.exists(zap_log):
        log_file = zap_log

    if not os.path.exists(log_file):
        console.print(f"[yellow]Log file not found: {log_file}[/yellow]")
        return

    with open(log_file, "r", encoding="utf-8", errors="ignore") as f:
        all_lines = f.readlines()
        log_lines = all_lines[-lines:] if lines > 0 else all_lines

    print("".join(log_lines))
