import { readFileSync } from 'node:fs';
import { defineCommand, runMain } from 'citty';
import logo from 'cli-ascii-logo';
import { intro, text, isCancel, outro, log } from '@clack/prompts';
import { ensureGitHubAuth } from './auth/github.js';
import { ensureGhCli, cloneTemplate } from './scaffold/clone.js';
import { readManifest, collectValues, applyReplacements } from './scaffold/template.js';

const pkgUrl = new URL('../package.json', import.meta.url);
const pkg = JSON.parse(readFileSync(pkgUrl, 'utf8')) as { version?: string };
const version = pkg.version ?? '0.0.0';

const main = defineCommand({
  meta: {
    name: 'create-innovator',
    version,
    description: 'Create an Innovator app',
  },
  args: {
    name: {
      alias: ['n'],
      description: 'Project name',
      required: false,
      type: 'string',
    },
  },
  async run({ args }) {
    console.log(logo.createLogo('Innovator', 'aurora'));

    intro(`Create Innovator App (v${version})`);

    const projectName =
      args.name ??
      (await text({
        defaultValue: 'my-innovator-app',
        message: 'Project name',
        placeholder: 'my-innovator-app',
      }));

    if (isCancel(projectName)) {
      process.exit(0);
    }

    try {
      await ensureGitHubAuth();
      await ensureGhCli();
      await cloneTemplate(projectName);
      const config = await readManifest(projectName);
      const values = await collectValues(config.placeholders, { PROJECT_NAME: projectName });
      await applyReplacements(projectName, config, values);
    } catch (error) {
      log.error(error instanceof Error ? error.message : 'Scaffolding failed.');
      process.exit(1);
    }

    outro(`Project ${projectName} is ready!`);
  },
});

runMain(main);
