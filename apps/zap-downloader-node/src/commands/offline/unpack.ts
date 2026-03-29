import * as fs from 'fs';
import * as path from 'path';
import * as tar from 'tar';
import chalk from 'chalk';
import { Arguments } from 'yargs';

export const unpackOfflineCommand = {
  command: 'unpack',
  describe: 'Unpack offline ZAP package',

  builder: (yargs: any) => {
    return yargs
      .option('input', {
        alias: 'i',
        description: 'Path to .tar package file',
        type: 'string',
        demandOption: true,
      })
      .option('output', {
        alias: 'o',
        description: 'Output directory',
        type: 'string',
      });
  },

  handler: async (argv: Arguments & {
    input: string;
    output?: string;
  }) => {
    const inputPath = argv.input;
    let outputDir = argv.output;

    if (!fs.existsSync(inputPath)) {
      console.error(chalk.red(`Package not found: ${inputPath}`));
      process.exit(1);
    }

    if (!outputDir) {
      outputDir = path.basename(inputPath, path.extname(inputPath));
    }

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    console.log(chalk.blue(`Unpacking to ${outputDir}...`));

    try {
      await tar.extract({ file: inputPath, cwd: outputDir });

      const workspaceDir = path.join(outputDir, 'workspace');
      if (!fs.existsSync(workspaceDir)) {
        console.error(chalk.red('Invalid package: workspace folder not found'));
        process.exit(1);
      }

      const zapDir = path.join(workspaceDir, 'zap');
      const addonsDir = path.join(workspaceDir, 'addons');
      const installDir = path.join(workspaceDir, 'install');

      let zapVersionDir: string | null = null;
      let tarGzPath: string | null = null;

      if (fs.existsSync(zapDir)) {
        const zapContents = fs.readdirSync(zapDir);
        
        for (const f of zapContents) {
          if (f.startsWith('ZAP_') && f.endsWith('.tar.gz')) {
            tarGzPath = path.join(zapDir, f);
            break;
          } else if (f.startsWith('ZAP_') && fs.statSync(path.join(zapDir, f)).isDirectory()) {
            zapVersionDir = path.join(zapDir, f);
            break;
          }
        }
      }

      if (tarGzPath) {
        console.log(chalk.blue(`Extracting ${path.basename(tarGzPath)}...`));
        try {
          await tar.extract({ file: tarGzPath, cwd: zapDir });
          fs.unlinkSync(tarGzPath);

          const zapContents = fs.readdirSync(zapDir);
          for (const f of zapContents) {
            if (f.startsWith('ZAP_') && fs.statSync(path.join(zapDir, f)).isDirectory()) {
              zapVersionDir = path.join(zapDir, f);
              break;
            }
          }
        } catch (err) {
          console.error(chalk.red('Failed to extract tar.gz:'), err);
          process.exit(1);
        }
      }

      if (zapVersionDir) {
        const pluginDir = path.join(zapVersionDir, 'plugin');
        const addonsInZapDir = path.join(zapDir, 'addons');

        let addonsToProcess: string | null = null;
        if (fs.existsSync(addonsInZapDir)) {
          addonsToProcess = addonsInZapDir;
        } else if (fs.existsSync(addonsDir)) {
          addonsToProcess = addonsDir;
        }

        if (addonsToProcess) {
          const existingAddons = new Set(
            fs.existsSync(pluginDir) ? fs.readdirSync(pluginDir) : []
          );
          
          const addonsToMove = fs.readdirSync(addonsToProcess).filter(
            f => !existingAddons.has(f)
          );

          if (addonsToMove.length > 0) {
            if (!fs.existsSync(pluginDir)) {
              fs.mkdirSync(pluginDir, { recursive: true });
            }
            
            for (const f of addonsToMove) {
              fs.renameSync(
                path.join(addonsToProcess, f),
                path.join(pluginDir, f)
              );
            }
            
            console.log(chalk.green(`Moved ${addonsToMove.length} addons to ${pluginDir}`));
          } else {
            console.log(chalk.yellow('Addons already present in plugin folder'));
          }

          if (fs.existsSync(addonsToProcess)) {
            fs.rmSync(addonsToProcess, { recursive: true, force: true });
          }
        }
      } else if (fs.existsSync(addonsDir)) {
        console.log(chalk.yellow(`No ZAP version folder found, addons remain in: ${addonsDir}`));
      }

      console.log(chalk.green(`Unpack complete: ${outputDir}`));
      console.log(chalk.blue(`Run ZAP with: zap-downloader daemon start -t ${workspaceDir}/default.toml`));
    } catch (err) {
      console.error(chalk.red('Failed to extract package:'), err);
      process.exit(1);
    }
  },
};
