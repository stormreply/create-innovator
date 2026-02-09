import { readFileSync } from 'node:fs';
import { defineCommand, runMain } from 'citty';
import { intro, text, isCancel, outro } from '@clack/prompts';

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

    outro(`Scaffolding ${projectName}...`);
  },
});

runMain(main);
