import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockExecFile = vi.fn();
const mockAccess = vi.fn();

vi.mock('node:child_process', () => ({
  execFile: (...args: unknown[]) => {
    const cb = args[args.length - 1] as (err: Error | null, result: { stdout: string; stderr: string }) => void;
    const result = mockExecFile(args[0], args[1]);
    if (result instanceof Error) {
      cb(result, { stdout: '', stderr: '' });
    } else {
      cb(null, { stdout: '', stderr: '' });
    }
  },
}));

vi.mock('node:fs/promises', () => ({
  access: (...args: unknown[]) => mockAccess(...args),
}));

vi.mock('@clack/prompts', () => ({
  spinner: vi.fn(() => ({
    start: vi.fn(),
    stop: vi.fn(),
  })),
}));

describe('clone', () => {
  beforeEach(() => {
    mockExecFile.mockReset();
    mockAccess.mockReset();
  });

  describe('ensureGhCli', () => {
    it('should succeed when gh is available', async () => {
      mockExecFile.mockReturnValue(undefined);
      const { ensureGhCli } = await import('./clone.js');
      await expect(ensureGhCli()).resolves.toBeUndefined();
      expect(mockExecFile).toHaveBeenCalledWith('gh', ['--version']);
    });

    it('should throw when gh is not installed', async () => {
      mockExecFile.mockReturnValue(new Error('not found'));
      const { ensureGhCli } = await import('./clone.js');
      await expect(ensureGhCli()).rejects.toThrow('GitHub CLI (gh) is not installed');
    });
  });

  describe('cloneTemplate', () => {
    it('should throw when directory already exists', async () => {
      mockAccess.mockResolvedValue(undefined);
      const { cloneTemplate } = await import('./clone.js');
      await expect(cloneTemplate('existing-dir')).rejects.toThrow('already exists');
    });

    it('should clone, remove .git, and init new repo', async () => {
      mockAccess.mockRejectedValue(new Error('ENOENT'));
      mockExecFile.mockReturnValue(undefined);
      const { cloneTemplate } = await import('./clone.js');
      await cloneTemplate('my-project');
      expect(mockExecFile).toHaveBeenCalledWith('gh', ['repo', 'clone', 'stormreply/innovator-template', 'my-project']);
      expect(mockExecFile).toHaveBeenCalledWith('rm', ['-rf', 'my-project/.git']);
      expect(mockExecFile).toHaveBeenCalledWith('git', ['init', 'my-project']);
    });
  });
});
