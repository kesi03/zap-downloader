import { packOfflineCommand } from "./offline/pack";
import { unpackOfflineCommand } from "./offline/unpack";

export const command = 'offline';
export const describe = 'Create offline ZAP package and unpack it';

export const builder = (yargs: any) => {
  return yargs
    .command(packOfflineCommand)
    .command(unpackOfflineCommand)
    .demandCommand(1, 'Specify a subcommand: pack, unpack');
};

export const handler = () => {};
