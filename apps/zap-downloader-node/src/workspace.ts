import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import 'dotenv/config';

const DEFAULT_WORKSPACE = 'workspace';
const DEFAULT_DOWNLOADS = 'downloads';
const DEFAULT_INSTALL = 'install';
const DEFAULT_PACKAGES = 'packages';
const DEFAULT_ZAP_HOME = '.zap';

export function getWorkspace(): string {
  return process.env.ZAP_DOWNLOADER_WORKSPACE || DEFAULT_WORKSPACE;
}

export function getDownloadsDir(): string {
  return process.env.ZAP_DOWNLOADER_DOWNLOADS || DEFAULT_DOWNLOADS;
}

export function getInstallDir(): string {
  return process.env.ZAP_DOWNLOADER_INSTALL || DEFAULT_INSTALL;
}

export function getPackagesDir(): string {
  return process.env.ZAP_DOWNLOADER_PACKAGES || DEFAULT_PACKAGES;
}

export function getZapHomeDir(): string {
  return process.env.ZAP_DOWNLOADER_ZAP_HOME || DEFAULT_ZAP_HOME;
}

export function ensureWorkspace(workspacePath?: string): string {
  const workspace = workspacePath || getWorkspace();
  if (!fs.existsSync(workspace)) {
    fs.mkdirSync(workspace, { recursive: true });
    console.log(chalk.green(`Created workspace: ${workspace}`));
  }

  const subdirs = [
    getDownloadsDir(),
    getInstallDir(),
    getPackagesDir(),
    getZapHomeDir(),
  ];

  for (const subdir of subdirs) {
    const subdirPath = path.join(workspace, subdir);
    if (!fs.existsSync(subdirPath)) {
      fs.mkdirSync(subdirPath, { recursive: true });
    }
  }

  return workspace;
}
