import typer
import yaml
from rich.console import Console

console = Console()


def create_config(
    addons: list[str] = typer.Option(
        ..., "--addons", "-a", help="Addon IDs to include"
    ),
    output: str = typer.Option(
        "addon-config.yaml", "--output", "-o", help="Output file path"
    ),
    status: str = typer.Option(
        "release", "--status", "-s", help="Default status filter"
    ),
):
    """Create addon config file."""
    config = {"addons": [{"id": addon_id, "status": status} for addon_id in addons]}

    with open(output, "w") as f:
        yaml.dump(config, f, default_flow_style=False)

    console.print(f"[green]Config created: {output}[/green]")
