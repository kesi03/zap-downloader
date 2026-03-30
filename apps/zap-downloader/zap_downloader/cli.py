import typer
from typing import Optional
from .commands import (
    core,
    addons,
    list_versions,
    info,
    create_config,
    create_zap_config,
    create_toml_config,
    download_zap,
    package,
    unpack,
    daemon,
    workspace,
    validate,
    offline,
)

app = typer.Typer(
    name="zap-downloader",
    help="OWASP ZAP Downloader - Download and manage ZAP core and addons",
    add_completion=False,
)

daemon_app = typer.Typer(
    name="daemon",
    help="Manage ZAP daemon",
    add_completion=False,
)

app.add_typer(daemon_app)

daemon_app.command(name="start")(daemon.start_daemon)
daemon_app.command(name="stop")(daemon.stop_daemon)
daemon_app.command(name="status")(daemon.status_daemon)
daemon_app.command(name="ping")(daemon.ping_daemon)
daemon_app.command(name="health")(daemon.health_daemon)
daemon_app.command(name="started")(daemon.check_started_daemon)
daemon_app.command(name="log")(daemon.logs_daemon)

offline_app = typer.Typer(
    name="offline",
    help="Create offline ZAP package and unpack it",
    add_completion=False,
)

app.add_typer(offline_app)

offline_app.command(name="pack")(offline.pack_offline)
offline_app.command(name="unpack")(offline.unpack_offline)

app.command(name="core")(core.core)
app.command(name="addons")(addons.addons)
app.command(name="list")(list_versions.list_versions)
app.command(name="info")(info.info)
app.command(name="create-config")(create_config.create_config)
app.command(name="create-zap-config")(create_zap_config.create_zap_config)
app.command(name="create-toml-config")(create_toml_config.create_toml_config)
app.command(name="download-zap")(download_zap.download_zap)
app.command(name="package")(package.package)
app.command(name="unpack")(unpack.unpack)
app.command(name="workspace")(workspace.workspace)
app.command(name="validate")(validate.validate)


@app.callback()
def main(
    workspace: Optional[str] = typer.Option(
        None, "--workspace", "-w", help="Workspace directory"
    ),
    proxy: Optional[str] = typer.Option(
        None,
        "--proxy",
        "-x",
        help="Proxy URL (e.g., http://proxy:8080, or set HTTP_PROXY/HTTPS_PROXY env)",
    ),
):
    """OWASP ZAP Downloader."""
    pass


if __name__ == "__main__":
    app()
