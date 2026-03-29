import * as path from 'path';
import * as fs from 'fs';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { Arguments } from 'yargs';
import { getWorkspace, getInstallDir, getPackagesDir, getZapHomeDir } from '../workspace';

interface TomlConfig {
  env: {
    workspace: string;
    downloads: string;
    install: string;
    packages: string;
    zapHome: string;
  };
  server: {
    port: number;
    host: string;
  };
  paths: {
    jarPath: string;
    dir: string;
    installDir: string;
  };
  javaOptions: string[];
  config: string[];
}

const DEFAULT_CONFIG: TomlConfig = {
  env: {
    workspace: 'workspace',
    downloads: 'downloads',
    install: 'install',
    packages: 'packages',
    zapHome: '.zap',
  },
  server: {
    port: 8080,
    host: '0.0.0.0',
  },
  paths: {
    jarPath: '',
    dir: '.zap',
    installDir: 'install',
  },
  javaOptions: [
    '-Xms4g',
    '-Xmx4g',
    '-XX:+UseZGC',
    '-Xss512k',
    '-XX:+UseContainerSupport',
    '-XX:MaxRAMPercentage=80',
    '-Dzap.session=/zap/wrk/session.data',
  ],
  config: [
    '-config api.disablekey = true',
    '-config api.addrs.addr.name = .*',
    '-config api.addrs.addr.regex = true',
    '-config database.response.bodysize = 104857600',
    '-config database.cache.size = 1000000',
    '-config database.recoverylog = false',
  ],
};

export const command = 'create-toml-config';
export const describe = 'Create zap.toml configuration file for daemon';

export const builder = (yargs: any) => {
  return yargs
    .option('output', {
      alias: 'o',
      description: 'Output file path (default: workspace/zap.toml)',
      type: 'string',
    });
};

async function editEnvSection(config: TomlConfig): Promise<TomlConfig> {
  const choices = [
    { name: 'ZAP_DOWNLOADER_WORKSPACE', value: 'workspace' },
    { name: 'ZAP_DOWNLOADER_DOWNLOADS', value: 'downloads' },
    { name: 'ZAP_DOWNLOADER_INSTALL', value: 'install' },
    { name: 'ZAP_DOWNLOADER_PACKAGES', value: 'packages' },
    { name: 'ZAP_DOWNLOADER_ZAP_HOME', value: 'zapHome' },
    { name: 'Done', value: 'done' },
  ];

  let editing = true;
  while (editing) {
    const { field } = await inquirer.prompt([
      {
        type: 'list',
        name: 'field',
        message: 'Which ENV variable to change?',
        choices,
      },
    ]);

    if (field === 'done') {
      editing = false;
      continue;
    }

    const { value } = await inquirer.prompt([
      {
        type: 'input',
        name: 'value',
        message: `Enter new value for ${field}:`,
        default: config.env[field as keyof typeof config.env],
      },
    ]);

    (config.env as any)[field] = value;
  }

  return config;
}

async function editServerSection(config: TomlConfig): Promise<TomlConfig> {
  const choices = [
    { name: 'PORT', value: 'port' },
    { name: 'HOST', value: 'host' },
    { name: 'Done', value: 'done' },
  ];

  let editing = true;
  while (editing) {
    const { field } = await inquirer.prompt([
      {
        type: 'list',
        name: 'field',
        message: 'Which SERVER setting to change?',
        choices,
      },
    ]);

    if (field === 'done') {
      editing = false;
      continue;
    }

    const currentValue = field === 'port' ? config.server.port : config.server.host;
    const { value } = await inquirer.prompt([
      {
        type: 'input',
        name: 'value',
        message: `Enter new value for ${field}:`,
        default: String(currentValue),
      },
    ]);

    if (field === 'port') {
      config.server.port = parseInt(value, 10);
    } else {
      config.server.host = value;
    }
  }

  return config;
}

