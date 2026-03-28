import * as path from 'path';
import * as fs from 'fs';
import chalk from 'chalk';
import { Arguments } from 'yargs';
import { ensureWorkspace, getWorkspace } from '../workspace';

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
    console.log(chalk.gray(`(ZAP_PACKAGES_WORKSPACE: ${process.env.ZAP_PACKAGES_WORKSPACE || 'not set'})`));
    return;
  }

  const workspace = ensureWorkspace(argv.workspace);
  console.log(chalk.green(`Workspace ready: ${workspace}`));

  const addonsDir = path.join(workspace, 'addons');
  if (!fs.existsSync(addonsDir)) {
    fs.mkdirSync(addonsDir, { recursive: true });
    console.log(chalk.green(`Created addons directory: ${addonsDir}`));
  }
};
