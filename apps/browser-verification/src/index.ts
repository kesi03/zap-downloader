#!/usr/bin/env node
import yargs from 'yargs';
import { Builder } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome';
import firefox from 'selenium-webdriver/firefox';

const chromeHandler = async () => {
  const options = new chrome.Options();
  options.addArguments('--headless=new');

  const driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();

  try {
    await driver.get('https://example.com');
    const title = await driver.getTitle();
    console.log('Chrome verification successful!');
    console.log('Page title:', title);
  } finally {
    await driver.quit();
  }
};

const firefoxHandler = async () => {
  const options = new firefox.Options();
  options.addArguments('-headless');

  const driver = await new Builder()
    .forBrowser('firefox')
    .setFirefoxOptions(options)
    .build();

  try {
    await driver.get('https://example.com');
    const title = await driver.getTitle();
    console.log('Firefox verification successful!');
    console.log('Page title:', title);
  } finally {
    await driver.quit();
  }
};

yargs(process.argv.slice(2))
  .scriptName('verify')
  .command(
    'chrome',
    'Verify Chrome and chromedriver installation',
    (yargs) => {
      return yargs
        .option('headless', {
          alias: 'h',
          description: 'Run in headless mode',
          type: 'boolean',
          default: true,
        });
    },
    async (argv) => {
      if (!argv.headless) {
        const options = new chrome.Options();
        const driver = await new Builder()
          .forBrowser('chrome')
          .setChromeOptions(options)
          .build();
        try {
          await driver.get('https://example.com');
          const title = await driver.getTitle();
          console.log('Chrome verification successful!');
          console.log('Page title:', title);
        } finally {
          await driver.quit();
        }
      } else {
        await chromeHandler();
      }
    }
  )
  .command(
    'firefox',
    'Verify Firefox and geckodriver installation',
    (yargs) => {
      return yargs
        .option('headless', {
          alias: 'h',
          description: 'Run in headless mode',
          type: 'boolean',
          default: true,
        });
    },
    async (argv) => {
      if (!argv.headless) {
        const options = new firefox.Options();
        const driver = await new Builder()
          .forBrowser('firefox')
          .setFirefoxOptions(options)
          .build();
        try {
          await driver.get('https://example.com');
          const title = await driver.getTitle();
          console.log('Firefox verification successful!');
          console.log('Page title:', title);
        } finally {
          await driver.quit();
        }
      } else {
        await firefoxHandler();
      }
    }
  )
  .demandCommand(1, 'Specify a subcommand: chrome, firefox')
  .help()
  .parse();
