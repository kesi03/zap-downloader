import { parseStringPromise } from 'xml2js';
import axios from 'axios';
import { ZapVersions, ZapCore, ZapAddon, AddonDependency } from './types';

const VERSIONS_URL = 'https://raw.githubusercontent.com/zaproxy/zap-admin/master/ZapVersions-dev.xml';

export async function fetchZapVersions(): Promise<ZapVersions> {
  const response = await axios.get(VERSIONS_URL);
  return parseZapVersionsXml(response.data);
}

export async function parseZapVersionsXml(xml: string): Promise<ZapVersions> {
  const result = await parseStringPromise(xml, { explicitArray: false, trim: true });
  const zap = result.ZAP;
  
  const core = parseCore(zap.core);
  const addons = parseAddons(zap);
  
  return { core, addons };
}

function parseCore(core: any): ZapCore {
  const platforms: ZapCore['platforms'] = {};
  
  if (core.daily) {
    platforms.daily = {
      url: core.daily.url,
      file: core.daily.file,
      hash: normalizeHash(core.daily.hash),
      size: parseInt(core.daily.size, 10),
    };
  }
  if (core.windows32) {
    platforms.windows32 = {
      url: core.windows32.url,
      file: core.windows32.file,
      hash: normalizeHash(core.windows32.hash),
      size: parseInt(core.windows32.size, 10),
    };
  }
  if (core.windows) {
    platforms.windows = {
      url: core.windows.url,
      file: core.windows.file,
      hash: normalizeHash(core.windows.hash),
      size: parseInt(core.windows.size, 10),
    };
  }
  if (core.linux) {
    platforms.linux = {
      url: core.linux.url,
      file: core.linux.file,
      hash: normalizeHash(core.linux.hash),
      size: parseInt(core.linux.size, 10),
    };
  }
  if (core.mac) {
    platforms.mac = {
      url: core.mac.url,
      file: core.mac.file,
      hash: normalizeHash(core.mac.hash),
      size: parseInt(core.mac.size, 10),
    };
  }
  
  return {
    version: core.version,
    dailyVersion: core['daily-version'] || core.dailyVersion,
    platforms,
  };
}

function parseAddons(zap: any): ZapAddon[] {
  const addons: ZapAddon[] = [];
  const addonIds = Array.isArray(zap.addon) ? zap.addon : [zap.addon];
  
  for (const addonId of addonIds) {
    if (!addonId) continue;
    const addonData = zap[`addon_${addonId}`];
    if (!addonData) continue;
    
    const dependencies: AddonDependency[] = [];
    if (addonData.dependencies?.addons?.addon) {
      const deps = Array.isArray(addonData.dependencies.addons.addon)
        ? addonData.dependencies.addons.addon
        : [addonData.dependencies.addons.addon];
      for (const dep of deps) {
        dependencies.push({
          id: dep.id,
          version: dep.version,
        });
      }
    }
    
    addons.push({
      id: addonId,
      name: addonData.name,
      description: addonData.description || '',
      author: addonData.author || '',
      version: addonData.version,
      file: addonData.file,
      status: addonData.status as 'release' | 'beta' | 'alpha',
      url: addonData.url,
      hash: normalizeHash(addonData.hash),
      size: parseInt(addonData.size, 10),
      date: addonData.date,
      notBeforeVersion: addonData.notBeforeVersion || '',
      dependencies: dependencies.length > 0 ? dependencies : undefined,
    });
  }
  
  return addons;
}

function normalizeHash(hash: string): string {
  if (!hash) return '';
  const match = hash.match(/SHA-256:([a-fA-F0-9]+)/);
  return match ? match[1].toLowerCase() : hash.toLowerCase();
}
