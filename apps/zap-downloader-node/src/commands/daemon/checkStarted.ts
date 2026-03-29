import chalk from "chalk";
import { Arguments } from "yargs";
import { httpGet } from "./httpHelper";

export const checkStartedDaemonCommand = {
  command: "check-started-daemon",
  describe: "Wait until ZAP daemon responds to /core/view/version/",

  builder: (yargs: any) => {
    return yargs
      .option("host", {
        alias: "H",
        description: "Host",
        type: "string",
        default: "0.0.0.0",
      })
      .option("port", {
        alias: "P",
        description: "Port",
        type: "number",
        default: 8080,
      })
      .option("timeout", {
        alias: "T",
        description: "Max wait time in seconds",
        type: "number",
        default: 60,
      });
  },

  handler: async (argv: Arguments & { host?: string; port?: number; timeout?: number }) => {
    const host = argv.host || "0.0.0.0";
    const port = argv.port || 8080;
    const maxWait = argv.timeout || 60;

    const url = `http://${host}:${port}/JSON/core/view/version/`;

    console.log(chalk.blue(`Waiting for ZAP to start at ${url}`));

    let started = false;

    await new Promise<void>((resolve, reject) => {
      const checkInterval = setInterval(async () => {
        try {
          const resp = await httpGet(url);

          if (resp.status === 200) {
            console.log(chalk.green("✓ ZAP started"));
            console.log(chalk.gray(`Version response: ${resp.data}`));

            started = true;
            clearInterval(checkInterval);
            resolve();
          }
        } catch {
          // Not ready yet
        }
      }, 1000);

      setTimeout(() => {
        if (!started) {
          clearInterval(checkInterval);
          reject(new Error("Daemon failed to start within timeout"));
        }
      }, maxWait * 1000);
    }).catch((err) => {
      console.error(chalk.red(err.message));
      process.exit(1);
    });
  },
};