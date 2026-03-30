import { execSync } from 'child_process';
import chalk from 'chalk';
import { Arguments } from 'yargs';

function isWindows(): boolean {
  return process.platform === 'win32';
}

function installChoco(): void {
  if (isWindows()) {
    console.log(chalk.blue('Installing Chocolatey...'));
    execSync(
      'powershell -Command "Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12; iex ((New-Object System.Net.WebClient).DownloadString(\'https://community.chocolatey.org/install.ps1\'))"',
      { stdio: 'inherit' }
    );
  }
}

function ensureChoco(): void {
  try {
    execSync('choco --version', { stdio: 'ignore' });
  } catch {
    installChoco();
  }
}

export const chromeCommand = {
  command: 'chrome',
  describe: 'Install Chrome and chromedriver',

  builder: (yargs: any) => {
    return yargs
      .option('version', {
        alias: 'v',
        description: 'Chrome version to install',
        type: 'string',
      })
      .option('os', {
        alias: 'o',
        description: 'Operating system',
        type: 'string',
        default: 'ubuntu',
      });
  },

  handler: async (argv: Arguments & { version?: string; os?: string }) => {
    try {
      const os = argv.os || 'ubuntu';

      if (os === 'windows' || isWindows()) {
        console.log(chalk.blue('Installing Chrome and chromedriver on Windows...'));
        ensureChoco();
        execSync('choco install googlechrome -y', { stdio: 'inherit' });
        execSync('choco install chromedriver -y', { stdio: 'inherit' });
        console.log(chalk.green('Chrome and chromedriver installed'));
      } else {
        console.log(chalk.blue('Installing Chrome and chromedriver...'));
        execSync('sudo apt-get update', { stdio: 'inherit' });

        if (argv.version) {
          console.log(chalk.blue(`Installing Chrome version ${argv.version}...`));
          execSync(
            `wget -q -O /tmp/google-chrome-stable.deb https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb`,
            { stdio: 'inherit' }
          );
          execSync('sudo apt-get install -y /tmp/google-chrome-stable.deb', { stdio: 'inherit' });
        } else {
          execSync('sudo apt-get install -y google-chrome-stable', { stdio: 'inherit' });
        }

        const version = execSync('google-chrome --version').toString().trim();
        console.log(chalk.green(`Installed Chrome: ${version}`));

        execSync('sudo apt-get install -y chromium-chromedriver', { stdio: 'inherit' });
        console.log(chalk.green('chromedriver installed'));
      }

    } catch (err: any) {
      console.error(chalk.red('Failed to install Chrome:'), err.message);
      process.exit(1);
    }
  },
};

export const firefoxCommand = {
  command: 'firefox',
  describe: 'Install Firefox and geckodriver',

  builder: (yargs: any) => {
    return yargs
      .option('version', {
        alias: 'v',
        description: 'Firefox version to install',
        type: 'string',
      })
      .option('os', {
        alias: 'o',
        description: 'Operating system',
        type: 'string',
        default: 'ubuntu',
      });
  },

  handler: async (argv: Arguments & { version?: string; os?: string }) => {
    try {
      const os = argv.os || 'ubuntu';

      if (os === 'windows' || isWindows()) {
        console.log(chalk.blue('Installing Firefox and geckodriver on Windows...'));
        execSync(
          'powershell -Command "Invoke-WebRequest \'https://github.com/mozilla/geckodriver/releases/latest/download/geckodriver-v0.34.0-win64.zip\' -OutFile geckodriver.zip"',
          { stdio: 'inherit' }
        );
        execSync('powershell -Command "Expand-Archive geckodriver.zip -DestinationPath C:\\tools\\geckodriver"', { stdio: 'inherit' });
        execSync('powershell -Command "$env:PATH += \';C:\\tools\\geckodriver\'; [Environment]::SetEnvironmentVariable(\'PATH\', $env:PATH, \'User\')"', { stdio: 'inherit' });
        console.log(chalk.green('geckodriver installed'));
      } else {
        console.log(chalk.blue('Installing Firefox and geckodriver...'));
        execSync('sudo apt-get update', { stdio: 'inherit' });

        if (argv.version) {
          console.log(chalk.blue(`Installing Firefox version ${argv.version}...`));
        } else {
          execSync('sudo apt-get install -y firefox', { stdio: 'inherit' });
        }

        const version = execSync('firefox --version').toString().trim();
        console.log(chalk.green(`Installed Firefox: ${version}`));

        console.log(chalk.green('geckodriver installed'));
      }

    } catch (err: any) {
      console.error(chalk.red('Failed to install Firefox:'), err.message);
      process.exit(1);
    }
  },
};

export const command = 'dependencies';
export const describe = 'Install browser dependencies';

export const builder = (yargs: any) => {
  return yargs
    .command(chromeCommand)
    .command(firefoxCommand)
    .demandCommand(1, 'Specify a subcommand: chrome, firefox');
};

export const handler = () => {};
