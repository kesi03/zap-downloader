import * as path from 'path';
import * as fs from 'fs';
import chalk from 'chalk';
import { Arguments } from 'yargs';
import pm2 from 'pm2';
import * as toml from '@iarna/toml';
import { getWorkspace } from '../workspace';

type PM2ProcessInfo = any;

interface TomlConfig {
  ENV?: {
    ZAP_DOWNLOADER_WORKSPACE?: string;
    ZAP_DOWNLOADER_DOWNLOADS?: string;
    ZAP_DOWNLOADER_INSTALL?: string;
    ZAP_DOWNLOADER_PACKAGES?: string;
    ZAP_DOWNLOADER_ZAP_HOME?: string;
  };
  SERVER?: {
    PORT?: number;
    HOST?: string;
  };
  PATHS?: {
    JAR_PATH?: string;
    DIR?: string;
    INSTALL_DIR?: string;
  };
  JAVA_OPTIONS?: {
    flags?: string[];
  };
  CONFIG?: {
    flags?: string[];
  };
}

export const command = 'daemon';
export const describe = 'Manage ZAP daemon';

export const builder = (yargs: any) => {
  return yargs
    .command(startDaemonCommand)
    .command(stopDaemonCommand)
    .demandCommand(1, 'Specify a subcommand: start-daemon, stop-daemon');
};

export const handler = () => {};

function parseTomlConfig(tomlPath: string): TomlConfig {
  const content = fs.readFileSync(tomlPath, 'utf-8');
  return toml.parse(content) as TomlConfig;
}

function resolveTomlPaths(config: TomlConfig, defaultWorkspace: string): TomlConfig {
  const workspace = config.ENV?.ZAP_DOWNLOADER_WORKSPACE || defaultWorkspace;
  
  return {
    ...config,
    ENV: {
      ...config.ENV,
      ZAP_DOWNLOADER_WORKSPACE: workspace,
    },
    PATHS: {
      ...config.PATHS,
      JAR_PATH: config.PATHS?.JAR_PATH || '',
      DIR: config.PATHS?.DIR || '.zap',
      INSTALL_DIR: config.PATHS?.INSTALL_DIR || path.join(workspace, 'install').replace(/\\/g, '/'),
    },
  };
}

const startDaemonCommand = {
  command: 'start-daemon',
  describe: 'Start ZAP as a daemon using pm2',
  builder: (yargs: any) => {
    return yargs
      .option('toml', {
        alias: 't',
        description: 'Path to zap.toml configuration file',
        type: 'string',
      })
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
    toml?: string;
    dir?: string;
    workspace?: string;
    host?: string;
    port?: number;
    apiKey?: string;
    name?: string;
  }) => {
    let config: TomlConfig = {};
    let useToml = false;
    let workspace = argv.workspace || getWorkspace();

    if (argv.toml) {
      if (!fs.existsSync(argv.toml)) {
        console.error(chalk.red(`TOML file not found: ${argv.toml}`));
        process.exit(1);
      }
      console.log(chalk.blue(`Using TOML config: ${argv.toml}`));
      config = parseTomlConfig(argv.toml);
      config = resolveTomlPaths(config, workspace);
      useToml = true;
    }

    const host = useToml ? (config.SERVER?.HOST || '0.0.0.0') : (argv.host || '0.0.0.0');
    const port = useToml ? (config.SERVER?.PORT || 8080) : (argv.port || 8080);
    const apiKey = useToml ? '' : (argv.apiKey || '');
    const processName = argv.name || 'zap-daemon';
    
    const zapHomeDir = useToml 
      ? (config.ENV?.ZAP_DOWNLOADER_ZAP_HOME || '.zap')
      : '.zap';

    const zapInstallDir = useToml
      ? (config.PATHS?.INSTALL_DIR || path.join(workspace, 'install'))
      : (argv.dir || path.join(argv.workspace || getWorkspace(), 'zap'));
    
    const workingDir = useToml
      ? (config.ENV?.ZAP_DOWNLOADER_WORKSPACE || workspace)
      : (argv.workspace || getWorkspace());

    let jarPath: string | null = null;

    if (useToml && config.PATHS?.JAR_PATH) {
      if (fs.existsSync(config.PATHS.JAR_PATH)) {
        jarPath = config.PATHS.JAR_PATH;
      }
    }

    if (!jarPath && fs.existsSync(zapInstallDir)) {
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

    const zapDir = path.join(workingDir, zapHomeDir);
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

    const javaOptions: string[] = [];
    
    if (useToml && config.JAVA_OPTIONS?.flags) {
      javaOptions.push(...config.JAVA_OPTIONS.flags);
    } else {
      javaOptions.push('-Xmx2g');
    }

    javaOptions.push(`-Djava.io.tmpdir="${absTmpDir}"`);

    const configFlags: string[] = [];
    
    if (useToml && config.CONFIG?.flags) {
      configFlags.push(...config.CONFIG.flags);
    } else {
      configFlags.push(
        apiKey ? `api.key=${apiKey}` : 'api.disablekey=true',
        'api.addrs.addr.name=.*',
        'api.addrs.addr.regex=true'
      );
    }

    const javaFlagsStr = javaOptions.join(' ');
    const configFlagsStr = configFlags.map(f => `-config ${f}`).join(' ');

    const cmd = [
      'java',
      javaFlagsStr,
      `-jar "${absJarPath}"`,
      '-daemon',
      `-dir "${absZapDir}"`,
      `-installdir "${absInstallDir}"`,
      `-host ${host}`,
      `-port ${port}`,
      configFlagsStr,
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
    if (useToml) {
      console.log(chalk.gray(`Config: TOML (${argv.toml})`));
    }

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
