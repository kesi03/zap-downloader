import typer
import yaml
import asyncio
from typing import Optional
from rich.console import Console

console = Console()


def create_zap_config(
    platform: str = typer.Option(
        "windows",
        "--platform",
        "-p",
        help="Platform: windows, windows32, linux, mac, daily",
    ),
    addons: list[str] = typer.Option([], "--addons", "-a", help="Addon IDs to include"),
    output: str = typer.Option(
        "zap-config.yaml", "--output", "-o", help="Output file path"
    ),
    proxy: Optional[str] = typer.Option(None, "--proxy", "-x", help="Proxy URL"),
):
    """Create ZAP config file with core and addons."""
    asyncio.run(_create_config(platform, addons, output, proxy))


async def _create_config(
    platform: str, addon_ids: list[str], output: str, proxy: Optional[str]
):
    from ..parser import fetch_zap_versions

    console.print("Fetching ZAP versions...")
    zap_versions = await fetch_zap_versions(proxy)

    config = {
        "zap": {
            "platform": platform,
            "version": zap_versions.core.version,
        },
        "addons": [{"id": addon_id} for addon_id in addon_ids],
    }

    with open(output, "w") as f:
        yaml.dump(config, f, default_flow_style=False)

    console.print(f"[green]Config created: {output}[/green]")
    console.print(f"ZAP Version: {zap_versions.core.version}")
    console.print(f"Platform: {platform}")