async function editPathsSection(config: TomlConfig): Promise<TomlConfig> {
  const choices = [
    { name: 'JAR_PATH', value: 'jarPath' },
    { name: 'DIR', value: 'dir' },
    { name: 'INSTALL_DIR', value: 'installDir' },
    { name: 'Done', value: 'done' },
  ];

  let editing = true;
  while (editing) {
    const { field } = await inquirer.prompt([
      {
        type: 'list',
        name: 'field',
        message: 'Which PATH setting to change?',
        choices,
      },
    ]);

    if (field === 'done') {
      editing = false;
      continue;
    }

    const { value } = await inquirer.prompt([
      {
        type: 'input',
        name: 'value',
        message: `Enter new value for ${field}:`,
        default: config.paths[field as keyof typeof config.paths],
      },
    ]);

    (config.paths as any)[field] = value;
  }

  return config;
}

async function editJavaOptionsSection(config: TomlConfig): Promise<TomlConfig> {
  const choices = [
    { name: 'List/Edit options', value: 'edit' },
    { name: 'Add new option', value: 'add' },
    { name: 'Done', value: 'done' },
  ];

  let editing = true;
  while (editing) {
    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'JAVA_OPTIONS - What to do?',
        choices,
      },
    ]);

    if (action === 'done') {
      editing = false;
      continue;
    }

    if (action === 'add') {
      const { newOption } = await inquirer.prompt([
        {
          type: 'input',
          name: 'newOption',
          message: 'Enter new JVM option (e.g., -Xms2g):',
        },
      ]);
      if (newOption) {
        config.javaOptions.push(newOption);
        console.log(chalk.green(`Added: ${newOption}`));
      }
    } else if (action === 'edit') {
      if (config.javaOptions.length === 0) {
        console.log(chalk.yellow('No options to edit'));
        continue;
      }

      const { selected } = await inquirer.prompt([
        {
          type: 'checkbox',
          name: 'selected',
          message: 'Select options to edit or remove:',
          choices: config.javaOptions.map((opt) => ({ name: opt, value: opt })),
        },
      ]);

      for (const opt of selected) {
        const { editAction } = await inquirer.prompt([
          {
            type: 'list',
            name: 'editAction',
            message: `Option: ${opt}`,
            choices: [
              { name: 'Change value', value: 'change' },
              { name: 'Remove', value: 'remove' },
              { name: 'Skip', value: 'skip' },
            ],
          },
        ]);

        if (editAction === 'remove') {
          config.javaOptions = config.javaOptions.filter((o) => o !== opt);
          console.log(chalk.red(`Removed: ${opt}`));
        } else if (editAction === 'change') {
          const { newValue } = await inquirer.prompt([
            {
              type: 'input',
              name: 'newValue',
              message: 'Enter new value:',
              default: opt,
            },
          ]);
          const idx = config.javaOptions.indexOf(opt);
          config.javaOptions[idx] = newValue;
        }
      }
    }
  }

  return config;
}

