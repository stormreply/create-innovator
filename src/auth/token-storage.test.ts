import { describe, it, expect, vi, beforeEach } from 'vitest';
import { join } from 'node:path';
import { homedir } from 'node:os';

const NPMRC_PATH = join(homedir(), '.npmrc');

vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
}));

describe('token-storage', () => {
  let readFile: ReturnType<typeof vi.fn>;
  let writeFile: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.resetModules();
    const fs = await import('node:fs/promises');
    readFile = fs.readFile as ReturnType<typeof vi.fn>;
    writeFile = fs.writeFile as ReturnType<typeof vi.fn>;
    readFile.mockReset();
    writeFile.mockReset();
  });

  describe('getStoredToken', () => {
    it('should return token from .npmrc', async () => {
      readFile.mockResolvedValue('//npm.pkg.github.com/:_authToken=ghp_abc123\n');
      const { getStoredToken } = await import('./token-storage.js');
      expect(await getStoredToken()).toBe('ghp_abc123');
    });

    it('should return null when no token exists', async () => {
      readFile.mockResolvedValue('registry=https://registry.npmjs.org\n');
      const { getStoredToken } = await import('./token-storage.js');
      expect(await getStoredToken()).toBeNull();
    });

    it('should return null when .npmrc does not exist', async () => {
      readFile.mockRejectedValue(new Error('ENOENT'));
      const { getStoredToken } = await import('./token-storage.js');
      expect(await getStoredToken()).toBeNull();
    });

    it('should return null for empty token value', async () => {
      readFile.mockResolvedValue('//npm.pkg.github.com/:_authToken=\n');
      const { getStoredToken } = await import('./token-storage.js');
      expect(await getStoredToken()).toBeNull();
    });
  });

  describe('saveToken', () => {
    it('should write token and registry to new .npmrc', async () => {
      readFile.mockResolvedValue('');
      writeFile.mockResolvedValue(undefined);
      const { saveToken } = await import('./token-storage.js');
      await saveToken('ghp_new123');
      expect(writeFile).toHaveBeenCalledWith(
        NPMRC_PATH,
        expect.stringContaining('//npm.pkg.github.com/:_authToken=ghp_new123'),
        'utf8',
      );
      expect(writeFile).toHaveBeenCalledWith(
        NPMRC_PATH,
        expect.stringContaining('@stormreply:registry=https://npm.pkg.github.com'),
        'utf8',
      );
    });

    it('should update existing token line', async () => {
      readFile.mockResolvedValue(
        '//npm.pkg.github.com/:_authToken=ghp_old\n@stormreply:registry=https://npm.pkg.github.com\n',
      );
      writeFile.mockResolvedValue(undefined);
      const { saveToken } = await import('./token-storage.js');
      await saveToken('ghp_updated');
      const written = writeFile.mock.calls[0][1] as string;
      expect(written).toContain('//npm.pkg.github.com/:_authToken=ghp_updated');
      expect(written).not.toContain('ghp_old');
    });

    it('should preserve other .npmrc entries', async () => {
      readFile.mockResolvedValue('registry=https://registry.npmjs.org\nsome-setting=true\n');
      writeFile.mockResolvedValue(undefined);
      const { saveToken } = await import('./token-storage.js');
      await saveToken('ghp_test');
      const written = writeFile.mock.calls[0][1] as string;
      expect(written).toContain('registry=https://registry.npmjs.org');
      expect(written).toContain('some-setting=true');
    });
  });
});
