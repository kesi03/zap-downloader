import * as path from 'path';
import * as fs from 'fs';
import * as yaml from 'js-yaml';
import chalk from 'chalk';
import { fetchZapVersions } from '../parser';
import { downloadFile, formatBytes } from '../downloader';
import { AddonConfig, AddonRequest } from '../types';
import { Arguments } from 'yargs';

export const command = 'addons';
export const describe = 'Download ZAP addons from config file or addon IDs';

export const builder = (yargs: any) => {
  return yargs
    .option('config', {
      alias: 'c',
      description: 'Path to YAML or JSON config file',
      type: 'string',
    })
    .option('output', {
      alias: 'o',
      description: 'Output directory',
      type: 'string',
    })
    .option('status', {
      alias: 's',
      description: 'Filter by status: release, beta, alpha',
      type: 'string',
    })
    .positional('addonIds', {
      describe: 'Addon IDs to download',
      type: 'array',
      default: [],
    });
};

export const handler = async (argv: Arguments & {
  config?: string;
  output?: string;
  workspace: string;
  status?: string;
  addonIds: string[];
}) => {
  const configPath = argv.config;
  let defaultOutput = argv.output;
  const workspace = argv.workspace;
  const statusFilter = argv.status;
  const addonIds = argv.addonIds || [];

  const addonRequests: AddonRequest[] = [];

  if (configPath) {
    if (!fs.existsSync(configPath)) {
      console.error(chalk.red(`Config file not found: ${configPath}`));
      process.exit(1);
    }

    const configContent = fs.readFileSync(configPath, 'utf-8');
    let config: AddonConfig;
    
    if (configPath.endsWith('.json')) {
      config = JSON.parse(configContent) as AddonConfig;
    } else {
      config = yaml.load(configContent) as AddonConfig;
    }

    if (!config.addons || config.addons.length === 0) {
      console.error(chalk.red('No addons specified in config'));
      process.exit(1);
    }

    for (const addon of config.addons) {
      addonRequests.push({
        id: addon.id,
        status: addon.status,
      });
    }

    if (!defaultOutput && config.output) {
      defaultOutput = config.output;
    }
  } else if (addonIds.length > 0) {
    for (const id of addonIds) {
      addonRequests.push({
        id,
        status: statusFilter as 'release' | 'beta' | 'alpha' | undefined,
      });
    }
  } else {
    console.error(chalk.red('Either --config or addon IDs must be provided'));
    process.exit(1);
  }

  if (!defaultOutput) {
    defaultOutput = path.join(workspace, 'zap', 'addons');
  } else if (defaultOutput.startsWith('./')) {
    defaultOutput = path.join(workspace, defaultOutput.slice(2));
  }

  if (!fs.existsSync(defaultOutput)) {
    fs.mkdirSync(defaultOutput, { recursive: true });
  }

  console.log('Fetching ZAP versions...');
  const zapVersions = await fetchZapVersions();

  const addonMap = new Map<string, typeof zapVersions.addons[0]>();
  for (const addon of zapVersions.addons) {
    addonMap.set(addon.id, addon);
  }

  const toDownload: { addon: typeof zapVersions.addons[0]; requested: AddonRequest }[] = [];
  const downloadedIds = new Set<string>();

  for (const request of addonRequests) {
    const addon = addonMap.get(request.id);
    if (!addon) {
      console.warn(chalk.yellow(`Addon not found: ${request.id}`));
      continue;
    }

    const reqStatus = statusFilter || request.status;
    if (reqStatus && addon.status !== reqStatus) {
      console.warn(chalk.yellow(`Skipping ${addon.id}: status mismatch`));
      continue;
    }

    toDownload.push({ addon, requested: request });
  }

  for (const { addon } of toDownload) {
    if (downloadedIds.has(addon.id)) continue;

    console.log(`\nDownloading ${addon.id} v${addon.version} (${addon.status})...`);
    console.log(`  Size: ${formatBytes(addon.size)}`);
    console.log(`  Hash: ${addon.hash}`);

    if (addon.dependencies) {
      console.log(`  Dependencies: ${addon.dependencies.map(d => d.id).join(', ')}`);
    }

    const outputPath = path.join(defaultOutput, addon.file);
    await downloadFile(addon.url, outputPath, addon.hash);
    downloadedIds.add(addon.id);
  }

  console.log('\nAll downloads complete!');
};
