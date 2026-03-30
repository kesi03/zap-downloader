#!/usr/bin/env node
import yargs from 'yargs';
import { verifyChrome } from './verify-chrome';
import { verifyFirefox } from './verify-firefox';

yargs(process.argv.slice(2))
  .command(
    'verify <browser>',
    'Verify browser and driver installation',
    (y: any) => {
      return y
        .positional('browser', {
          describe: 'Browser to verify',
          choices: ['chrome', 'firefox'],
          demandOption: true,
        })
        .option('headless', {
          alias: 'h',
          description: 'Run in headless mode',
          type: 'boolean',
          default: true,
        });
    },
    async (argv: any) => {
      const { browser, headless } = argv;
      console.log(`Verifying ${browser}...`);

      try {
        if (browser === 'chrome') {
          await verifyChrome(headless);
        } else if (browser === 'firefox') {
          await verifyFirefox(headless);
        }
        process.exit(0);
      } catch (error) {
        console.error('Verification failed:', error);
        process.exit(1);
      }
    }
  )
  .demandCommand(1)
  .help()
  .parse();
