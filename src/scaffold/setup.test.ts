import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockExecFile = vi.fn();
const mockSpinner = { start: vi.fn(), stop: vi.fn(), message: vi.fn() };
const mockLogWarn = vi.fn();
const mockLogInfo = vi.fn();

vi.mock('node:child_process', () => ({
  execFile: (...args: unknown[]) => {
    const cb = args[args.length - 1] as (err: Error | null, result: { stdout: string; stderr: string }) => void;
    const result = mockExecFile(args[0], args[1], args[2]);
    if (result instanceof Error) {
      cb(result, { stdout: '', stderr: '' });
    } else {
      cb(null, { stdout: '', stderr: '' });
    }
  },
}));

vi.mock('@clack/prompts', () => ({
  spinner: vi.fn(() => mockSpinner),
  log: { warn: (...args: unknown[]) => mockLogWarn(...args), info: (...args: unknown[]) => mockLogInfo(...args) },
}));

describe('setupProject', () => {
  beforeEach(() => {
    mockExecFile.mockReset();
    mockSpinner.start.mockReset();
    mockSpinner.stop.mockReset();
    mockSpinner.message.mockReset();
    mockLogWarn.mockReset();
    mockLogInfo.mockReset();
  });

  it('should skip corepack enable when pnpm is already available', async () => {
    mockExecFile.mockReturnValue(undefined);
    const { setupProject } = await import('./setup.js');
    await setupProject('my-project');
    expect(mockExecFile).toHaveBeenCalledWith('pnpm', ['--version'], expect.any(Function));
    expect(mockExecFile).not.toHaveBeenCalledWith('corepack', expect.anything(), expect.anything());
    expect(mockExecFile).toHaveBeenCalledWith('pnpm', ['install'], { cwd: 'my-project' });
    expect(mockExecFile).toHaveBeenCalledWith('pnpm', ['test', '-u'], { cwd: 'my-project' });
    expect(mockExecFile).toHaveBeenCalledWith('git', ['add', '.'], { cwd: 'my-project' });
    expect(mockExecFile).toHaveBeenCalledWith('git', ['commit', '-m', 'feat(my-project): initial commit'], {
      cwd: 'my-project',
      env: expect.objectContaining({ HUSKY: '0' }),
    });
  });

  it('should run corepack enable when pnpm is not available', async () => {
    mockExecFile.mockImplementation((cmd: string, args: string[]) => {
      if (cmd === 'pnpm' && args[0] === '--version') return new Error('not found');
      return undefined;
    });
    const { setupProject } = await import('./setup.js');
    await setupProject('my-project');
    expect(mockExecFile).toHaveBeenCalledWith('corepack', ['enable'], expect.any(Function));
    expect(mockExecFile).toHaveBeenCalledWith('pnpm', ['install'], { cwd: 'my-project' });
  });

  it('should warn when corepack enable fails', async () => {
    mockExecFile.mockImplementation((cmd: string, args: string[]) => {
      if (cmd === 'pnpm' && args[0] === '--version') return new Error('not found');
      if (cmd === 'corepack') return new Error('corepack failed');
      return undefined;
    });
    const { setupProject } = await import('./setup.js');
    await setupProject('my-project');
    expect(mockLogWarn).toHaveBeenCalled();
    expect(mockLogInfo).toHaveBeenCalled();
  });

  it('should warn when pnpm install fails', async () => {
    mockExecFile.mockImplementation((cmd: string, args: string[]) => {
      if (cmd === 'pnpm' && args[0] === 'install') return new Error('install failed');
      return undefined;
    });
    const { setupProject } = await import('./setup.js');
    await setupProject('my-project');
    expect(mockLogWarn).toHaveBeenCalled();
    expect(mockLogInfo).toHaveBeenCalled();
  });

  it('should warn when pnpm test fails', async () => {
    mockExecFile.mockImplementation((cmd: string, args: string[]) => {
      if (cmd === 'pnpm' && args[0] === 'test') return new Error('test failed');
      return undefined;
    });
    const { setupProject } = await import('./setup.js');
    await setupProject('my-project');
    expect(mockLogWarn).toHaveBeenCalled();
    expect(mockLogInfo).toHaveBeenCalled();
  });

  it('should never reject', async () => {
    mockExecFile.mockReturnValue(new Error('everything fails'));
    const { setupProject } = await import('./setup.js');
    await expect(setupProject('my-project')).resolves.toBeUndefined();
  });
});
