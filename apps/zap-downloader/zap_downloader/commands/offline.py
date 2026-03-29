import typer
import os
import shutil
import tarfile
import tempfile
import asyncio
from rich.console import Console

console = Console()


def pack_offline(
    output: str = typer.Option(
        "zap-offline.tar", "--output", "-o", help="Output .tar archive path"
    ),
    platform: str = typer.Option(
        "linux", "--platform", "-p", help="Platform for ZAP core"
    ),
):
    """Create offline ZAP package with all addons."""

    async def _pack():
        from ..parser import fetch_zap_versions
        from ..downloader import download_file

        temp_dir = tempfile.mkdtemp(prefix="zap-offline-")
        workspace = os.path.join(temp_dir, "workspace")
        zap_dir = os.path.join(workspace, "zap")
        addons_dir = os.path.join(workspace, "addons")
        install_dir = os.path.join(workspace, "install")

        try:
            console.print(f"[blue]Creating offline ZAP package...[/blue]")
            console.print(f"[gray]Temp workspace: {workspace}[/gray]")

            os.makedirs(zap_dir, exist_ok=True)
            os.makedirs(addons_dir, exist_ok=True)
            os.makedirs(install_dir, exist_ok=True)

            console.print(f"[blue]=== Downloading ZAP core ===[/blue]")
            zap_versions = await fetch_zap_versions()
            platform_data = zap_versions.core.platforms.get(platform)

            if not platform_data:
                console.print(f"[red]Platform {platform} not available[/red]")
                raise typer.Exit(1)

            console.print(f"Platform: {platform}")
            console.print(f"Version: {zap_versions.core.version}")
            console.print(f"Size: {platform_data.size / (1024 * 1024):.2f} MB")

            core_output = os.path.join(zap_dir, platform_data.file)
            await download_file(platform_data.url, core_output, platform_data.hash)
            console.print(f"[green]ZAP core downloaded[/green]")

            console.print(
                f"[blue]=== Downloading ALL addons (release + beta + alpha) ===[/blue]"
            )
            all_addons = zap_versions.addons
            console.print(f"Found {len(all_addons)} addons")

            downloaded_ids = set()
            failed_addons = []

            for addon in all_addons:
                if addon.id in downloaded_ids:
                    continue

                console.print(
                    f"\nDownloading {addon.id} v{addon.version} ({addon.status})..."
                )

                if addon.dependencies:
                    console.print(
                        f"  Dependencies: {[d.id for d in addon.dependencies]}"
                    )

                output_path = os.path.join(addons_dir, addon.file)
                try:
                    await download_file(addon.url, output_path, addon.hash)
                    downloaded_ids.add(addon.id)
                except Exception as e:
                    console.print(
                        f"[yellow]  Skipping {addon.id}: hash mismatch (may be outdated)[/yellow]"
                    )
                    failed_addons.append(addon.id)
                    if os.path.exists(output_path):
                        os.remove(output_path)

            console.print(f"[blue]=== Creating offline config ===[/blue]")
            jar_path = f"zap/ZAP_{zap_versions.core.version}/zap-{zap_versions.core.version}.jar"

            toml_content = f"""[ENV]
ZAP_DOWNLOADER_WORKSPACE = ""

[SERVER]
PORT = 8080
HOST = "0.0.0.0"

[PATHS]
JAR_PATH = "{jar_path}"
INSTALL_DIR = "zap"
DIR = ".zap"

[AUTOUPDATE]
enabled = false

[JAVA_OPTIONS]
flags = [
  "-Xmx2g",
  "-Xss512k"
]

[CONFIG]
flags = [
  "api.disablekey=true",
  "api.addrs.addr.name=.*",
  "api.addrs.addr.regex=true",
  "autoupdate.enabled=false",
  "database.response.bodysize=104857600",
  "database.cache.size=1000000",
  "database.recoverylog=false"
]
"""
            toml_path = os.path.join(workspace, "default.toml")
            with open(toml_path, "w") as f:
                f.write(toml_content)
            console.print(
                f"[green]Created default.toml with auto-update disabled[/green]"
            )

            console.print(f"[blue]=== Creating package ===[/blue]")

            package_path = os.path.join(temp_dir, output)
            with tarfile.open(package_path, "w") as tar:
                tar.add(workspace, arcname="workspace")

            final_output = os.path.abspath(output)
            shutil.move(package_path, final_output)

            size = os.path.getsize(final_output)
            console.print(f"[green]Package created: {final_output}[/green]")
            console.print(f"[blue]Size: {size / (1024 * 1024):.2f} MB[/blue]")

        except Exception as e:
            console.print(f"[red]Failed to create offline package: {e}[/red]")
            raise typer.Exit(1)
        finally:
            shutil.rmtree(temp_dir, ignore_errors=True)

    asyncio.run(_pack())


