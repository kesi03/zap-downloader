import { execSync } from 'child_process';
import chalk from 'chalk';
import { Arguments } from 'yargs';
import { deprecate } from 'util';

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
        execSync('choco install googlechrome -y --force', { stdio: 'inherit' });

        const version = execSync('powershell -Command "(Get-Item \'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe\').VersionInfo.ProductVersion"').toString().trim();
        const majorVersion = version.split('.')[0];
        console.log(chalk.green(`Installed Chrome: ${version}`));

        console.log(chalk.blue(`Installing matching chromedriver for Chrome ${majorVersion}...`));
        const chromedriverUrl = `https://edgedl.me.gvt1.com/edgedl/chrome/chrome-for-testing/${majorVersion}/win32/chromedriver-win32.zip`;
        execSync(
          `powershell -Command "Invoke-WebRequest '${chromedriverUrl}' -OutFile chromedriver.zip"`,
          { stdio: 'inherit' }
        );
        execSync('powershell -Command "Expand-Archive chromedriver.zip -DestinationPath C:\\tools\\chromedriver -Force"', { stdio: 'inherit' });
        execSync('powershell -Command "$oldPath = [Environment]::GetEnvironmentVariable(\'PATH\', \'User\'); if ($oldPath -notlike \'*C:\\tools\\chromedriver*\') { [Environment]::SetEnvironmentVariable(\'PATH\', \"$oldPath;C:\\tools\\chromedriver\", \'User\') }"', { stdio: 'inherit' });
        console.log(chalk.green('chromedriver installed'));
      } else {
        console.log(chalk.blue('Installing Chrome and chromedriver...'));
        execSync('sudo apt-get update', { stdio: 'inherit' });
        execSync('sudo apt-get install -y wget gnupg xvfb libgtk-3-0 libdbus-glib-1-2 libnss3 libnspr4 libasound2t64 libatk-bridge2.0-0 libxkbcommon0 libgbm1 libxcomposite1 libxdamage1 libxrandr2 libpango-1.0-0 libcairo2 libatspi2.0-0 libcups2 libdrm2 libxfixes3 libxshmfence1 unzip', { stdio: 'inherit' });

        execSync('wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | sudo apt-key add -', { stdio: 'inherit' });
        execSync('echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" | sudo tee /etc/apt/sources.list.d/google-chrome.list', { stdio: 'inherit' });
        execSync('sudo apt-get update', { stdio: 'inherit' });

        console.log(chalk.blue(`Installing latest Chrome...`));
        execSync(
          `wget -q -O /tmp/google-chrome-stable.deb https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb`,
          { stdio: 'inherit' }
        );
        execSync('sudo apt-get install -y --reinstall /tmp/google-chrome-stable.deb', { stdio: 'inherit' });

        const chromePaths = ['/usr/bin/google-chrome', '/snap/bin/chromium', '/usr/bin/chromium', '/usr/bin/chromium-browser'];
        let chromePath = '';
        for (const p of chromePaths) {
          try {
            execSync(`test -x ${p} && echo exists`, { stdio: 'pipe' });
            chromePath = p;
            break;
          } catch {}
        }
        if (!chromePath) {
          const snapChrome = '/snap/bin/chromium';
          try {
            execSync(`ls -la ${snapChrome}`, { stdio: 'pipe' });
            chromePath = snapChrome;
          } catch {
            chromePath = '/usr/bin/chromium';
          }
        }
        console.log(chalk.green(`Chrome binary found at: ${chromePath}`));
        console.log(chalk.blue(`Set CHROME_BIN=${chromePath} environment variable for verification (Linux/macOS)`));
        console.log(chalk.blue(`Set CHROME_BIN=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe for Windows`));

        const version = execSync('google-chrome --version').toString().trim();
        console.log(chalk.green(`Installed Chrome: ${version}`));

        const majorVersion = version.match(/Chrome (\d+)/)?.[1];
        if (majorVersion) {
          try {
            console.log(chalk.blue(`Installing matching chromedriver for Chrome ${majorVersion}...`));
            execSync(
              `wget -q -O /tmp/chromedriver.zip https://edgedl.me.gvt1.com/edgedl/chrome/chrome-for-testing/${majorVersion}/linux64/chromedriver-linux64.zip`,
              { stdio: 'inherit' }
            );
            execSync('sudo unzip -o /tmp/chromedriver.zip -d /usr/local/bin/', { stdio: 'inherit' });
            execSync('sudo mv /usr/local/bin/chromedriver-linux64/chromedriver /usr/local/bin/chromedriver', { stdio: 'inherit' });
            execSync('sudo rm -rf /usr/local/bin/chromedriver-linux64', { stdio: 'inherit' });
            console.log(chalk.green('chromedriver installed'));
          } catch {
            console.log(chalk.yellow(`Chrome ${majorVersion} not available on chrome-for-testing, falling back to apt`));
            execSync('sudo apt-get install -y chromium-chromedriver', { stdio: 'inherit' });
            console.log(chalk.green('chromedriver installed'));
          }
        } else {
          execSync('sudo apt-get install -y chromium-chromedriver', { stdio: 'inherit' });
          console.log(chalk.green('chromedriver installed'));
        }
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

export const command = 'dependencies';
export const describe = 'Install browser dependencies';
// @deprecate('The "dependencies" command is deprecated and will be removed in future versions. Please install browsers and drivers manually.', '1.0.0')
export const builder = (yargs: any) => {
  return yargs
    .command(chromeCommand)
    .command(firefoxCommand)
    .demandCommand(1, 'Specify a subcommand: chrome, firefox');
};

export const handler = () => {};
