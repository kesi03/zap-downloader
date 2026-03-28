#!/usr/bin/env node
import yargs from 'yargs/yargs';
import type { CommandModule } from 'yargs';
import {
  coreCommand,
  coreDescribe,
  coreBuilder,
  coreHandler,
  addonsCommand,
  addonsDescribe,
  addonsBuilder,
  addonsHandler,
  listCommand,
  listDescribe,
  listBuilder,
  listHandler,
  infoCommand,
  infoDescribe,
  infoBuilder,
  infoHandler,
  createConfigCommand,
  createConfigDescribe,
  createConfigBuilder,
  createConfigHandler,
  createZapConfigCommand,
  createZapConfigDescribe,
  createZapConfigBuilder,
  createZapConfigHandler,
  downloadZapCommand,
  downloadZapDescribe,
  downloadZapBuilder,
  downloadZapHandler,
  packageCommand,
  packageDescribe,
  packageBuilder,
  packageHandler,
  workspaceCommand,
  workspaceDescribe,
  workspaceBuilder,
  workspaceHandler,
} from './commands';

const DEFAULT_WORKSPACE = 'zap-workspace';

const coreModule: CommandModule = {
  command: coreCommand,
  describe: coreDescribe,
  builder: coreBuilder,
  handler: coreHandler as any,
};

const addonsModule: CommandModule = {
  command: addonsCommand,
  describe: addonsDescribe,
  builder: addonsBuilder,
  handler: addonsHandler as any,
};

const listModule: CommandModule = {
  command: listCommand,
  describe: listDescribe,
  builder: listBuilder,
  handler: listHandler as any,
};

const infoModule: CommandModule = {
  command: infoCommand,
  describe: infoDescribe,
  builder: infoBuilder,
  handler: infoHandler as any,
};

const createConfigModule: CommandModule = {
  command: createConfigCommand,
  describe: createConfigDescribe,
  builder: createConfigBuilder,
  handler: createConfigHandler as any,
};

const createZapConfigModule: CommandModule = {
  command: createZapConfigCommand,
  describe: createZapConfigDescribe,
  builder: createZapConfigBuilder,
  handler: createZapConfigHandler as any,
};

const downloadZapModule: CommandModule = {
  command: downloadZapCommand,
  describe: downloadZapDescribe,
  builder: downloadZapBuilder,
  handler: downloadZapHandler as any,
};

const packageModule: CommandModule = {
  command: packageCommand,
  describe: packageDescribe,
  builder: packageBuilder,
  handler: packageHandler as any,
};

const workspaceModule: CommandModule = {
  command: workspaceCommand,
  describe: workspaceDescribe,
  builder: workspaceBuilder,
  handler: workspaceHandler as any,
};

const argv = yargs(process.argv.slice(2))
  .scriptName('zap-downloader')
  .usage('$0 <command> [options]')
  .alias('help', 'h')
  .version('1.0.0')
  .option('workspace', {
    alias: 'w',
    description: 'Workspace directory (default: zap-workspace, or ZAP_PACKAGES_WORKSPACE env)',
    type: 'string',
    default: DEFAULT_WORKSPACE,
    global: true,
  })
  .command(coreModule)
  .command(addonsModule)
  .command(listModule)
  .command(infoModule)
  .command(createConfigModule)
  .command(createZapConfigModule)
  .command(downloadZapModule)
  .command(packageModule)
  .command(workspaceModule)
  .help()
  .demandCommand(1, 'Please specify a command')
  .parse();
