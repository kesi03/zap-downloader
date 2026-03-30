#!/usr/bin/env node
import 'dotenv/config';
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
  unpackCommand,
  unpackDescribe,
  unpackBuilder,
  unpackHandler,
  daemonCommand,
  daemonDescribe,
  daemonBuilder,
  daemonHandler,
  workspaceCommand,
  workspaceDescribe,
  workspaceBuilder,
  workspaceHandler,
  createTomlConfigCommand,
  createTomlConfigDescribe,
  createTomlConfigBuilder,
  createTomlConfigHandler,
  offlineCommand,
  offlineDescribe,
  offlineBuilder,
  offlineHandler,
} from './commands';
import { getWorkspace } from './workspace';

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

const unpackModule: CommandModule = {
  command: unpackCommand,
  describe: unpackDescribe,
  builder: unpackBuilder,
  handler: unpackHandler as any,
};

const daemonModule: CommandModule = {
  command: daemonCommand,
  describe: daemonDescribe,
  builder: daemonBuilder,
  handler: daemonHandler as any,
};

const workspaceModule: CommandModule = {
  command: workspaceCommand,
  describe: workspaceDescribe,
  builder: workspaceBuilder,
  handler: workspaceHandler as any,
};

const createTomlConfigModule: CommandModule = {
  command: createTomlConfigCommand,
  describe: createTomlConfigDescribe,
  builder: createTomlConfigBuilder,
  handler: createTomlConfigHandler as any,
};

const offlineModule: CommandModule = {
  command: offlineCommand,
  describe: offlineDescribe,
  builder: offlineBuilder,
  handler: offlineHandler as any,
};

const argv = yargs(process.argv.slice(2))
  .scriptName('zap-downloader')
  .usage('$0 <command> [options]')
  .alias('help', 'h')
  .version('1.0.0')
  .option('workspace', {
    alias: 'w',
    description: 'Workspace directory (default: workspace, or ZAP_DOWNLOADER_WORKSPACE env)',
    type: 'string',
    default: getWorkspace(),
    global: true,
  })
  .option('proxy', {
    alias: 'x',
    description: 'Proxy URL (e.g., http://proxy:8080, or set HTTP_PROXY/HTTPS_PROXY env)',
    type: 'string',
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
  .command(unpackModule)
  .command(daemonModule)
  .command(workspaceModule)
  .command(createTomlConfigModule)
  .command(offlineModule)
  .help()
  .demandCommand(1, 'Please specify a command')
  .parse();
