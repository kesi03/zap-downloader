import typer
import os
import shutil
import tarfile
from rich.console import Console
from ..workspace import get_workspace
from ..parser import fetch_zap_versions

console = Console()


def package(
    output: str = typer.Option(
        "zap-package.tar", "--output", "-o", help="Output .tar archive path"
    ),
    workspace: str = typer.Option(
        None, "--workspace", "-w", help="Workspace directory"
    ),
    toml: str = typer.Option(
        None, "--toml", "-t", help="Include default toml config in package"
    ),
    platform: str = typer.Option(
        "linux", "--platform", "-p", help="Platform for ZAP core"
    ),
):
    """Package ZAP and addons into a .tar archive."""
    if not workspace:
        workspace = get_workspace()

    if not os.path.exists(workspace):
        console.print(f"[red]Workspace not found: {workspace}[/red]")
        raise typer.Exit(1)

    if not output.endswith(".tar"):
        output += ".tar"

    zap_dir = os.path.join(workspace, "zap")
    addons_dir = os.path.join(workspace, "addons")

    if toml:
        toml_dest = os.path.join(workspace, "default.toml")
        if os.path.exists(toml):
            shutil.copy2(toml, toml_dest)
            console.print(f"[green]Added default.toml to package[/green]")
        else:
            console.print(f"[red]TOML file not found: {toml}[/red]")
            raise typer.Exit(1)

    if not os.path.exists(zap_dir) and not os.path.exists(addons_dir):
        console.print("[red]No ZAP or addons found in workspace[/red]")
        raise typer.Exit(1)

    if not os.path.exists(os.path.join(workspace, "default.toml")):
        console.print(
            "[yellow]No default.toml found, generating default config...[/yellow]"
        )
        try:
            zap_versions = fetch_zap_versions()
            zap_version = zap_versions.core.version
        except Exception:
            zap_version = "unknown"

        toml_content = f"""[ENV]
ZAP_DOWNLOADER_WORKSPACE = ""

[SERVER]
PORT = 8080
HOST = "0.0.0.0"

[PATHS]
JAR_PATH = "zap/ZAP_{zap_version}/zap-{zap_version}.jar"
INSTALL_DIR = "zap"
DIR = ".zap"

[AUTOUPDATE]
enabled = false

[JAVA_OPTIONS]
flags = [
  "-Xms4g",
  "-Xmx4g",
  "-XX:+UseZGC",
  "-Xss512k",
  "-XX:MaxRAMPercentage=80",
]

[CONFIG]
flags = [
  "api.disablekey=true",
  "api.addrs.addr.name=.*",
  "api.addrs.addr.regex=true",
  "database.request.bodysize=104857600",
  "database.response.bodysize=104857600",
  "database.compact=true",
  "database.recoverylog=false",
  "ajaxSpider.browserId=chrome-headless",
  "ajaxSpider.numberOfBrowsers=1",
  "ajaxSpider.maxDuration=60",
  "ajaxSpider.maxStates=1000",
  "selenium.chromeArgs.args=--headless=new",
  "selenium.chromeArgs.args=--disable-gpu",
  "selenium.chromeArgs.args=--no-sandbox",
  "selenium.chromeArgs.args=--disable-dev-shm-usage",
  "selenium.chromeArgs.args=--memory-pressure-thresholds=1",
  "selenium.chromeArgs.args=--js-flags=--max-old-space-size=1024",
  "selenium.chrome.maxInstances=1",
  "addons.insights.death.threshold=-1"
]
"""
        toml_path = os.path.join(workspace, "default.toml")
        with open(toml_path, "w", encoding="utf-8") as f:
            f.write(toml_content)
        console.print("[green]Created default.toml with auto-update disabled[/green]")
        toml = toml_path

    output_dir = os.path.dirname(output)
    if output_dir and not os.path.exists(output_dir):
        os.makedirs(output_dir, exist_ok=True)

    with tarfile.open(output, "w") as tar:
        if os.path.exists(zap_dir):
            tar.add(zap_dir, arcname="zap")
            console.print(f"[green]Added zap/ to archive[/green]")

        if os.path.exists(addons_dir):
            tar.add(addons_dir, arcname="addons")
            console.print(f"[green]Added addons/ to archive[/green]")

        if os.path.exists(os.path.join(workspace, "default.toml")):
            tar.add(os.path.join(workspace, "default.toml"), arcname="default.toml")
            console.print(f"[green]Added default.toml to archive[/green]")

    console.print(f"[green]Package created: {output}[/green]")
