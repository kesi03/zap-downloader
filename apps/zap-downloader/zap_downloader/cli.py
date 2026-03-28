import typer
from typing import Optional
from .commands import (
    core,
    addons,
    list_versions,
    info,
    create_config,
    create_zap_config,
    download_zap,
    package,
    workspace,
    validate,
)

app = typer.Typer(
    name="zap-downloader",
    help="OWASP ZAP Downloader - Download and manage ZAP core and addons",
    add_completion=False,
)

app.command(name="core")(core.core)
app.command(name="addons")(addons.addons)
app.command(name="list")(list_versions.list_versions)
app.command(name="info")(info.info)
app.command(name="create-config")(create_config.create_config)
app.command(name="create-zap-config")(create_zap_config.create_zap_config)
app.command(name="download-zap")(download_zap.download_zap)
app.command(name="package")(package.package)
app.command(name="workspace")(workspace.workspace)
app.command(name="validate")(validate.validate)


@app.callback()
def main(
    workspace: Optional[str] = typer.Option(
        None, "--workspace", "-w", help="Workspace directory"
    ),
):
    """OWASP ZAP Downloader."""
    pass


if __name__ == "__main__":
    app()
