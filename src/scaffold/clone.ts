import { execFile as execFileCb } from 'node:child_process';
import { promisify } from 'node:util';
import { access } from 'node:fs/promises';
import { Octokit } from '@octokit/rest';
import * as p from '@clack/prompts';
import { GITHUB_ORG, TEMPLATE_REPO } from '../utils/constants.js';

const execFile = promisify(execFileCb);

const TAG_PREFIX_STABLE = 'release-v';
const TAG_PREFIX_EXPERIMENTAL = 'v';

export async function ensureGhCli(): Promise<void> {
  try {
    await execFile('gh', ['--version']);
  } catch {
    throw new Error(
      'GitHub CLI (gh) is not installed.\n' + 'Please install it from https://cli.github.com and try again.',
    );
  }
}

export async function fetchReleaseTags(token: string, includeExperimental = false): Promise<string[]> {
  const octokit = new Octokit({ auth: token });
  const tags: string[] = [];

  for await (const response of octokit.paginate.iterator(octokit.rest.repos.listTags, {
    owner: GITHUB_ORG,
    repo: TEMPLATE_REPO,
    per_page: 100,
  })) {
    for (const tag of response.data) {
      if (tag.name.startsWith(TAG_PREFIX_STABLE)) {
        tags.push(tag.name);
      } else if (includeExperimental && tag.name.startsWith(TAG_PREFIX_EXPERIMENTAL)) {
        tags.push(tag.name);
      }
    }
  }

  return tags;
}

export async function selectVersion(token: string, includeExperimental = false): Promise<string> {
  const s = p.spinner();
  s.start('Fetching available template versions');
  const tags = await fetchReleaseTags(token, includeExperimental);
  s.stop(`Found ${tags.length} version(s)`);

  if (tags.length === 0) {
    throw new Error(`No release tags found in ${GITHUB_ORG}/${TEMPLATE_REPO}.`);
  }

  const selected = await p.select({
    message: 'Select a template version',
    options: tags.map((tag, i) => ({
      value: tag,
      label: tag,
      hint: i === 0 ? 'latest' : !tag.startsWith(TAG_PREFIX_STABLE) ? 'experimental' : undefined,
    })),
    initialValue: tags[0],
  });

  if (p.isCancel(selected)) {
    process.exit(0);
  }

  return selected;
}

export async function cloneTemplate(name: string, tag?: string): Promise<void> {
  try {
    await access(name);
    throw new Error(`Directory "${name}" already exists. Please choose a different project name.`);
  } catch (err) {
    if (err instanceof Error && err.message.includes('already exists')) throw err;
  }

  const s = p.spinner();

  const label = tag ? `${GITHUB_ORG}/${TEMPLATE_REPO}@${tag}` : `${GITHUB_ORG}/${TEMPLATE_REPO}`;
  s.start(`Cloning ${label}`);

  const ghArgs = ['repo', 'clone', `${GITHUB_ORG}/${TEMPLATE_REPO}`, name, '--', '--depth', '1'];
  if (tag) ghArgs.push('--branch', tag);

  await execFile('gh', ghArgs);
  s.stop(`Cloned ${label}`);

  s.start('Initializing fresh git repository');
  await execFile('rm', ['-rf', `${name}/.git`]);
  await execFile('git', ['init', name]);
  s.stop('Git repository initialized');
}
