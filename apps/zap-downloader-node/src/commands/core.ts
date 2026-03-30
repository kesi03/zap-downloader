import * as path from 'path';
import * as fs from 'fs';
import chalk from 'chalk';
import { fetchZapVersions } from '../parser';
import { downloadFile, formatBytes } from '../downloader';
import { Arguments } from 'yargs';
import { getProxyUrl } from '../proxy';

export const command = 'core';
export const describe = 'Download ZAP core';

export const builder = (yargs: any) => {
  return yargs
    .option('platform', {
      alias: 'p',
      description: 'Platform: windows, windows32, linux, mac, daily',
      type: 'string',
      demandOption: true,
    })
    .option('output', {
      alias: 'o',
      description: 'Output directory',
      type: 'string',
      default: '.',
    })
    .option('zap-version', {
      alias: 'v',
      description: 'Specific version to download (e.g., 2.17.0)',
      type: 'string',
    });
};

export const handler = async (argv: Arguments & {
  platform: string;
  output: string;
  workspace: string;
  'zap-version'?: string;
  proxy?: string;
}) => {
  const platform = argv.platform;
  let outputDir = argv.output;
  const workspace = argv.workspace;
  const zapVersion = argv['zap-version'];
  const proxy = argv.proxy || getProxyUrl();

  if (!outputDir || outputDir === '.') {
    outputDir = path.join(workspace, 'zap');
  }

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const validPlatforms = ['windows', 'windows32', 'linux', 'mac', 'daily'];
  if (!validPlatforms.includes(platform)) {
    console.error(chalk.red(`Invalid platform. Choose: ${validPlatforms.join(', ')}`));
    process.exit(1);
  }

  console.log('Fetching ZAP versions...');
  const zapVersions = await fetchZapVersions(proxy);

  const platformData = zapVersions.core.platforms[platform as keyof typeof zapVersions.core.platforms];
  if (!platformData) {
    console.error(chalk.red(`Platform ${platform} not available`));
    process.exit(1);
  }

  const outputPath = path.join(outputDir, platformData.file);
  console.log(`Platform: ${platform}`);
  console.log(`Version: ${zapVersions.core.version}`);
  console.log(`Size: ${formatBytes(platformData.size)}`);
  console.log(`Hash: ${platformData.hash}`);

  await downloadFile(platformData.url, outputPath, platformData.hash, proxy);
  console.log('Download complete!');
};