async function editConfigSection(config: TomlConfig): Promise<TomlConfig> {
  const choices = [
    { name: 'List/Edit options', value: 'edit' },
    { name: 'Add new option', value: 'add' },
    { name: 'Done', value: 'done' },
  ];

  let editing = true;
  while (editing) {
    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'CONFIG - What to do?',
        choices,
      },
    ]);

    if (action === 'done') {
      editing = false;
      continue;
    }

    if (action === 'add') {
      const { newOption } = await inquirer.prompt([
        {
          type: 'input',
          name: 'newOption',
          message: 'Enter new config option (e.g., -config api.key=secret):',
        },
      ]);
      if (newOption) {
        config.config.push(newOption);
        console.log(chalk.green(`Added: ${newOption}`));
      }
    } else if (action === 'edit') {
      if (config.config.length === 0) {
        console.log(chalk.yellow('No options to edit'));
        continue;
      }

      const { selected } = await inquirer.prompt([
        {
          type: 'checkbox',
          name: 'selected',
          message: 'Select options to edit or remove:',
          choices: config.config.map((opt) => ({ name: opt, value: opt })),
        },
      ]);

      for (const opt of selected) {
        const { editAction } = await inquirer.prompt([
          {
            type: 'list',
            name: 'editAction',
            message: `Option: ${opt}`,
            choices: [
              { name: 'Change value', value: 'change' },
              { name: 'Remove', value: 'remove' },
              { name: 'Skip', value: 'skip' },
            ],
          },
        ]);

        if (editAction === 'remove') {
          config.config = config.config.filter((o) => o !== opt);
          console.log(chalk.red(`Removed: ${opt}`));
        } else if (editAction === 'change') {
          const { newValue } = await inquirer.prompt([
            {
              type: 'input',
              name: 'newValue',
              message: 'Enter new value:',
              default: opt,
            },
          ]);
          const idx = config.config.indexOf(opt);
          config.config[idx] = newValue;
        }
      }
    }
  }

  return config;
}

function generateToml(config: TomlConfig): string {
  return `[ENV]
# Workspace directory (default: workspace)
ZAP_DOWNLOADER_WORKSPACE=${config.env.workspace}
# Subdirectories
ZAP_DOWNLOADER_DOWNLOADS=${config.env.downloads}
ZAP_DOWNLOADER_INSTALL=${config.env.install}
ZAP_DOWNLOADER_PACKAGES=${config.env.packages}
ZAP_DOWNLOADER_ZAP_HOME=${config.env.zapHome}

[SERVER]
PORT = ${config.server.port}
HOST = "${config.server.host}"

[PATHS]
# the programme needs to work out where and which the jar is
JAR_PATH = "${config.paths.jarPath}"
DIR = "${config.paths.dir}"
# the programme needs to work out correct address
INSTALL_DIR = "${config.paths.installDir}"

[JAVA_OPTIONS]
flags = [
${config.javaOptions.map((opt) => `  "${opt}"`).join(',\n')}
]

[CONFIG]
flags = [
${config.config.map((opt) => `  "${opt}"`).join(',\n')}
]
`;
}

export const handler = async (argv: Arguments & {
  output?: string;
}) => {
  const workspace = getWorkspace();
  let outputPath = argv.output;

  if (!outputPath) {
    outputPath = path.join(workspace, 'zap.toml');
  }

  let config: TomlConfig = { ...DEFAULT_CONFIG };
  config.env.workspace = workspace;
  config.paths.installDir = path.join(workspace, getInstallDir()).replace(/\\/g, '/');

  const sectionChoices = [
    { name: '[ENV] - Workspace and directories', value: 'env' },
    { name: '[SERVER] - Port and host', value: 'server' },
    { name: '[PATHS] - JAR and installation paths', value: 'paths' },
    { name: '[JAVA_OPTIONS] - JVM flags', value: 'java' },
    { name: '[CONFIG] - ZAP configuration', value: 'config' },
    { name: 'Save and exit', value: 'save' },
  ];

  console.log('=== ZAP TOML Configuration ===\n');

  let done = false;
  while (!done) {
    const { section } = await inquirer.prompt([
      {
        type: 'list',
        name: 'section',
        message: 'Which section to edit?',
        choices: sectionChoices,
      },
    ] as any);

    switch (section) {
      case 'env':
        config = await editEnvSection(config);
        break;
      case 'server':
        config = await editServerSection(config);
        break;
      case 'paths':
        config = await editPathsSection(config);
        break;
      case 'java':
        config = await editJavaOptionsSection(config);
        break;
      case 'config':
        config = await editConfigSection(config);
        break;
      case 'save':
        done = true;
        break;
    }
  }

  const tomlContent = generateToml(config);
  fs.writeFileSync(outputPath, tomlContent, 'utf-8');
  console.log(chalk.green(`\nCreated zap.toml: ${outputPath}`));
};
