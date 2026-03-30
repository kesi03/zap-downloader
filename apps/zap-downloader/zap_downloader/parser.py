import aiohttp
import re
import os
import xmltodict
from typing import Any, Dict, List, Optional

from .types import (
    ZapVersions,
    ZapCore,
    ZapAddon,
    AddonDependency,
    ZapPlatform,
)


VERSIONS_URL = (
    "https://raw.githubusercontent.com/zaproxy/zap-admin/master/ZapVersions-dev.xml"
)


def get_proxy_url() -> Optional[str]:
    return (
        os.environ.get("HTTPS_PROXY")
        or os.environ.get("HTTP_PROXY")
        or os.environ.get("https_proxy")
        or os.environ.get("http_proxy")
    )


async def fetch_zap_versions(proxy_url: Optional[str] = None) -> ZapVersions:
    proxy = proxy_url or get_proxy_url()
    headers = {"User-Agent": "zap-downloader/1.0"}
    async with aiohttp.ClientSession(headers=headers) as session:
        async with session.get(VERSIONS_URL, proxy=proxy) as response:
            response.raise_for_status()
            xml = await response.text()
            return parse_zap_versions_xml(xml)


def parse_zap_versions_xml(xml: str) -> ZapVersions:
    result = xmltodict.parse(xml)
    zap = result.get("ZAP", {})

    core = _parse_core(zap.get("core", {}))
    addons = _parse_addons(zap)

    return ZapVersions(core=core, addons=addons)


def _parse_core(core_data: Dict[str, Any]) -> ZapCore:
    platforms: Dict[str, Optional[ZapPlatform]] = {}

    if core_data.get("daily"):
        platforms["daily"] = _parse_platform(core_data["daily"])
    if core_data.get("windows32"):
        platforms["windows32"] = _parse_platform(core_data["windows32"])
    if core_data.get("windows"):
        platforms["windows"] = _parse_platform(core_data["windows"])
    if core_data.get("linux"):
        platforms["linux"] = _parse_platform(core_data["linux"])
    if core_data.get("mac"):
        platforms["mac"] = _parse_platform(core_data["mac"])

    return ZapCore(
        version=core_data.get("version", ""),
        daily_version=core_data.get("daily-version", ""),
        platforms=platforms,
    )


def _parse_platform(platform_data: Dict[str, Any]) -> ZapPlatform:
    return ZapPlatform(
        url=platform_data.get("url", ""),
        file=platform_data.get("file", ""),
        hash=_normalize_hash(platform_data.get("hash", "")),
        size=int(platform_data.get("size", 0)),
    )


def _parse_addons(zap: Dict[str, Any]) -> List[ZapAddon]:
    addons: List[ZapAddon] = []

    addon_ids = zap.get("addon")
    if not addon_ids:
        return addons

    if isinstance(addon_ids, str):
        addon_ids = [addon_ids]
    elif not isinstance(addon_ids, list):
        addon_ids = []

    for addon_id in addon_ids:
        if not addon_id:
            continue
        addon_key = f"addon_{addon_id}"
        addon_data = zap.get(addon_key)
        if not addon_data:
            continue

        dependencies: List[AddonDependency] = []
        deps_data = addon_data.get("dependencies", {})
        if deps_data:
            deps_addons = deps_data.get("addons", {}).get("addon")
            if deps_addons:
                if isinstance(deps_addons, dict):
                    deps_addons = [deps_addons]
                for dep in deps_addons:
                    dependencies.append(
                        AddonDependency(
                            id=dep.get("id", ""),
                            version=dep.get("version", ""),
                        )
                    )

        addons.append(
            ZapAddon(
                id=addon_id,
                name=addon_data.get("name", ""),
                description=addon_data.get("description", ""),
                author=addon_data.get("author", ""),
                version=addon_data.get("version", ""),
                file=addon_data.get("file", ""),
                status=addon_data.get("status", "release"),
                url=addon_data.get("url", ""),
                hash=_normalize_hash(addon_data.get("hash", "")),
                size=int(addon_data.get("size", 0)),
                date=addon_data.get("date", ""),
                not_before_version=addon_data.get("notBeforeVersion", ""),
                dependencies=dependencies if dependencies else None,
            )
        )

    return addons


def _normalize_hash(hash_value: str) -> str:
    if not hash_value:
        return ""
    match = re.search(r"SHA-256:([a-fA-F0-9]+)", hash_value)
    if match:
        return match.group(1).lower()
    return hash_value.lower()
