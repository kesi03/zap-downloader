import * as path from 'path';
import * as fs from 'fs';
import * as yaml from 'js-yaml';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { fetchZapVersions } from '../parser';
import { AddonRequest, ZapConfig } from '../types';
import { Arguments } from 'yargs';

export const command = 'create-zap-config';
export const describe = 'Create ZAP config with platform, version, and addons';

export const builder = (yargs: any) => {
  return yargs
    .option('status', {
      alias: 's',
      description: 'Filter addons by status: release, beta, alpha, all (default: release)',
      type: 'string',
      default: 'release',
    })
    .option('platform', {
      alias: 'p',
      description: 'Platform: windows, windows32, linux, mac, daily',
      type: 'string',
    })
    .option('zap-version', {
      alias: 'V',
      description: 'Version: stable or daily',
      type: 'string',
    })
    .option('addons', {
      alias: 'a',
      description: 'Comma-separated addon IDs, or "all" for all of status type',
      type: 'string',
    })
    .option('output', {
      alias: 'o',
      description: 'Output config filename (default: zap-config.yaml)',
      type: 'string',
      default: 'zap-config.yaml',
    });
};

export const handler = async (argv: Arguments & {
  status: string;
  platform?: string;
  'zap-version'?: string;
  addons?: string;
  output: string;
}) => {
  const outputFilename = argv.output;
  const statusFilter = argv.status;
  const platformArg = argv.platform;
  const versionArg = argv['zap-version'];
  const addonsArg = argv.addons;

  const validStatuses = ['release', 'beta', 'alpha', 'all'];
  if (!validStatuses.includes(statusFilter)) {
    console.error(chalk.red(`Invalid status. Choose: ${validStatuses.join(', ')}`));
    process.exit(1);
  }

  console.log(chalk.blue('Fetching ZAP versions...'));
  const zapVersions = await fetchZapVersions();

  let selectedPlatform: string;
  let selectedVersion: string;

  const platformChoices = Object.entries(zapVersions.core.platforms)
    .filter(([_, data]) => data)
    .map(([platform, data]) => ({
      name: `${platform} (${data!.file})`,
      value: platform,
    }));

  if (platformArg) {
    selectedPlatform = platformArg;
  } else {
    console.log(chalk.yellow('\nAvailable platforms:'));
    for (const pc of platformChoices) {
      console.log(chalk.gray(`  ${pc.name}`));
    }

    const { selectedPlatform: sp } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedPlatform',
        message: 'Select ZAP platform:',
        choices: platformChoices,
      },
    ]);
    selectedPlatform = sp;
  }

  if (versionArg) {
    selectedVersion = versionArg;
  } else {
    console.log(chalk.yellow('\nAvailable versions:'));
    console.log(chalk.gray(`  stable (${zapVersions.core.version})`));
    console.log(chalk.gray(`  daily (${zapVersions.core.dailyVersion})`));

    const { selectedVersion: sv } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedVersion',
        message: 'Select ZAP version:',
        choices: [
          { name: `stable (${zapVersions.core.version})`, value: zapVersions.core.version },
          { name: `daily (${zapVersions.core.dailyVersion})`, value: zapVersions.core.dailyVersion },
        ],
      },
    ]);
    selectedVersion = sv;
  }

  const validPlatforms = ['windows', 'windows32', 'linux', 'mac', 'daily'];
  if (!validPlatforms.includes(selectedPlatform)) {
    console.error(chalk.red(`Invalid platform. Choose: ${validPlatforms.join(', ')}`));
    process.exit(1);
  }

  const stableVersion = zapVersions.core.version;
  const dailyVersion = zapVersions.core.dailyVersion;

  if (versionArg) {
    if (versionArg.toLowerCase() === 'stable') {
      selectedVersion = stableVersion;
    } else if (versionArg.toLowerCase() === 'daily') {
      selectedVersion = dailyVersion;
    } else if (versionArg === stableVersion || versionArg === dailyVersion) {
      selectedVersion = versionArg;
    } else {
      console.error(chalk.red(`Invalid version. Choose: stable, daily, ${stableVersion}, or ${dailyVersion}`));
      process.exit(1);
    }
  }

  let filteredAddons = zapVersions.addons;
  if (statusFilter !== 'all') {
    filteredAddons = zapVersions.addons.filter(a => a.status === statusFilter);
  }

  let selectedAddons: string[];

  if (addonsArg) {
    if (addonsArg.toLowerCase() === 'all') {
      selectedAddons = filteredAddons.map(a => a.id);
      console.log(chalk.blue(`Selected all ${selectedAddons.length} ${statusFilter} addons`));
    } else {
      selectedAddons = addonsArg.split(',').map(s => s.trim());
    }
  } else {
    const addonChoices = filteredAddons
      .sort((a, b) => a.id.localeCompare(b.id))
      .map(addon => ({
        name: `${addon.id} (v${addon.version} - ${addon.status})`,
        value: addon.id,
      }));

    const { selectedAddons: sa } = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'selectedAddons',
        message: 'Select addons to download:',
        choices: addonChoices,
        pageSize: 15,
      },
    ]);
    selectedAddons = sa;
  }

  const addonMap = new Map<string, typeof zapVersions.addons[0]>();
  for (const addon of zapVersions.addons) {
    addonMap.set(addon.id, addon);
  }

  const configAddons: AddonRequest[] = selectedAddons.map((id: string) => {
    const addon = addonMap.get(id);
    if (!addon) {
      console.warn(chalk.yellow(`Warning: Addon not found: ${id}`));
    }
    return {
      id: id,
      status: addon?.status,
    };
  });

  const config: ZapConfig = {
    zap: {
      platform: selectedPlatform,
      version: selectedVersion,
    },
    addons: configAddons,
  };

  const configPath = path.resolve(outputFilename);
  fs.writeFileSync(configPath, yaml.dump(config), 'utf-8');

  console.log(chalk.green(`\nConfig saved to: ${configPath}`));
  console.log(chalk.blue(`\nZAP: ${selectedPlatform} v${selectedVersion}`));
  console.log(chalk.blue(`Selected ${selectedAddons.length} addons:`));
  for (const id of selectedAddons) {
    const addon = addonMap.get(id);
    if (addon) {
      console.log(chalk.gray(`  - ${addon.id} v${addon.version} (${addon.status})`));
    } else {
      console.log(chalk.gray(`  - ${id} (unknown)`));
    }
  }
};
