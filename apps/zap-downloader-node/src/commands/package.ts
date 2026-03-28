import * as fs from 'fs';
import chalk from 'chalk';
import { formatBytes } from '../downloader';
import { Arguments } from 'yargs';

export const command = 'package';
export const describe = 'Create a tar package of the workspace';

export const builder = (yargs: any) => {
  return yargs
    .option('output', {
      alias: 'o',
      description: 'Output package filename',
      type: 'string',
    })
    .option('name', {
      alias: 'n',
      description: 'Package name (without extension)',
      type: 'string',
    });
};

export const handler = async (argv: Arguments & {
  workspace: string;
  output?: string;
  name?: string;
}) => {
  const workspace = argv.workspace;
  let outputName = argv.output;
  const packageName = argv.name;

  if (!fs.existsSync(workspace)) {
    console.error(chalk.red(`Workspace not found: ${workspace}`));
    console.log(chalk.yellow('Run "zap-downloader workspace" to create it first.'));
    process.exit(1);
  }

  const { execSync } = await import('child_process');

  let tarName: string;
  if (outputName) {
    tarName = outputName;
  } else if (packageName) {
    tarName = `${packageName}.tar.gz`;
  } else {
    tarName = `zap-package.tar.gz`;
  }

  console.log(chalk.blue(`Packaging workspace: ${workspace}`));
  console.log(chalk.gray(`Output: ${tarName}`));

  try {
    const cwd = process.cwd();
    execSync(`tar -czf "${tarName}" "${workspace}"`, { cwd });
    console.log(chalk.green(`Package created: ${tarName}`));

    const stats = fs.statSync(tarName);
    console.log(chalk.blue(`Size: ${formatBytes(stats.size)}`));
  } catch (err) {
    console.error(chalk.red('Failed to create package:'), err);
    process.exit(1);
  }
};
