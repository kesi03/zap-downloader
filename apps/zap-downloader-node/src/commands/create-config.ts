import * as path from 'path';
import * as fs from 'fs';
import * as yaml from 'js-yaml';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { fetchZapVersions } from '../parser';
import { AddonRequest } from '../types';
import { Arguments } from 'yargs';
import { getProxyUrl } from '../proxy';

export const command = 'create-config';
export const describe = 'Interactive: select addons and save to config file';

export const builder = (yargs: any) => {
  return yargs
    .option('status', {
      alias: 's',
      description: 'Filter by status: release, beta, alpha, all (default: release)',
      type: 'string',
      default: 'release',
    })
    .option('output', {
      alias: 'o',
      description: 'Output config filename (default: config.yaml)',
      type: 'string',
      default: 'config.yaml',
    });
};

export const handler = async (argv: Arguments & {
  status: string;
  output: string;
  proxy?: string;
}) => {
  const outputFilename = argv.output;
  const statusFilter = argv.status;
  const proxy = argv.proxy || getProxyUrl();

  const validStatuses = ['release', 'beta', 'alpha', 'all'];
  if (!validStatuses.includes(statusFilter)) {
    console.error(chalk.red(`Invalid status. Choose: ${validStatuses.join(', ')}`));
    process.exit(1);
  }

  console.log(chalk.blue('Fetching ZAP versions...'));
  const zapVersions = await fetchZapVersions(proxy);

  let filteredAddons = zapVersions.addons;
  if (statusFilter !== 'all') {
    filteredAddons = zapVersions.addons.filter(a => a.status === statusFilter);
    console.log(chalk.gray(`Showing ${statusFilter} addons only (use --status all to see all)`));
  }

  const addonChoices = filteredAddons
    .sort((a, b) => a.id.localeCompare(b.id))
    .map(addon => ({
      name: `${addon.id} (v${addon.version} - ${addon.status})`,
      value: addon.id,
      short: addon.id,
    }));

  const { selectedAddons } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'selectedAddons',
      message: chalk.yellow('Select addons to download:'),
      choices: addonChoices,
      pageSize: 20,
    },
  ]);

  if (selectedAddons.length === 0) {
    console.log(chalk.red('No addons selected. Exiting.'));
    process.exit(0);
  }

  const addonMap = new Map<string, typeof zapVersions.addons[0]>();
  for (const addon of zapVersions.addons) {
    addonMap.set(addon.id, addon);
  }

  const configAddons: AddonRequest[] = selectedAddons.map((id: string) => {
    const addon = addonMap.get(id)!;
    return {
      id: addon.id,
      status: addon.status,
    };
  });

  const config = {
    addons: configAddons,
    output: './zap-addons',
  };

  const configPath = path.resolve(outputFilename);
  fs.writeFileSync(configPath, yaml.dump(config), 'utf-8');

  console.log(chalk.green(`\nConfig saved to: ${configPath}`));
  console.log(chalk.blue(`Selected ${selectedAddons.length} addons:`));
  for (const id of selectedAddons) {
    const addon = addonMap.get(id)!;
    console.log(chalk.gray(`  - ${addon.id} v${addon.version} (${addon.status})`));
  }
};
