import { execFile as execFileCb } from 'node:child_process';
import { promisify } from 'node:util';
import * as p from '@clack/prompts';

const execFile = promisify(execFileCb);

export async function setupProject(projectDir: string, projectName: string): Promise<void> {
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
    await execFile('pnpm', ['install'], { cwd: projectDir });
    s.stop('Dependencies installed');

    s.start('Updating test snapshots');
    await execFile('pnpm', ['test', '-u'], { cwd: projectDir });
    s.stop('Test snapshots updated');

    s.start('Creating initial commit');
    await execFile('git', ['add', '.'], { cwd: projectDir });
    await execFile('git', ['commit', '--no-verify', '-m', `feat(${projectName}): initial commit`], {
      cwd: projectDir,
    });
    s.stop('Initial commit created');
  } catch {
    s.stop('Setup incomplete');
    p.log.warn('Automatic setup failed. Run these commands manually:');
    p.log.info(
      `  cd ${projectDir}\n  corepack enable\n  pnpm install\n  pnpm test -u\n  git add . && git commit --no-verify -m "feat(${projectName}): initial commit"`,
    );
  }
}
