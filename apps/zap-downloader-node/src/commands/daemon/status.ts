import chalk from "chalk";
import pm2 from "pm2";
import { Arguments } from "yargs";

export const statusDaemonCommand = {
  command: "status",
  describe: "Show PM2 status for the ZAP daemon",

  builder: (yargs: any) => {
    return yargs
      .option("name", {
        alias: "N",
        description: "PM2 process name",
        type: "string",
        default: "zap-daemon",
      })
      .option("json", {
        description: "Return status as JSON",
        type: "boolean",
        default: false,
      });
  },

  handler: async (argv: Arguments & { name?: string; json?: boolean }) => {
    const processName = argv.name || "zap-daemon";
    const asJson = argv.json ?? false;

    console.log(chalk.blue(`Checking PM2 status for: ${processName}`));

    try {
      await new Promise<void>((resolve, reject) => {
        pm2.connect((err) => (err ? reject(err) : resolve()));
      });

      const list = await new Promise<any[]>((resolve, reject) => {
        pm2.list((err, processes) => (err ? reject(err) : resolve(processes)));
      });

      const proc = list.find((p) => p.name === processName);

      if (!proc) {
        const msg = `PM2 process not found: ${processName}`;

        if (asJson) {
          console.log(JSON.stringify({ exists: false, name: processName }, null, 2));
        } else {
          console.log(chalk.red(msg));
        }

        pm2.disconnect();
        return;
      }

      const env = proc.pm2_env || {};

      const status = {
        exists: true,
        name: processName,
        status: env.status,
        pid: proc.pid,
        pm_id: env.pm_id,
        uptime: env.pm_uptime ? new Date(env.pm_uptime).toISOString() : null,
        memory: proc.monit?.memory,
        cpu: proc.monit?.cpu,
        out_log: env.pm_out_log_path,
        err_log: env.pm_err_log_path,
      };

      if (asJson) {
        console.log(JSON.stringify(status, null, 2));
      } else {
        console.log(chalk.green(`Process: ${status.name}`));
        console.log(chalk.gray(`Status: ${status.status}`));
        console.log(chalk.gray(`PID: ${status.pid}`));
        console.log(chalk.gray(`PM2 ID: ${status.pm_id}`));
        console.log(chalk.gray(`Uptime: ${status.uptime || "N/A"}`));
        console.log(chalk.gray(`Memory: ${status.memory} bytes`));
        console.log(chalk.gray(`CPU: ${status.cpu}%`));
        console.log(chalk.gray(`Out Log: ${status.out_log}`));
        console.log(chalk.gray(`Err Log: ${status.err_log}`));
      }
    } catch (err: any) {
      console.error(chalk.red(`Failed to get status: ${err.message}`));
      process.exit(1);
    } finally {
      pm2.disconnect();
    }
  },
};