import { execFile as execFileCb } from 'node:child_process';
import { promisify } from 'node:util';
import * as p from '@clack/prompts';

const execFile = promisify(execFileCb);

export async function setupProject(projectName: string): Promise<void> {
  const s = p.spinner();

  try {
    s.start('Checking pnpm availability');
    try {
      await execFile('pnpm', ['--version']);
    } catch {
      s.message('Enabling corepack');
      await execFile('corepack', ['enable']);
    }
    s.stop('pnpm is available');

    s.start('Installing dependencies');
    await execFile('pnpm', ['install'], { cwd: projectName });
    s.stop('Dependencies installed');

    s.start('Updating test snapshots');
    await execFile('pnpm', ['test', '-u'], { cwd: projectName });
    s.stop('Test snapshots updated');

    s.start('Creating initial commit');
    await execFile('git', ['add', '.'], { cwd: projectName });
    await execFile('git', ['commit', '-m', `feat(${projectName}): initial commit`], {
      cwd: projectName,
      env: { ...process.env, HUSKY: '0' },
    });
    s.stop('Initial commit created');
  } catch {
    s.stop('Setup incomplete');
    p.log.warn('Automatic setup failed. Run these commands manually:');
    p.log.info(
      `  cd ${projectName}\n  corepack enable\n  pnpm install\n  pnpm test -u\n  git add . && HUSKY=0 git commit -m "feat(${projectName}): initial commit"`,
    );
  }
}
