import { Octokit } from '@octokit/rest';
import * as p from '@clack/prompts';
import { GITHUB_ORG, TEMPLATE_REPO, REQUIRED_SCOPES } from '../utils/constants.js';
import { getStoredToken, saveToken } from './token-storage.js';
import { promptForToken } from './prompts.js';

export interface TokenValidation {
  valid: boolean;
  scopes: string[];
  missingScopes: string[];
  username: string;
}

export async function validateToken(token: string): Promise<TokenValidation> {
  const octokit = new Octokit({ auth: token });
  const response = await octokit.request('GET /user');
  const scopeHeader = response.headers['x-oauth-scopes'] ?? '';
  const scopes = scopeHeader
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const missingScopes = REQUIRED_SCOPES.filter((s) => !scopes.includes(s));

  return {
    valid: true,
    scopes,
    missingScopes,
    username: response.data.login,
  };
}

export async function checkRepoAccess(token: string): Promise<boolean> {
  const octokit = new Octokit({ auth: token });
  try {
    await octokit.rest.repos.get({ owner: GITHUB_ORG, repo: TEMPLATE_REPO });
    return true;
  } catch {
    return false;
  }
}

export async function checkRegistryAccess(token: string): Promise<boolean> {
  const octokit = new Octokit({ auth: token });
  try {
    await octokit.rest.packages.listPackagesForOrganization({ org: GITHUB_ORG, package_type: 'npm' });
    return true;
  } catch {
    return false;
  }
}

export async function ensureGitHubAuth(): Promise<string> {
  const s = p.spinner();

  s.start('Reading token from ~/.npmrc');
  let token = await getStoredToken();
  if (token) {
    s.stop('Token found in ~/.npmrc');
  } else {
    s.stop('No token found in ~/.npmrc');
    token = await promptForToken();
  }

  s.start('Validating token with GitHub');
  const validation = await validateToken(token);
  if (validation.missingScopes.length > 0) {
    s.stop('Token validation failed');
    throw new Error(
      `Token for @${validation.username} is missing required scopes: ${validation.missingScopes.join(', ')}.\n` +
        `Please create a new token at https://github.com/settings/tokens/new with scopes: ${REQUIRED_SCOPES.join(', ')}`,
    );
  }
  s.stop(`Authenticated as @${validation.username}`);

  s.start(`Checking access to ${GITHUB_ORG}/${TEMPLATE_REPO}`);
  const hasRepoAccess = await checkRepoAccess(token);
  if (!hasRepoAccess) {
    s.stop('Repository access denied');
    throw new Error(
      `Token for @${validation.username} does not have access to ${GITHUB_ORG}/${TEMPLATE_REPO}.\n` +
        `Please ensure you are a member of the ${GITHUB_ORG} organization.`,
    );
  }
  s.stop(`Access to ${GITHUB_ORG}/${TEMPLATE_REPO} confirmed`);

  s.start(`Checking access to ${GITHUB_ORG} package registry`);
  const hasRegistryAccess = await checkRegistryAccess(token);
  if (!hasRegistryAccess) {
    s.stop('Registry access denied');
    throw new Error(
      `Token for @${validation.username} does not have access to the ${GITHUB_ORG} package registry.\n` +
        `Please ensure your token has the read:packages scope.`,
    );
  }
  s.stop(`Access to ${GITHUB_ORG} package registry confirmed`);

  s.start('Saving token to ~/.npmrc');
  await saveToken(token);
  s.stop('Token saved to ~/.npmrc');

  return token;
}
