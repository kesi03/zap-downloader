import typer
import asyncio
import os
import json
from pathlib import Path
from typing import Optional
import yaml
from rich.console import Console

console = Console()


def addons(
    addon_ids: Optional[list[str]] = typer.Argument(None, help="Addon IDs to download"),
    config: Optional[str] = typer.Option(
        None, "--config", "-c", help="Path to YAML or JSON config file"
    ),
    status: Optional[str] = typer.Option(
        None, "--status", "-s", help="Filter by status: release, beta, alpha"
    ),
    workspace: Optional[str] = typer.Option(
        None, "--workspace", "-w", help="Workspace directory"
    ),
    output: Optional[str] = typer.Option(
        None, "--output", "-o", help="Output directory for addons"
    ),
    proxy: Optional[str] = typer.Option(None, "--proxy", "-x", help="Proxy URL"),
):
    """Download ZAP addons from config file or addon IDs."""
    asyncio.run(_download_addons(addon_ids, config, status, workspace, output, proxy))


async def _download_addons(
    addon_ids: Optional[list[str]],
    config: Optional[str],
    status: Optional[str],
    workspace: Optional[str],
    output: Optional[str],
    proxy: Optional[str],
):
    from ..workspace import ensure_workspace, get_workspace
    from ..downloader import download_file
    from ..parser import fetch_zap_versions
    from ..types import AddonRequest

    if not workspace:
        workspace = get_workspace()

    ensure_workspace(workspace)

    addon_requests: list[AddonRequest] = []

    if config:
        config_path = Path(config)
        if not config_path.exists():
            console.print(f"[red]Config file not found: {config}[/red]")
            raise typer.Exit(1)

        content = config_path.read_text(encoding="utf-8")
        if config_path.suffix in (".yaml", ".yml"):
            config_data = yaml.safe_load(content)
        elif config_path.suffix == ".json":
            config_data = json.loads(content)
        else:
            console.print(
                f"[red]Unsupported config file format: {config_path.suffix}[/red]"
            )
            raise typer.Exit(1)

        if not config_data.get("addons"):
            console.print("[red]No addons specified in config[/red]")
            raise typer.Exit(1)

        for addon in config_data["addons"]:
            addon_requests.append(
                AddonRequest(
                    id=addon["id"],
                    status=addon.get("status"),
                )
            )

        if not output and config_data.get("output"):
            output = config_data["output"]

    elif addon_ids:
        for addon_id in addon_ids:
            addon_requests.append(AddonRequest(id=addon_id, status=status))
    else:
        console.print("[red]Either --config or addon IDs must be provided[/red]")
        raise typer.Exit(1)

    if output:
        if output.startswith("./"):
            output = os.path.join(workspace, output[2:])
        addons_dir = output
    else:
        zap_dir = os.path.join(workspace, "zap")
        addons_dir = os.path.join(zap_dir, "addons")

    if not os.path.exists(addons_dir):
        os.makedirs(addons_dir, exist_ok=True)

    console.print("Fetching ZAP versions...")
    zap_versions = await fetch_zap_versions(proxy)

    addon_map = {addon.id: addon for addon in zap_versions.addons}

    downloaded = []
    for request in addon_requests:
        addon = addon_map.get(request.id)
        if not addon:
            console.print(f"[yellow]Addon not found: {request.id}[/yellow]")
            continue

        req_status = status or request.status
        if req_status and addon.status != req_status:
            console.print(f"[yellow]Skipping {request.id}: status mismatch[/yellow]")
            continue

        output_path = os.path.join(addons_dir, addon.file)
        await download_file(addon.url, output_path, addon.hash, proxy)
        downloaded.append(addon.id)

    if downloaded:
        console.print(
            f"[green]Downloaded {len(downloaded)} addons: {', '.join(downloaded)}[/green]"
        )
    else:
        console.print("[yellow]No addons downloaded[/yellow]")
