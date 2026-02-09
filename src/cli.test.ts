import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

let capturedCommand: {
  meta: Record<string, unknown>;
  args: Record<string, unknown>;
  run: (ctx: { args: Record<string, unknown> }) => Promise<void>;
};

vi.mock('citty', () => ({
  defineCommand: (cmd: typeof capturedCommand) => {
    capturedCommand = cmd;
    return cmd;
  },
  runMain: vi.fn(),
}));

vi.mock('node:fs', () => ({
  readFileSync: vi.fn(() => JSON.stringify({ version: '1.2.3' })),
}));

vi.mock('@clack/prompts', () => ({
  intro: vi.fn(),
  text: vi.fn(),
  outro: vi.fn(),
  isCancel: vi.fn(() => false),
}));

describe('cli', () => {
  beforeEach(async () => {
    vi.resetModules();
    const { runMain } = await import('citty');
    (runMain as Mock).mockClear();
    const { intro, text, outro, isCancel } = await import('@clack/prompts');
    (intro as Mock).mockClear();
    (text as Mock).mockClear();
    (outro as Mock).mockClear();
    (isCancel as Mock).mockReset().mockReturnValue(false);
    await import('./cli.js');
  });

  it('should define command with correct meta', () => {
    expect(capturedCommand.meta).toEqual({
      name: 'create-innovator',
      version: '1.2.3',
      description: 'Create an Innovator app',
    });
  });

  it('should expose version from package.json for --version flag', () => {
    expect(capturedCommand.meta.version).toBe('1.2.3');
  });

  it('should define a name argument as optional string', () => {
    expect(capturedCommand.args).toEqual({
      name: {
        alias: ['n'],
        description: 'Project name',
        required: false,
        type: 'string',
      },
    });
  });

  it('should call runMain with the command', async () => {
    const { runMain } = await import('citty');
    expect(runMain).toHaveBeenCalledWith(capturedCommand);
  });

  it('should call intro', async () => {
    const { intro } = await import('@clack/prompts');
    await capturedCommand.run({ args: { name: 'test' } });
    expect(intro).toHaveBeenCalledWith('Create Innovator App (v1.2.3)');
  });

  it('should use provided project name without prompting', async () => {
    const { text, outro } = await import('@clack/prompts');
    await capturedCommand.run({ args: { name: 'cool-project' } });
    expect(text).not.toHaveBeenCalled();
    expect(outro).toHaveBeenCalledWith('Scaffolding cool-project...');
  });

  it('should prompt for project name when no name given', async () => {
    const { text, outro } = await import('@clack/prompts');
    (text as Mock).mockResolvedValue('my-innovator-app');
    await capturedCommand.run({ args: {} });
    expect(text).toHaveBeenCalledWith({
      message: 'Project name',
      defaultValue: 'my-innovator-app',
      placeholder: 'my-innovator-app',
    });
    expect(outro).toHaveBeenCalledWith('Scaffolding my-innovator-app...');
  });

  it('should exit on cancel', async () => {
    const { text, isCancel } = await import('@clack/prompts');
    const cancelSymbol = Symbol('cancel');
    (text as Mock).mockResolvedValue(cancelSymbol);
    (isCancel as Mock).mockReturnValue(true);
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit');
    });
    await expect(capturedCommand.run({ args: {} })).rejects.toThrow('process.exit');
    expect(exitSpy).toHaveBeenCalledWith(0);
    exitSpy.mockRestore();
  });
});
