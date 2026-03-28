"""
zap_downloader

OWASP ZAP Downloader - Download and manage ZAP core and addons.
"""

from .parser import fetch_zap_versions, parse_zap_versions_xml
from .downloader import download_file, validate_hash, calculate_hash, format_bytes
from .workspace import get_workspace, ensure_workspace
from .types import ZapVersions, ZapCore, ZapAddon, ZapConfig, AddonRequest

__version__ = "1.0.0"

__all__ = [
    "fetch_zap_versions",
    "parse_zap_versions_xml",
    "download_file",
    "validate_hash",
    "calculate_hash",
    "format_bytes",
    "get_workspace",
    "ensure_workspace",
    "ZapVersions",
    "ZapCore",
    "ZapAddon",
    "ZapConfig",
    "AddonRequest",
]
