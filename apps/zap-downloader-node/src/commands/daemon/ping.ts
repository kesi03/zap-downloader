import chalk from "chalk";
import net from "node:net";
import { Arguments } from "yargs";

export const pingDaemonCommand = {
  command: "ping-daemon",
  describe: "Check if the ZAP daemon host:port is reachable",

  builder: (yargs: any) => {
    return yargs
      .option("host", {
        alias: "H",
        description: "Host to check",
        type: "string",
        default: "127.0.0.1",
      })
      .option("port", {
        alias: "P",
        description: "Port to check",
        type: "number",
        default: 8080,
      })
      .option("timeout", {
        alias: "T",
        description: "Timeout in milliseconds",
        type: "number",
        default: 2000,
      })
      .option("json", {
        description: "Return result as JSON",
        type: "boolean",
        default: false,
      });
  },

  handler: async (argv: Arguments & {
    host?: string;
    port?: number;
    timeout?: number;
    json?: boolean;
  }) => {
    const host = argv.host || "127.0.0.1";
    const port = argv.port || 8080;
    const timeout = argv.timeout || 2000;
    const asJson = argv.json ?? false;

    console.log(chalk.blue(`Pinging ${host}:${port}...`));

    const result = await new Promise<{ ok: boolean; error?: string }>((resolve) => {
      const socket = new net.Socket();

      const onError = (err: any) => {
        socket.destroy();
        resolve({ ok: false, error: err.message });
      };

      socket.setTimeout(timeout);

      socket.on("timeout", () => onError(new Error("Connection timed out")));
      socket.on("error", onError);

      socket.connect(port, host, () => {
        socket.end();
        resolve({ ok: true });
      });
    });

    if (asJson) {
      console.log(
        JSON.stringify(
          {
            host,
            port,
            reachable: result.ok,
            error: result.error || null,
          },
          null,
          2
        )
      );
      return;
    }

    if (result.ok) {
      console.log(chalk.green(`✓ ${host}:${port} is reachable`));
    } else {
      console.log(chalk.red(`✗ ${host}:${port} is NOT reachable`));
      if (result.error) {
        console.log(chalk.gray(`Reason: ${result.error}`));
      }
    }
  },
};