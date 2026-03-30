import { fetchZapVersions } from '../parser';
import { formatBytes } from '../downloader';
import { Arguments } from 'yargs';
import { getProxyUrl } from '../proxy';

export const command = 'list';
export const describe = 'List available ZAP versions and addons';

export const builder = (yargs: any) => {
  return yargs
    .option('addons', {
      alias: 'a',
      description: 'List addons only',
      type: 'boolean',
    })
    .option('core', {
      alias: 'c',
      description: 'List core versions only',
      type: 'boolean',
    });
};

export const handler = async (argv: Arguments & {
  addons?: boolean;
  core?: boolean;
  proxy?: string;
}) => {
  const proxy = argv.proxy || getProxyUrl();
  console.log('Fetching ZAP versions...');
  const zapVersions = await fetchZapVersions(proxy);

  if (!argv.addons) {
    console.log('\n=== ZAP Core ===');
    console.log(`Version: ${zapVersions.core.version}`);
    console.log(`Daily: ${zapVersions.core.dailyVersion}`);
    console.log('\nPlatforms:');
    for (const [platform, data] of Object.entries(zapVersions.core.platforms)) {
      if (data) {
        console.log(`  ${platform}: ${data.file} (${formatBytes(data.size)})`);
      }
    }
  }

  if (!argv.core) {
    console.log('\n=== Addons ===');
    const sortedAddons = [...zapVersions.addons].sort((a, b) => a.id.localeCompare(b.id));

    const statusGroups = { release: [] as typeof zapVersions.addons, beta: [] as typeof zapVersions.addons, alpha: [] as typeof zapVersions.addons };
    for (const addon of sortedAddons) {
      statusGroups[addon.status].push(addon);
    }

    for (const status of ['release', 'beta', 'alpha'] as const) {
      console.log(`\n--- ${status.toUpperCase()} ---`);
      for (const addon of statusGroups[status]) {
        console.log(`  ${addon.id} v${addon.version} (${formatBytes(addon.size)})`);
      }
    }
  }
};
