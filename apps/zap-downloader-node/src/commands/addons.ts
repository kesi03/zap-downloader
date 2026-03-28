import * as path from 'path';
import * as fs from 'fs';
import * as yaml from 'js-yaml';
import chalk from 'chalk';
import { fetchZapVersions } from '../parser';
import { downloadFile, formatBytes } from '../downloader';
import { AddonConfig, AddonRequest } from '../types';
import { Arguments } from 'yargs';

export const command = 'addons';
export const describe = 'Download ZAP addons from config file';

export const builder = (yargs: any) => {
  return yargs
    .option('config', {
      alias: 'c',
      description: 'Path to YAML config file',
      type: 'string',
      demandOption: true,
    })
    .option('output', {
      alias: 'o',
      description: 'Output directory',
      type: 'string',
      default: './addons',
    });
};

export const handler = async (argv: Arguments & {
  config: string;
  output: string;
  workspace: string;
}) => {
  const configPath = argv.config;
  let defaultOutput = argv.output;
  const workspace = argv.workspace;

  if (!defaultOutput || defaultOutput === './addons') {
    defaultOutput = path.join(workspace, 'addons');
  }

  if (!fs.existsSync(configPath)) {
    console.error(chalk.red(`Config file not found: ${configPath}`));
    process.exit(1);
  }

  const configContent = fs.readFileSync(configPath, 'utf-8');
  const config: AddonConfig = yaml.load(configContent) as AddonConfig;

  if (!config.addons || config.addons.length === 0) {
    console.error(chalk.red('No addons specified in config'));
    process.exit(1);
  }

  let outputDir = config.output;
  if (!outputDir) {
    outputDir = defaultOutput;
  } else if (outputDir.startsWith('./')) {
    outputDir = path.join(workspace, outputDir.slice(2));
  }

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log('Fetching ZAP versions...');
  const zapVersions = await fetchZapVersions();

  const addonMap = new Map<string, typeof zapVersions.addons[0]>();
  for (const addon of zapVersions.addons) {
    addonMap.set(addon.id, addon);
  }

  const toDownload: { addon: typeof zapVersions.addons[0]; requested: AddonRequest }[] = [];
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

    const outputPath = path.join(outputDir, addon.file);
    await downloadFile(addon.url, outputPath, addon.hash);
    downloadedIds.add(addon.id);
  }

  console.log('\nAll downloads complete!');
};
