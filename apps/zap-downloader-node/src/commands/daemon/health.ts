import chalk from "chalk";
import { Arguments } from "yargs";
import { httpGet } from "./httpHelper";

export const healthDaemonCommand = {
  command: "health",
  describe: "Check ZAP daemon health via /core/view/version/",

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
      });
  },

  handler: async (argv: Arguments & { host?: string; port?: number }) => {
    const host = argv.host || "0.0.0.0";
    const port = argv.port || 8080;

    const url = `http://${host}:${port}/JSON/core/view/version/`;

    console.log(chalk.blue(`Checking ZAP health at ${url}`));

    try {
      const resp = await httpGet(url);

      if (resp.status === 200) {
        console.log(chalk.green("✓ ZAP is healthy"));
        console.log(resp.data);
      } else {
        console.log(chalk.red(`✗ ZAP returned status ${resp.status}`));
      }
    } catch (err: any) {
      console.error(chalk.red(`Health check failed: ${err.message}`));
      process.exit(1);
    }
  },
};