import typer
import os
from rich.console import Console

from ..workspace import ensure_workspace, get_workspace

console = Console()


def workspace(
    path: str = typer.Argument(None, help="Workspace path"),
):
    """Create or show workspace directory."""
    if path:
        ensure_workspace(path)
    else:
        ws = get_workspace()
        console.print(f"Workspace: {ws}")
        if os.path.exists(ws):
            console.print("[green]Workspace exists[/green]")
        else:
            console.print("[yellow]Workspace does not exist[/yellow]")
