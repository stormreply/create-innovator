import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockRequest = vi.fn();
const mockReposGet = vi.fn();
const mockListPackages = vi.fn();

vi.mock('@octokit/rest', () => ({
  Octokit: class {
    request = mockRequest;
    rest = {
      repos: { get: mockReposGet },
      packages: { listPackagesForOrganization: mockListPackages },
    };
  },
}));

vi.mock('@clack/prompts', () => ({
  spinner: vi.fn(() => ({
    start: vi.fn(),
    stop: vi.fn(),
  })),
}));

vi.mock('./token-storage.js', () => ({
  getStoredToken: vi.fn(),
  saveToken: vi.fn(),
}));

vi.mock('./prompts.js', () => ({
  promptForToken: vi.fn(),
}));

describe('github', () => {
  beforeEach(async () => {
    vi.resetModules();
    mockRequest.mockReset();
    mockReposGet.mockReset();
    mockListPackages.mockReset();
  });

  describe('validateToken', () => {
    it('should return valid result with scopes and username', async () => {
      mockRequest.mockResolvedValue({
        data: { login: 'testuser' },
        headers: { 'x-oauth-scopes': 'repo, read:packages' },
      });
      const { validateToken } = await import('./github.js');
      const result = await validateToken('ghp_test');
      expect(result).toEqual({
        valid: true,
        scopes: ['repo', 'read:packages'],
        missingScopes: [],
        username: 'testuser',
      });
    });

    it('should identify missing scopes', async () => {
      mockRequest.mockResolvedValue({
        data: { login: 'testuser' },
        headers: { 'x-oauth-scopes': 'repo' },
      });
      const { validateToken } = await import('./github.js');
      const result = await validateToken('ghp_test');
      expect(result.missingScopes).toEqual(['read:packages']);
    });

    it('should handle empty scopes header', async () => {
      mockRequest.mockResolvedValue({
        data: { login: 'testuser' },
        headers: { 'x-oauth-scopes': '' },
      });
      const { validateToken } = await import('./github.js');
      const result = await validateToken('ghp_test');
      expect(result.missingScopes).toEqual(['repo', 'read:packages']);
    });
  });

  describe('checkRepoAccess', () => {
    it('should return true when repo is accessible', async () => {
      mockReposGet.mockResolvedValue({ data: {} });
      const { checkRepoAccess } = await import('./github.js');
      expect(await checkRepoAccess('ghp_test')).toBe(true);
    });

    it('should return false when repo is not accessible', async () => {
      mockReposGet.mockRejectedValue(new Error('Not Found'));
      const { checkRepoAccess } = await import('./github.js');
      expect(await checkRepoAccess('ghp_test')).toBe(false);
    });
  });

  describe('checkRegistryAccess', () => {
    it('should return true when registry is accessible', async () => {
      mockListPackages.mockResolvedValue({ data: [] });
      const { checkRegistryAccess } = await import('./github.js');
      expect(await checkRegistryAccess('ghp_test')).toBe(true);
    });

    it('should return false when registry is not accessible', async () => {
      mockListPackages.mockRejectedValue(new Error('Forbidden'));
      const { checkRegistryAccess } = await import('./github.js');
      expect(await checkRegistryAccess('ghp_test')).toBe(false);
    });
  });

  describe('ensureGitHubAuth', () => {
    it('should use stored token and succeed', async () => {
      const { getStoredToken, saveToken } = await import('./token-storage.js');
      (getStoredToken as ReturnType<typeof vi.fn>).mockResolvedValue('ghp_stored');
      (saveToken as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      mockRequest.mockResolvedValue({
        data: { login: 'testuser' },
        headers: { 'x-oauth-scopes': 'repo, read:packages' },
      });
      mockReposGet.mockResolvedValue({ data: {} });
      mockListPackages.mockResolvedValue({ data: [] });

      const { ensureGitHubAuth } = await import('./github.js');
      const token = await ensureGitHubAuth();
      expect(token).toBe('ghp_stored');
      expect(saveToken).toHaveBeenCalledWith('ghp_stored');
    });

    it('should prompt for token when none stored', async () => {
      const { getStoredToken, saveToken } = await import('./token-storage.js');
      const { promptForToken } = await import('./prompts.js');
      (getStoredToken as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (promptForToken as ReturnType<typeof vi.fn>).mockResolvedValue('ghp_prompted');
      (saveToken as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      mockRequest.mockResolvedValue({
        data: { login: 'testuser' },
        headers: { 'x-oauth-scopes': 'repo, read:packages' },
      });
      mockReposGet.mockResolvedValue({ data: {} });
      mockListPackages.mockResolvedValue({ data: [] });

      const { ensureGitHubAuth } = await import('./github.js');
      const token = await ensureGitHubAuth();
      expect(token).toBe('ghp_prompted');
      expect(promptForToken).toHaveBeenCalled();
      expect(saveToken).toHaveBeenCalledWith('ghp_prompted');
    });

    it('should throw on missing scopes', async () => {
      const { getStoredToken } = await import('./token-storage.js');
      (getStoredToken as ReturnType<typeof vi.fn>).mockResolvedValue('ghp_limited');
      mockRequest.mockResolvedValue({
        data: { login: 'testuser' },
        headers: { 'x-oauth-scopes': 'repo' },
      });

      const { ensureGitHubAuth } = await import('./github.js');
      await expect(ensureGitHubAuth()).rejects.toThrow('missing required scopes: read:packages');
    });

    it('should throw when repo is not accessible', async () => {
      const { getStoredToken } = await import('./token-storage.js');
      (getStoredToken as ReturnType<typeof vi.fn>).mockResolvedValue('ghp_norepo');
      mockRequest.mockResolvedValue({
        data: { login: 'testuser' },
        headers: { 'x-oauth-scopes': 'repo, read:packages' },
      });
      mockReposGet.mockRejectedValue(new Error('Not Found'));

      const { ensureGitHubAuth } = await import('./github.js');
      await expect(ensureGitHubAuth()).rejects.toThrow('does not have access to stormreply/innovator-template');
    });

    it('should throw when registry is not accessible', async () => {
      const { getStoredToken } = await import('./token-storage.js');
      (getStoredToken as ReturnType<typeof vi.fn>).mockResolvedValue('ghp_noreg');
      mockRequest.mockResolvedValue({
        data: { login: 'testuser' },
        headers: { 'x-oauth-scopes': 'repo, read:packages' },
      });
      mockReposGet.mockResolvedValue({ data: {} });
      mockListPackages.mockRejectedValue(new Error('Forbidden'));

      const { ensureGitHubAuth } = await import('./github.js');
      await expect(ensureGitHubAuth()).rejects.toThrow('does not have access to the stormreply package registry');
    });
  });
});
