import { readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { GITHUB_ORG, GITHUB_REGISTRY_URL } from '../utils/constants.js';

const NPMRC_PATH = join(homedir(), '.npmrc');
const AUTH_TOKEN_LINE = `//npm.pkg.github.com/:_authToken=`;
const REGISTRY_LINE = `@${GITHUB_ORG}:registry=${GITHUB_REGISTRY_URL}`;

async function readNpmrc(): Promise<string> {
  try {
    return await readFile(NPMRC_PATH, 'utf8');
  } catch {
    return '';
  }
}

export async function getStoredToken(): Promise<string | null> {
  const content = await readNpmrc();
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith(AUTH_TOKEN_LINE)) {
      const token = trimmed.slice(AUTH_TOKEN_LINE.length);
      if (token) return token;
    }
  }
  return null;
}

export async function saveToken(token: string): Promise<void> {
  const content = await readNpmrc();
  const lines = content.split('\n');

  let hasAuthToken = false;
  let hasRegistry = false;

  const updated = lines.map((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith(AUTH_TOKEN_LINE)) {
      hasAuthToken = true;
      return `${AUTH_TOKEN_LINE}${token}`;
    }
    if (trimmed === REGISTRY_LINE) {
      hasRegistry = true;
    }
    return line;
  });

  if (!hasAuthToken) {
    updated.push(`${AUTH_TOKEN_LINE}${token}`);
  }
  if (!hasRegistry) {
    updated.push(REGISTRY_LINE);
  }

  const result = updated.filter((line, i) => !(line === '' && i === updated.length - 1)).join('\n');
  await writeFile(NPMRC_PATH, result.endsWith('\n') ? result : result + '\n', 'utf8');
}
