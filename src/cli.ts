import { readFileSync } from 'node:fs';
import { defineCommand, runMain } from 'citty';

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
      type: 'string',
      required: false,
      description: 'Project name',
    },
  },
  run({ args }) {
    const projectName = args.name ?? 'my-innovator-app';
    console.log(`Scaffolding ${projectName}...`);
  },
});

runMain(main);
