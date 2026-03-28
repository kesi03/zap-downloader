import typer
import asyncio
import os
from rich.console import Console

console = Console()


def addons(
    addon_ids: list[str] = typer.Argument(..., help="Addon IDs to download"),
    status: str = typer.Option(
        None, "--status", "-s", help="Filter by status: release, beta, alpha"
    ),
    workspace: str = typer.Option(
        None, "--workspace", "-w", help="Workspace directory"
    ),
):
    """Download ZAP addons."""
    asyncio.run(_download_addons(addon_ids, status, workspace))


async def _download_addons(addon_ids: list[str], status: str, workspace: str):
    from ..workspace import ensure_workspace, get_workspace
    from ..downloader import download_file
    from ..parser import fetch_zap_versions

    if not workspace:
        workspace = get_workspace()

    ensure_workspace(workspace)

    console.print("Fetching ZAP versions...")
    zap_versions = await fetch_zap_versions()

    addons_dir = os.path.join(workspace, "addons")
    if not os.path.exists(addons_dir):
        os.makedirs(addons_dir, exist_ok=True)

    addon_map = {addon.id: addon for addon in zap_versions.addons}

    downloaded = []
    for addon_id in addon_ids:
        addon = addon_map.get(addon_id)
        if not addon:
            console.print(f"[yellow]Addon not found: {addon_id}[/yellow]")
            continue

        if status and addon.status != status:
            console.print(f"[yellow]Skipping {addon_id}: status mismatch[/yellow]")
            continue

        output_path = os.path.join(addons_dir, addon.file)
        await download_file(addon.url, output_path, addon.hash)
        downloaded.append(addon.id)

    if downloaded:
        console.print(
            f"[green]Downloaded {len(downloaded)} addons: {', '.join(downloaded)}[/green]"
        )
    else:
        console.print("[yellow]No addons downloaded[/yellow]")
