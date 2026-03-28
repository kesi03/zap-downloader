import * as path from 'path';
import chalk from 'chalk';
import { Arguments } from 'yargs';
import { ensureWorkspace, getWorkspace, getDownloadsDir, getInstallDir, getPackagesDir, getZapHomeDir } from '../workspace';

export const command = 'workspace';
export const describe = 'Create workspace directory if it does not exist';

export const builder = (yargs: any) => {
  return yargs
    .option('show', {
      alias: 's',
      description: 'Show current workspace path',
      type: 'boolean',
      default: false,
    });
};

export const handler = async (argv: Arguments & {
  workspace: string;
  show: boolean;
}) => {
  if (argv.show) {
    const workspace = getWorkspace();
    console.log(chalk.blue(`Current workspace: ${workspace}`));
    console.log(chalk.gray(`Subdirectories:`));
    console.log(chalk.gray(`  - downloads: ${getDownloadsDir()}`));
    console.log(chalk.gray(`  - install: ${getInstallDir()}`));
    console.log(chalk.gray(`  - packages: ${getPackagesDir()}`));
    console.log(chalk.gray(`  - zap_home: ${getZapHomeDir()}`));
    console.log(chalk.gray(`(ZAP_DOWNLOADER_WORKSPACE: ${process.env.ZAP_DOWNLOADER_WORKSPACE || 'not set'})`));
    return;
  }

  const workspace = ensureWorkspace(argv.workspace);
  console.log(chalk.green(`Workspace ready: ${workspace}`));
  console.log(chalk.green(`Subdirectories: ${getDownloadsDir()}, ${getInstallDir()}, ${getPackagesDir()}, ${getZapHomeDir()}`));
};
