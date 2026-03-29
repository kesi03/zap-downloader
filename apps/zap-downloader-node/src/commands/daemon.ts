import { stopDaemonCommand , startDaemonCommand, logsDaemonCommand, statusDaemonCommand, pingDaemonCommand, healthDaemonCommand, checkStartedDaemonCommand} from "./daemon/";





export const command = 'daemon';
export const describe = 'Manage ZAP daemon';

export const builder = (yargs: any) => {
  return yargs
    .command(startDaemonCommand)
    .command(stopDaemonCommand)
    .command(logsDaemonCommand)
    .command(statusDaemonCommand)
    .command(pingDaemonCommand)
    .command(healthDaemonCommand)
    .command(checkStartedDaemonCommand)
    .demandCommand(1, 'Specify a subcommand: start, stop, log, status, ping, health, started');
};

export const handler = () => {};



