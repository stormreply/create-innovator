import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

vi.mock('@clack/prompts', () => ({
  note: vi.fn(),
  password: vi.fn(),
  isCancel: vi.fn(() => false),
  cancel: vi.fn(),
}));

describe('prompts', () => {
  beforeEach(async () => {
    vi.resetModules();
    const prompts = await import('@clack/prompts');
    (prompts.note as Mock).mockClear();
    (prompts.password as Mock).mockClear();
    (prompts.isCancel as Mock).mockReset().mockReturnValue(false);
    (prompts.cancel as Mock).mockClear();
  });

  it('should display instructions and return entered token', async () => {
    const { password } = await import('@clack/prompts');
    (password as Mock).mockResolvedValue('ghp_user_token');

    const { promptForToken } = await import('./prompts.js');
    const result = await promptForToken();

    const { note } = await import('@clack/prompts');
    expect(note).toHaveBeenCalledWith(
      expect.stringContaining('https://github.com/settings/tokens/new'),
      'GitHub Authentication',
    );
    expect(result).toBe('ghp_user_token');
  });

  it('should exit on cancel', async () => {
    const { password, isCancel } = await import('@clack/prompts');
    const cancelSymbol = Symbol('cancel');
    (password as Mock).mockResolvedValue(cancelSymbol);
    (isCancel as Mock).mockReturnValue(true);

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit');
    });

    const { promptForToken } = await import('./prompts.js');
    await expect(promptForToken()).rejects.toThrow('process.exit');
    expect(exitSpy).toHaveBeenCalledWith(0);
    exitSpy.mockRestore();
  });
});
