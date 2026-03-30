#!/usr/bin/env node
import yargs from 'yargs';
import { verifyChrome } from './verify-chrome';
import { verifyFirefox } from './verify-firefox';

yargs(process.argv.slice(2))
  .scriptName('verify')
  .command(
    'chrome',
    'Verify Chrome and chromedriver installation',
    (yargs) => {
      return yargs.option('headless', {
        alias: 'h',
        description: 'Run in headless mode',
        type: 'boolean',
        default: true,
      });
    },
    async (argv) => {
      console.log('Chrome verification successful!');
      await verifyChrome(argv.headless as boolean);
    }
  )
  .command(
    'firefox',
    'Verify Firefox and geckodriver installation',
    (yargs) => {
      return yargs.option('headless', {
        alias: 'h',
        description: 'Run in headless mode',
        type: 'boolean',
        default: true,
      });
    },
    async (argv) => {
      console.log('Firefox verification successful!');
      await verifyFirefox(argv.headless as boolean);
    }
  )
  .demandCommand(1, 'Specify a subcommand: chrome, firefox')
  .help()
  .parse();
