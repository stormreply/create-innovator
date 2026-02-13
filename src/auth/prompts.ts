import * as p from '@clack/prompts';
import { REQUIRED_SCOPES } from '../utils/constants.js';

export async function promptForToken(): Promise<string> {
  p.note(
    [
      'A GitHub Personal Access Token (PAT) is required to access the template repository and package registry.',
      '',
      '1. Go to https://github.com/settings/tokens/new',
      `2. Select scopes: ${REQUIRED_SCOPES.join(', ')}`,
      '3. Generate and paste the token below',
    ].join('\n'),
    'GitHub Authentication',
  );

  const token = await p.password({
    message: 'Enter your GitHub Personal Access Token',
    validate(value) {
      if (!value || value.trim().length === 0) {
        return 'Token is required';
      }
    },
  });

  if (p.isCancel(token)) {
    p.cancel('Authentication cancelled.');
    process.exit(0);
  }

  return token;
}
