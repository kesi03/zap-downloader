import chalk from 'chalk';
import { fetchZapVersions } from '../parser';
import { formatBytes } from '../downloader';
import { Arguments } from 'yargs';
import { getProxyUrl } from '../proxy';

export const command = 'info';
export const describe = 'Show information about a specific addon';

export const builder = (yargs: any) => {
  return yargs.option('addon', {
    alias: 'a',
    description: 'Addon ID',
    type: 'string',
    demandOption: true,
  });
};

export const handler = async (argv: Arguments & {
  addon: string;
  proxy?: string;
}) => {
  const addonId = argv.addon;
  const proxy = argv.proxy || getProxyUrl();

  console.log('Fetching ZAP versions...');
  const zapVersions = await fetchZapVersions(proxy);

  const addon = zapVersions.addons.find(a => a.id === addonId);
  if (!addon) {
    console.error(chalk.red(`Addon not found: ${addonId}`));
    process.exit(1);
  }

  console.log(`\n=== ${addon.name} ===`);
  console.log(`ID: ${addon.id}`);
  console.log(`Version: ${addon.version}`);
  console.log(`Status: ${addon.status}`);
  console.log(`Author: ${addon.author}`);
  console.log(`Description: ${addon.description}`);
  console.log(`File: ${addon.file}`);
  console.log(`Size: ${formatBytes(addon.size)}`);
  console.log(`Hash: ${addon.hash}`);
  console.log(`Date: ${addon.date}`);
  console.log(`Min ZAP Version: ${addon.notBeforeVersion}`);
  if (addon.dependencies && addon.dependencies.length > 0) {
    console.log('Dependencies:');
    for (const dep of addon.dependencies) {
      console.log(`  - ${dep.id} ${dep.version}`);
    }
  }
  console.log(`URL: ${addon.url}`);
};