def unpack_offline(
    input: str = typer.Option(..., "--input", "-i", help="Path to .tar package file"),
    output: str = typer.Option(None, "--output", "-o", help="Output directory"),
):
    """Unpack offline ZAP package."""
    import tarfile

    if not os.path.exists(input):
        console.print(f"[red]Package not found: {input}[/red]")
        raise typer.Exit(1)

    if not output:
        output = os.path.basename(input).rsplit(".", 1)[0]

    os.makedirs(output, exist_ok=True)

    console.print(f"[blue]Unpacking to {output}...[/blue]")

    try:
        with tarfile.open(input, "r") as tar:
            tar.extractall(output)

        workspace_dir = os.path.join(output, "workspace")
        if not os.path.exists(workspace_dir):
            console.print(f"[red]Invalid package: workspace folder not found[/red]")
            raise typer.Exit(1)

        zap_dir = os.path.join(workspace_dir, "zap")
        addons_dir = os.path.join(workspace_dir, "addons")

        tar_gz_path = None
        zap_version_dir = None

        if os.path.exists(zap_dir):
            for f in os.listdir(zap_dir):
                if f.startswith("ZAP_") and f.endswith(".tar.gz"):
                    tar_gz_path = os.path.join(zap_dir, f)
                    break
                elif f.startswith("ZAP_") and os.path.isdir(os.path.join(zap_dir, f)):
                    zap_version_dir = os.path.join(zap_dir, f)
                    break

        if tar_gz_path:
            console.print(f"[blue]Extracting {os.path.basename(tar_gz_path)}...[/blue]")
            with tarfile.open(tar_gz_path, "r:gz") as tar_gz:
                tar_gz.extractall(zap_dir)
            os.remove(tar_gz_path)

            for f in os.listdir(zap_dir):
                if f.startswith("ZAP_") and os.path.isdir(os.path.join(zap_dir, f)):
                    zap_version_dir = os.path.join(zap_dir, f)
                    break

        if zap_version_dir:
            plugin_dir = os.path.join(zap_version_dir, "plugin")
            addons_in_zap_dir = os.path.join(zap_dir, "addons")

            addons_to_process = None
            if os.path.exists(addons_in_zap_dir):
                addons_to_process = addons_in_zap_dir
            elif os.path.exists(addons_dir):
                addons_to_process = addons_dir

            if addons_to_process:
                existing_addons = (
                    set(os.listdir(plugin_dir)) if os.path.exists(plugin_dir) else set()
                )
                addons_to_move = [
                    f for f in os.listdir(addons_to_process) if f not in existing_addons
                ]

                if addons_to_move:
                    os.makedirs(plugin_dir, exist_ok=True)
                    for f in addons_to_move:
                        src = os.path.join(addons_to_process, f)
                        dest = os.path.join(plugin_dir, f)
                        shutil.move(src, dest)
                    console.print(
                        f"[green]Moved {len(addons_to_move)} addons to {plugin_dir}[/green]"
                    )
                else:
                    console.print(
                        "[yellow]Addons already present in plugin folder[/yellow]"
                    )

                if os.path.exists(addons_to_process):
                    shutil.rmtree(addons_to_process)
        elif os.path.exists(addons_dir):
            console.print(
                f"[yellow]No ZAP version folder found, addons remain in: {addons_dir}[/yellow]"
            )

        console.print(f"[green]Unpack complete: {output}[/green]")
        console.print(
            f"[blue]Run ZAP with: zap-downloader daemon start -t {workspace_dir}/default.toml[/blue]"
        )

    except Exception as e:
        console.print(f"[red]Failed to extract package: {e}[/red]")
        raise typer.Exit(1)
