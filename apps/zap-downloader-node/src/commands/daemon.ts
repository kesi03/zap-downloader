import * as path from 'path';
import * as fs from 'fs';
import chalk from 'chalk';
import { Arguments } from 'yargs';
import pm2 from 'pm2';
import { getWorkspace } from '../workspace';

type PM2ProcessInfo = any;

export const command = 'daemon';
export const describe = 'Manage ZAP daemon';

export const builder = (yargs: any) => {
  return yargs
    .command(startDaemonCommand)
    .command(stopDaemonCommand)
    .demandCommand(1, 'Specify a subcommand: start-daemon, stop-daemon');
};

export const handler = () => {};

const startDaemonCommand = {
  command: 'start-daemon',
  describe: 'Start ZAP as a daemon using pm2',
  builder: (yargs: any) => {
    return yargs
      .option('dir', {
        alias: 'd',
        description: 'ZAP installation directory (where zap.jar is)',
        type: 'string',
      })
      .option('workspace', {
        alias: 'w',
        description: 'ZAP working directory',
        type: 'string',
      })
      .option('host', {
        description: 'ZAP host to bind to',
        type: 'string',
        default: '0.0.0.0',
      })
      .option('port', {
        alias: 'P',
        description: 'ZAP proxy port',
        type: 'number',
        default: 8080,
      })
      .option('api-key', {
        alias: 'k',
        description: 'ZAP API key',
        type: 'string',
        default: '',
      })
      .option('name', {
        alias: 'N',
        description: 'PM2 process name',
        type: 'string',
        default: 'zap-daemon',
      });
  },
  handler: async (argv: Arguments & {
    dir?: string;
    workspace?: string;
    host?: string;
    port?: number;
    apiKey?: string;
    name?: string;
  }) => {
    const zapInstallDir = argv.dir || path.join(argv.workspace || getWorkspace(), 'zap');
    const workingDir = argv.workspace || getWorkspace();
    const host = argv.host || '0.0.0.0';
    const port = argv.port || 8080;
    const apiKey = argv.apiKey || '';
    const processName = argv.name || 'zap-daemon';

    let jarPath: string | null = null;

    if (fs.existsSync(zapInstallDir)) {
      const files = fs.readdirSync(zapInstallDir);
      for (const f of files) {
        if (f.endsWith('.jar') && f.startsWith('zap')) {
          jarPath = path.join(zapInstallDir, f);
          break;
        }
      }
    }

    if (!jarPath) {
      console.error(chalk.red(`JAR file not found in: ${zapInstallDir}`));
      process.exit(1);
    }

    if (!fs.existsSync(workingDir)) {
      fs.mkdirSync(workingDir, { recursive: true });
    }

    const tmpDir = path.join(workingDir, 'tmp');
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }

    const zapDir = path.join(workingDir, '.zap');
    if (!fs.existsSync(zapDir)) {
      fs.mkdirSync(zapDir, { recursive: true });
    }

    const pluginDir = path.join(zapDir, 'plugin');
    const installPluginDir = path.join(zapInstallDir, 'plugin');
    if (!fs.existsSync(pluginDir) && fs.existsSync(installPluginDir)) {
      fs.mkdirSync(pluginDir, { recursive: true });
      const pluginFiles = fs.readdirSync(installPluginDir);
      for (const f of pluginFiles) {
        const src = path.join(installPluginDir, f);
        const dest = path.join(pluginDir, f);
        if (!fs.existsSync(dest)) {
          fs.copyFileSync(src, dest);
        }
      }
    }

    const absJarPath = path.resolve(jarPath);
    const absInstallDir = path.dirname(absJarPath);
    const absWorkingDir = path.resolve(workingDir);
    const absTmpDir = path.resolve(tmpDir);
    const absZapDir = path.resolve(zapDir);

    const cmd = [
      'java',
      '-Xmx2g',
      `-Djava.io.tmpdir="${absTmpDir}"`,
      `-jar "${absJarPath}"`,
      '-daemon',
      `-dir "${absZapDir}"`,
      `-installdir "${absInstallDir}"`,
      `-host ${host}`,
      `-port ${port}`,
      apiKey ? `-config api.key=${apiKey}` : '-config api.disablekey=true',
      '-config api.addrs.addr.name=.*',
      '-config api.addrs.addr.regex=true',
    ].filter(Boolean).join(' ');

    const scriptPath = path.join(workingDir, 'start-zap.sh');
    const scriptContent = `#!/bin/bash
${cmd}
`;
    fs.writeFileSync(scriptPath, scriptContent);

    console.log(chalk.blue(`Starting ZAP daemon with pm2...`));
    console.log(chalk.gray(`JAR: ${jarPath}`));
    console.log(chalk.gray(`Port: ${port}`));
    console.log(chalk.gray(`Working dir: ${workingDir}`));

    try {
      await new Promise<void>((resolve, reject) => {
        pm2.connect((err) => {
          if (err) {
            reject(err);
            return;
          }
          resolve();
        });
      });

      const processes = await new Promise<PM2ProcessInfo[]>((resolve, reject) => {
        pm2.list((err, list) => {
          if (err) reject(err);
          else resolve(list);
        });
      });

      const existing = processes.find(p => p.name === processName);
      if (existing) {
        console.log(chalk.yellow(`Stopping existing pm2 process: ${processName}`));
        await new Promise<void>((resolve, reject) => {
          pm2.stop(processName, (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
        await new Promise<void>((resolve, reject) => {
          pm2.delete(processName, (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
      }

      await new Promise<void>((resolve, reject) => {
        pm2.start({
          name: processName,
          script: 'bash',
          args: scriptPath,
          cwd: workingDir,
        }, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      console.log(chalk.green(`ZAP daemon started as "${processName}"`));
      console.log(chalk.blue(`ZAP is starting up on ${host}:${port}`));
    } catch (err: any) {
      console.error(chalk.red(`Failed to start ZAP daemon: ${err.message}`));
      process.exit(1);
    } finally {
      pm2.disconnect();
    }
  },
};

const stopDaemonCommand = {
  command: 'stop-daemon',
  describe: 'Stop ZAP daemon managed by pm2',
  builder: (yargs: any) => {
    return yargs
      .option('name', {
        alias: 'N',
        description: 'PM2 process name',
        type: 'string',
        default: 'zap-daemon',
      });
  },
  handler: async (argv: Arguments & {
    name?: string;
  }) => {
    const processName = argv.name || 'zap-daemon';

    console.log(chalk.blue(`Stopping ZAP daemon: ${processName}...`));

    try {
      await new Promise<void>((resolve, reject) => {
        pm2.connect((err) => {
          if (err) {
            reject(err);
            return;
          }
          resolve();
        });
      });

      const processes = await new Promise<PM2ProcessInfo[]>((resolve, reject) => {
        pm2.list((err, list) => {
          if (err) reject(err);
          else resolve(list);
        });
      });

      const existing = processes.find(p => p.name === processName);
      if (!existing) {
        console.log(chalk.yellow(`No pm2 process found: ${processName}`));
        pm2.disconnect();
        return;
      }

      await new Promise<void>((resolve, reject) => {
        pm2.stop(processName, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      await new Promise<void>((resolve, reject) => {
        pm2.delete(processName, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      console.log(chalk.green(`ZAP daemon stopped and removed from pm2`));
    } catch (err: any) {
      console.error(chalk.red(`Failed to stop ZAP daemon: ${err.message}`));
      process.exit(1);
    } finally {
      pm2.disconnect();
    }
  },
};
