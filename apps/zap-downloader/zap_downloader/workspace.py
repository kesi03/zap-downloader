import os
from pathlib import Path
from rich.console import Console

console = Console()

DEFAULT_WORKSPACE = "zap-workspace"


def get_workspace() -> str:
    return os.environ.get("ZAP_PACKAGES_WORKSPACE", DEFAULT_WORKSPACE)


def ensure_workspace(workspace_path: str = None) -> str:
    workspace = workspace_path or get_workspace()
    if not os.path.exists(workspace):
        os.makedirs(workspace, exist_ok=True)
        console.print(f"[green]Created workspace: {workspace}[/green]")
    return workspace
