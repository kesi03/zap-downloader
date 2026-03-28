import typer
import os
import tarfile
from rich.console import Console

from ..workspace import get_workspace

console = Console()


def package(
    output: str = typer.Option(
        "zap-package.tar", "--output", "-o", help="Output .tar archive path"
    ),
    workspace: str = typer.Option(
        None, "--workspace", "-w", help="Workspace directory"
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

    if not os.path.exists(zap_dir) and not os.path.exists(addons_dir):
        console.print("[red]No ZAP or addons found in workspace[/red]")
        raise typer.Exit(1)

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

    console.print(f"[green]Package created: {output}[/green]")
