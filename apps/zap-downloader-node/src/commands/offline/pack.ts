import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import chalk from 'chalk';
import { fetchZapVersions } from '../../parser';
import { downloadFile, formatBytes } from '../../downloader';
import { Arguments } from 'yargs';

export const packOfflineCommand = {
  command: 'pack',
  describe: 'Create offline ZAP package with all addons',

  builder: (yargs: any) => {
    return yargs
      .option('output', {
        alias: 'o',
        description: 'Output .tar archive path',
        type: 'string',
        default: 'zap-offline.tar',
      })
      .option('platform', {
        alias: 'p',
        description: 'Platform for ZAP core',
        type: 'string',
        default: 'linux',
      });
  },

  handler: async (argv: Arguments & {
    output?: string;
    platform?: string;
  }) => {
    const platform = argv.platform || 'linux';
    const outputName = argv.output || 'zap-offline.tar';

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zap-offline-'));
    const workspace = path.join(tempDir, 'workspace');
    const zapDir = path.join(workspace, 'zap');
    const addonsDir = path.join(workspace, 'addons');
    const installDir = path.join(workspace, 'install');

    try {
      console.log(chalk.blue('Creating offline ZAP package...'));
      console.log(chalk.gray(`Temp workspace: ${workspace}`));

      fs.mkdirSync(zapDir, { recursive: true });
      fs.mkdirSync(addonsDir, { recursive: true });
      fs.mkdirSync(installDir, { recursive: true });

      console.log(chalk.blue('\n=== Downloading ZAP core ==='));
      const zapVersions = await fetchZapVersions();
      const platformData = zapVersions.core.platforms[platform as keyof typeof zapVersions.core.platforms];

      if (!platformData) {
        console.error(chalk.red(`Platform ${platform} not available`));
        process.exit(1);
      }

      console.log(`Platform: ${platform}`);
      console.log(`Version: ${zapVersions.core.version}`);
      console.log(`Size: ${formatBytes(platformData.size)}`);

      const coreOutput = path.join(zapDir, platformData.file);
      await downloadFile(platformData.url, coreOutput, platformData.hash);
      console.log(chalk.green('ZAP core downloaded'));

      console.log(chalk.blue('\n=== Downloading ALL addons (release + beta + alpha) ==='));
      const allAddons = zapVersions.addons;
      console.log(`Found ${allAddons.length} addons`);

      const downloadedIds = new Set<string>();
      const failedAddons: string[] = [];

      for (const addon of allAddons) {
        if (downloadedIds.has(addon.id)) continue;

        console.log(`\nDownloading ${addon.id} v${addon.version} (${addon.status})...`);
        console.log(`  Size: ${formatBytes(addon.size)}`);

        if (addon.dependencies) {
          console.log(`  Dependencies: ${addon.dependencies.map(d => d.id).join(', ')}`);
        }

        const outputPath = path.join(addonsDir, addon.file);
        
        try {
          await downloadFile(addon.url, outputPath, addon.hash);
          downloadedIds.add(addon.id);
        } catch (err) {
          console.log(chalk.yellow(`  Skipping ${addon.id}: hash mismatch (may be outdated)`));
          failedAddons.push(addon.id);
          if (fs.existsSync(outputPath)) {
            fs.unlinkSync(outputPath);
          }
        }
      }

      console.log(chalk.green(`\nDownloaded ${downloadedIds.size} addons`));
      if (failedAddons.length > 0) {
        console.log(chalk.yellow(`Skipped ${failedAddons.length} addons with hash mismatch: ${failedAddons.join(', ')}`));
      }

      console.log(chalk.blue('\n=== Creating offline config ==='));
      const tomlContent = `[ENV]
ZAP_DOWNLOADER_WORKSPACE = ""

[SERVER]
PORT = 8080
HOST = "0.0.0.0"

[PATHS]
JAR_PATH = "zap/ZAP_${zapVersions.core.version}/zap-${zapVersions.core.version}.jar"
INSTALL_DIR = "zap"
DIR = ".zap"

[AUTOUPDATE]
enabled = false

[JAVA_OPTIONS]
flags = [
  "-Xmx2g",
  "-Xss512k"
]

[CONFIG]
flags = [
  "api.disablekey=true",
  "api.addrs.addr.name=.*",
  "api.addrs.addr.regex=true",
  "autoupdate.enabled=false",
  "database.response.bodysize=104857600",
  "database.cache.size=1000000",
  "database.recoverylog=false"
]
`;
      const tomlPath = path.join(workspace, 'default.toml');
      fs.writeFileSync(tomlPath, tomlContent);
      console.log(chalk.green('Created default.toml with auto-update disabled'));

      console.log(chalk.blue('\n=== Creating package ==='));

      const finalOutput = path.resolve(outputName);
      const tar = await import('tar');

      await tar.create({
        file: finalOutput,
        cwd: tempDir,
        portable: true,
      }, ['workspace']);

      console.log(chalk.green('Package created successfully'));

      const stats = fs.statSync(finalOutput);
      console.log(chalk.green(`Package created: ${finalOutput}`));
      console.log(chalk.blue(`Size: ${formatBytes(stats.size)}`));

    } catch (err: any) {
      console.error(chalk.red('Failed to create offline package:'), err.message);
      process.exit(1);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  },
};
