from typing import Optional, List
from dataclasses import dataclass


@dataclass
class ZapPlatform:
    url: str
    file: str
    hash: str
    size: int


@dataclass
class ZapCore:
    version: str
    daily_version: str
    platforms: dict


@dataclass
class AddonDependency:
    id: str
    version: str


@dataclass
class ZapAddon:
    id: str
    name: str
    description: str
    author: str
    version: str
    file: str
    status: str
    url: str
    hash: str
    size: int
    date: str
    not_before_version: str
    dependencies: Optional[List[AddonDependency]] = None


@dataclass
class ZapVersions:
    core: ZapCore
    addons: List[ZapAddon]


@dataclass
class AddonRequest:
    id: str
    status: Optional[str] = None


@dataclass
class AddonConfig:
    addons: List[AddonRequest]
    output: Optional[str] = None


@dataclass
class ZapConfig:
    zap: "ZapConfigPlatform"
    addons: List[AddonRequest]
    output: Optional[str] = None


@dataclass
class ZapConfigPlatform:
    platform: str
    version: str
