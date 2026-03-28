export interface ZapVersions {
  core: ZapCore;
  addons: ZapAddon[];
}

export interface ZapCore {
  version: string;
  dailyVersion: string;
  platforms: {
    daily?: ZapPlatform;
    windows32?: ZapPlatform;
    windows?: ZapPlatform;
    linux?: ZapPlatform;
    mac?: ZapPlatform;
  };
}

export interface ZapPlatform {
  url: string;
  file: string;
  hash: string;
  size: number;
}

export interface ZapAddon {
  id: string;
  name: string;
  description: string;
  author: string;
  version: string;
  file: string;
  status: 'release' | 'beta' | 'alpha';
  url: string;
  hash: string;
  size: number;
  date: string;
  notBeforeVersion: string;
  dependencies?: AddonDependency[];
}

export interface AddonDependency {
  id: string;
  version: string;
}

export interface AddonConfig {
  addons: AddonRequest[];
  output?: string;
}

export interface AddonRequest {
  id: string;
  status?: 'release' | 'beta' | 'alpha';
}

export interface ZapConfig {
  zap: {
    platform: string;
    version: string;
  };
  addons: AddonRequest[];
  output?: string;
}
