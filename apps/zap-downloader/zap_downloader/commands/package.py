import typer
import os
import shutil
from rich.console import Console

from ..workspace import get_workspace

console = Console()


def package(
    output: str = typer.Option(
        "zap-package", "--output", "-o", help="Output package directory"
    ),
    workspace: str = typer.Option(
        None, "--workspace", "-w", help="Workspace directory"
    ),
):
    """Package ZAP and addons into a directory."""
    if not workspace:
        workspace = get_workspace()

    if not os.path.exists(workspace):
        console.print(f"[red]Workspace not found: {workspace}[/red]")
        raise typer.Exit(1)

    if os.path.exists(output):
        shutil.rmtree(output)

    os.makedirs(output)

    zap_dir = os.path.join(workspace, "zap")
    if os.path.exists(zap_dir):
        dest_zap = os.path.join(output, "zap")
        shutil.copytree(zap_dir, dest_zap)
        console.print(f"[green]Copied ZAP to {dest_zap}[/green]")

    addons_dir = os.path.join(workspace, "addons")
    if os.path.exists(addons_dir):
        dest_addons = os.path.join(output, "addons")
        shutil.copytree(addons_dir, dest_addons)
        console.print(f"[green]Copied addons to {dest_addons}[/green]")

    console.print(f"[green]Package created: {output}[/green]")
