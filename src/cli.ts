import { readFileSync } from 'node:fs';
import { defineCommand, runMain } from 'citty';
import logo from 'cli-ascii-logo';
import { intro, text, isCancel, outro, log } from '@clack/prompts';
import { ensureGitHubAuth } from './auth/github.js';
import { ensureGhCli, cloneTemplate, selectVersion, selectLatestVersion } from './scaffold/clone.js';
import { replaceTemplateNames, removeTemplateFiles } from './scaffold/template.js';
import { setupProject } from './scaffold/setup.js';

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
    latest: {
      alias: ['l'],
      description: 'Skip version selection and use the latest version',
      required: false,
      type: 'boolean',
      default: false,
    },
    experimental: {
      alias: ['e'],
      description: 'Include experimental (pre-release) versions',
      required: false,
      type: 'boolean',
      default: false,
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
      const token = await ensureGitHubAuth();
      await ensureGhCli();
      const tag = args.latest
        ? await selectLatestVersion(token, args.experimental)
        : await selectVersion(token, args.experimental);
      await cloneTemplate(projectName, tag);
      await replaceTemplateNames(projectName, projectName);
      await removeTemplateFiles(projectName);
    } catch (error) {
      log.error(error instanceof Error ? error.message : 'Scaffolding failed.');
      process.exit(1);
    }

    await setupProject(projectName);

    outro(`Project ${projectName} is ready!`);
  },
});

runMain(main);
