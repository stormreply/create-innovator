import { execFile as execFileCb } from 'node:child_process';
import { promisify } from 'node:util';
import { access } from 'node:fs/promises';
import * as p from '@clack/prompts';
import { GITHUB_ORG, TEMPLATE_REPO } from '../utils/constants.js';

const execFile = promisify(execFileCb);

export async function ensureGhCli(): Promise<void> {
  try {
    await execFile('gh', ['--version']);
  } catch {
    throw new Error(
      'GitHub CLI (gh) is not installed.\n' + 'Please install it from https://cli.github.com and try again.',
    );
  }
}

export async function cloneTemplate(name: string): Promise<void> {
  try {
    await access(name);
    throw new Error(`Directory "${name}" already exists. Please choose a different project name.`);
  } catch (err) {
    if (err instanceof Error && err.message.includes('already exists')) throw err;
  }

  const s = p.spinner();

  s.start(`Cloning ${GITHUB_ORG}/${TEMPLATE_REPO}`);
  await execFile('gh', ['repo', 'clone', `${GITHUB_ORG}/${TEMPLATE_REPO}`, name]);
  s.stop(`Cloned ${GITHUB_ORG}/${TEMPLATE_REPO}`);

  s.start('Initializing fresh git repository');
  await execFile('rm', ['-rf', `${name}/.git`]);
  await execFile('git', ['init', name]);
  s.stop('Git repository initialized');
}
