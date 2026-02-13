import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockExecFile = vi.fn();
const mockAccess = vi.fn();
const mockPaginateIterator = vi.fn();
const mockSelect = vi.fn();

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

vi.mock('@octokit/rest', () => ({
  Octokit: class {
    paginate = { iterator: mockPaginateIterator };
    rest = { repos: { listTags: vi.fn() } };
  },
}));

vi.mock('@clack/prompts', () => ({
  spinner: vi.fn(() => ({
    start: vi.fn(),
    stop: vi.fn(),
  })),
  select: (...args: unknown[]) => mockSelect(...args),
  isCancel: (v: unknown) => v === Symbol.for('cancel'),
}));

describe('clone', () => {
  beforeEach(() => {
    mockExecFile.mockReset();
    mockAccess.mockReset();
    mockPaginateIterator.mockReset();
    mockSelect.mockReset();
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

  describe('fetchReleaseTags', () => {
    it('should return only tags starting with release-v by default', async () => {
      mockPaginateIterator.mockReturnValue(
        (async function* () {
          yield {
            data: [{ name: 'release-v1.0.0' }, { name: 'release-v2.0.0' }, { name: 'v0.5.0' }, { name: 'other-tag' }],
          };
        })(),
      );
      const { fetchReleaseTags } = await import('./clone.js');
      const tags = await fetchReleaseTags('ghp_test');
      expect(tags).toEqual(['release-v1.0.0', 'release-v2.0.0']);
    });

    it('should include experimental tags when flag is set', async () => {
      mockPaginateIterator.mockReturnValue(
        (async function* () {
          yield { data: [{ name: 'release-v1.0.0' }, { name: 'v0.5.0' }, { name: 'v0.4.0' }, { name: 'other-tag' }] };
        })(),
      );
      const { fetchReleaseTags } = await import('./clone.js');
      const tags = await fetchReleaseTags('ghp_test', true);
      expect(tags).toEqual(['release-v1.0.0', 'v0.5.0', 'v0.4.0']);
    });

    it('should return empty array when no matching tags', async () => {
      mockPaginateIterator.mockReturnValue(
        (async function* () {
          yield { data: [{ name: 'other-tag' }] };
        })(),
      );
      const { fetchReleaseTags } = await import('./clone.js');
      const tags = await fetchReleaseTags('ghp_test');
      expect(tags).toEqual([]);
    });
  });

  describe('selectVersion', () => {
    it('should throw when no release tags exist', async () => {
      mockPaginateIterator.mockReturnValue(
        (async function* () {
          yield { data: [] };
        })(),
      );
      const { selectVersion } = await import('./clone.js');
      await expect(selectVersion('ghp_test')).rejects.toThrow('No release tags found');
    });

    it('should return the selected tag', async () => {
      mockPaginateIterator.mockReturnValue(
        (async function* () {
          yield { data: [{ name: 'release-v2.0.0' }, { name: 'release-v1.0.0' }] };
        })(),
      );
      mockSelect.mockResolvedValue('release-v1.0.0');
      const { selectVersion } = await import('./clone.js');
      const result = await selectVersion('ghp_test');
      expect(result).toBe('release-v1.0.0');
    });
  });

  describe('cloneTemplate', () => {
    it('should throw when directory already exists', async () => {
      mockAccess.mockResolvedValue(undefined);
      const { cloneTemplate } = await import('./clone.js');
      await expect(cloneTemplate('existing-dir')).rejects.toThrow('already exists');
    });

    it('should shallow clone with tag, remove .git, and init new repo', async () => {
      mockAccess.mockRejectedValue(new Error('ENOENT'));
      mockExecFile.mockReturnValue(undefined);
      const { cloneTemplate } = await import('./clone.js');
      await cloneTemplate('my-project', 'release-v1.0.0');
      expect(mockExecFile).toHaveBeenCalledWith('gh', [
        'repo',
        'clone',
        'stormreply/innovator-template',
        'my-project',
        '--',
        '--depth',
        '1',
        '--branch',
        'release-v1.0.0',
      ]);
      expect(mockExecFile).toHaveBeenCalledWith('rm', ['-rf', 'my-project/.git']);
      expect(mockExecFile).toHaveBeenCalledWith('git', ['init', 'my-project']);
    });

    it('should clone without tag when none provided', async () => {
      mockAccess.mockRejectedValue(new Error('ENOENT'));
      mockExecFile.mockReturnValue(undefined);
      const { cloneTemplate } = await import('./clone.js');
      await cloneTemplate('my-project');
      expect(mockExecFile).toHaveBeenCalledWith('gh', [
        'repo',
        'clone',
        'stormreply/innovator-template',
        'my-project',
        '--',
        '--depth',
        '1',
      ]);
    });
  });
});
