import chalk from "chalk";
import { Arguments } from "yargs";
import pm2 from 'pm2';
import { PM2ProcessInfo } from "./types";

export const stopDaemonCommand = {
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