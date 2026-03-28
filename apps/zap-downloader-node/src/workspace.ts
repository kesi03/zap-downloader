import * as fs from 'fs';
import chalk from 'chalk';

const DEFAULT_WORKSPACE = 'zap-workspace';

export function getWorkspace(): string {
  return process.env.ZAP_PACKAGES_WORKSPACE || DEFAULT_WORKSPACE;
}

export function ensureWorkspace(workspacePath?: string): string {
  const workspace = workspacePath || getWorkspace();
  if (!fs.existsSync(workspace)) {
    fs.mkdirSync(workspace, { recursive: true });
    console.log(chalk.green(`Created workspace: ${workspace}`));
  }
  return workspace;
}
