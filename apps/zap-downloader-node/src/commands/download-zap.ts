import * as path from 'path';
import * as fs from 'fs';
import * as yaml from 'js-yaml';
import chalk from 'chalk';
import { fetchZapVersions } from '../parser';
import { downloadFile, formatBytes } from '../downloader';
import { ZapConfig } from '../types';
import { Arguments } from 'yargs';
import { ensureWorkspace } from '../workspace';

export const command = 'download-zap';
export const describe = 'Download ZAP core and addons from config file';

export const builder = (yargs: any) => {
  return yargs
    .option('config', {
      alias: 'c',
      description: 'Path to ZAP config file',
      type: 'string',
      demandOption: true,
    });
};

export const handler = async (argv: Arguments & {
  config: string;
  workspace: string;
}) => {
  const configPath = argv.config;
  const workspace = argv.workspace;

  if (!fs.existsSync(configPath)) {
    console.error(chalk.red(`Config file not found: ${configPath}`));
    process.exit(1);
  }

  const configContent = fs.readFileSync(configPath, 'utf-8');
  const config: ZapConfig = yaml.load(configContent) as ZapConfig;

  if (!config.zap || !config.addons) {
    console.error(chalk.red('Invalid config: missing zap or addons'));
    process.exit(1);
  }

  ensureWorkspace(workspace);

  console.log(chalk.blue('Fetching ZAP versions...'));
  const zapVersions = await fetchZapVersions();

  const platform = config.zap.platform;
  const version = config.zap.version;

  const platformData = zapVersions.core.platforms[platform as keyof typeof zapVersions.core.platforms];
  if (!platformData) {
    console.error(chalk.red(`Platform ${platform} not available`));
    process.exit(1);
  }

  const zapDir = path.join(workspace, 'zap');
  if (!fs.existsSync(zapDir)) {
    fs.mkdirSync(zapDir, { recursive: true });
  }

  console.log(chalk.yellow(`\nDownloading ZAP core: ${platform} v${version}...`));
  console.log(chalk.gray(`  Size: ${formatBytes(platformData.size)}`));

  const zapOutputPath = path.join(zapDir, platformData.file);
  await downloadFile(platformData.url, zapOutputPath, platformData.hash);
  console.log(chalk.green('ZAP core downloaded!'));

  const addonsDir = path.join(workspace, 'addons');
  if (!fs.existsSync(addonsDir)) {
    fs.mkdirSync(addonsDir, { recursive: true });
  }

  const addonMap = new Map<string, typeof zapVersions.addons[0]>();
  for (const addon of zapVersions.addons) {
    addonMap.set(addon.id, addon);
  }

  const toDownload: typeof zapVersions.addons[0][] = [];
  const downloadedIds = new Set<string>();

  for (const request of config.addons) {
    const addon = addonMap.get(request.id);
    if (!addon) {
      console.warn(chalk.yellow(`Addon not found: ${request.id}`));
      continue;
    }

    if (request.status && addon.status !== request.status) {
      console.warn(chalk.yellow(`Skipping ${addon.id}: status mismatch`));
      continue;
    }

    toDownload.push(addon);
  }

  if (toDownload.length > 0) {
    console.log(chalk.yellow(`\nDownloading ${toDownload.length} addons...`));

    for (const addon of toDownload) {
      if (downloadedIds.has(addon.id)) continue;

      console.log(chalk.gray(`  - ${addon.id} v${addon.version} (${addon.status})`));

      const addonOutputPath = path.join(addonsDir, addon.file);
      await downloadFile(addon.url, addonOutputPath, addon.hash);
      downloadedIds.add(addon.id);
    }
    console.log(chalk.green('Addons downloaded!'));
  }

  console.log(chalk.green('\n=== Download Complete ==='));
  console.log(chalk.blue(`Workspace: ${path.resolve(workspace)}`));
  console.log(chalk.blue(`ZAP: ${path.join(zapDir, platformData.file)}`));
  console.log(chalk.blue(`Addons: ${addonsDir}`));
};
