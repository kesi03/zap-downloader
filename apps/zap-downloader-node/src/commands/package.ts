import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import { formatBytes } from '../downloader';
import { Arguments } from 'yargs';

export const command = 'package';
export const describe = 'Package ZAP and addons into a .tar archive';

export const builder = (yargs: any) => {
  return yargs
    .option('output', {
      alias: 'o',
      description: 'Output .tar archive path',
      type: 'string',
      default: 'zap-package.tar',
    });
};

export const handler = async (argv: Arguments & {
  workspace: string;
  output?: string;
}) => {
  const workspace = argv.workspace;
  let outputName = argv.output || 'zap-package.tar';

  if (!fs.existsSync(workspace)) {
    console.error(chalk.red(`Workspace not found: ${workspace}`));
    console.log(chalk.yellow('Run "zap-downloader workspace" to create it first.'));
    process.exit(1);
  }

  const zapDir = path.join(workspace, 'zap');
  const addonsDir = path.join(workspace, 'addons');

  if (!fs.existsSync(zapDir) && !fs.existsSync(addonsDir)) {
    console.error(chalk.red('No ZAP or addons found in workspace'));
    process.exit(1);
  }

  if (!outputName.endsWith('.tar')) {
    outputName += '.tar';
  }

  const outputDir = path.dirname(outputName);
  if (outputDir && !fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log(chalk.blue(`Packaging workspace: ${workspace}`));
  console.log(chalk.gray(`Output: ${outputName}`));

  const { execSync } = await import('child_process');

  try {
    const files = [];
    
    if (fs.existsSync(zapDir)) {
      files.push('zap');
      console.log(chalk.green('Added zap/ to archive'));
    }
    if (fs.existsSync(addonsDir)) {
      files.push('addons');
      console.log(chalk.green('Added addons/ to archive'));
    }

    const outputRelPath = path.relative(workspace, outputName);
    execSync(`tar -cf "${outputRelPath}" ${files.join(' ')}`, { cwd: workspace });
    console.log(chalk.green(`Package created: ${outputName}`));

    const stats = fs.statSync(outputName);
    console.log(chalk.blue(`Size: ${formatBytes(stats.size)}`));
  } catch (err) {
    console.error(chalk.red('Failed to create package:'), err);
    process.exit(1);
  }
};
