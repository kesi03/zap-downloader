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
        execSync('sudo apt-get install -y xvfb libgtk-3-0 libdbus-glib-1-2 libnss3 libnspr4 libasound2t64 libatk-bridge2.0-0 libxkbcommon0 libgbm1 libxcomposite1 libxdamage1 libxrandr2 libpango-1.0-0 libcairo2 libatspi2.0-0 libcups2 libdrm2 libxfixes3 libxshmfence1', { stdio: 'inherit' });

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

        let version = '0.36.0';
        try {
          const tagsHtml = execSync('curl -sL https://github.com/mozilla/geckodriver/tags').toString();
          const match = tagsHtml.match(/geckodriver-v(\d+\.\d+\.\d+)/);
          if (match) {
            version = match[1];
          }
        } catch {
          console.log(chalk.yellow(`Could not fetch latest version, using v${version}`));
        }
        const url = `https://github.com/mozilla/geckodriver/releases/download/v${version}/geckodriver-v${version}-win64.zip`;

        console.log(chalk.blue(`Installing geckodriver v${version}`));
        execSync(
          `powershell -Command "Invoke-WebRequest '${url}' -OutFile geckodriver.zip"`,
          { stdio: 'inherit' }
        );
        execSync('powershell -Command "Expand-Archive geckodriver.zip -DestinationPath C:\\tools\\geckodriver"', { stdio: 'inherit' });
        execSync('powershell -Command "$env:PATH += \';C:\\tools\\geckodriver\'; [Environment]::SetEnvironmentVariable(\'PATH\', $env:PATH, \'User\')"', { stdio: 'inherit' });
        console.log(chalk.green('geckodriver installed'));
      } else {
        console.log(chalk.blue('Installing Firefox and geckodriver...'));
        execSync('sudo apt-get update', { stdio: 'inherit' });
        execSync('sudo apt-get install -y xvfb libgtk-3-0 libdbus-glib-1-2 libnss3 libnspr4 libasound2t64 libatk-bridge2.0-0 libxkbcommon0 libgbm1 libxcomposite1 libxdamage1 libxrandr2 libpango-1.0-0 libcairo2', { stdio: 'inherit' });

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

export const verifyChromeCommand = {
  command: 'verify-chrome',
  describe: 'Verify Chrome and chromedriver installation',

  builder: (yargs: any) => {
    return yargs
      .option('headless', {
        alias: 'h',
        description: 'Run in headless mode',
        type: 'boolean',
        default: true,
      });
  },

  handler: async (argv: Arguments & { headless?: boolean }) => {
    try {
      const { Builder } = await import('selenium-webdriver');
      const chrome = await import('selenium-webdriver/chrome');

      const options = new chrome.Options();
      if (argv.headless) {
        options.addArguments('--headless=new');
      }

      const driver = await new Builder()
        .forBrowser('chrome')
        .setChromeOptions(options)
        .build();

      try {
        await driver.get('https://example.com');
        const title = await driver.getTitle();
        console.log(chalk.green('Chrome verification successful!'));
        console.log(chalk.blue('Page title:'), title);
      } finally {
        await driver.quit();
      }
    } catch (err: any) {
      console.error(chalk.red('Chrome verification failed:'), err.message);
      process.exit(1);
    }
  },
};

export const verifyFirefoxCommand = {
  command: 'verify-firefox',
  describe: 'Verify Firefox and geckodriver installation',

  builder: (yargs: any) => {
    return yargs
      .option('headless', {
        alias: 'h',
        description: 'Run in headless mode',
        type: 'boolean',
        default: true,
      });
  },

  handler: async (argv: Arguments & { headless?: boolean }) => {
    try {
      const { Builder } = await import('selenium-webdriver');
      const firefox = await import('selenium-webdriver/firefox');

      const options = new firefox.Options();
      if (argv.headless) {
        options.addArguments('-headless');
      }

      const driver = await new Builder()
        .forBrowser('firefox')
        .setFirefoxOptions(options)
        .build();

      try {
        await driver.get('https://example.com');
        const title = await driver.getTitle();
        console.log(chalk.green('Firefox verification successful!'));
        console.log(chalk.blue('Page title:'), title);
      } finally {
        await driver.quit();
      }
    } catch (err: any) {
      console.error(chalk.red('Firefox verification failed:'), err.message);
      process.exit(1);
    }
  },
};

export const command = 'dependencies';
export const describe = 'Install browser dependencies and verify installation';

export const builder = (yargs: any) => {
  return yargs
    .command(chromeCommand)
    .command(firefoxCommand)
    .command(verifyChromeCommand)
    .command(verifyFirefoxCommand)
    .demandCommand(1, 'Specify a subcommand: chrome, firefox, verify-chrome, verify-firefox');
};

export const handler = () => {};
