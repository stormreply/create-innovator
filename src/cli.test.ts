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
  log: { error: vi.fn() },
  isCancel: vi.fn(() => false),
}));

vi.mock('./auth/github.js', () => ({
  ensureGitHubAuth: vi.fn().mockResolvedValue('ghp_mock_token'),
}));

vi.mock('./scaffold/clone.js', () => ({
  ensureGhCli: vi.fn().mockResolvedValue(undefined),
  selectVersion: vi.fn().mockResolvedValue('release-v1.0.0'),
  cloneTemplate: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('./scaffold/template.js', () => ({
  replaceTemplateNames: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('./scaffold/setup.js', () => ({
  setupProject: vi.fn().mockResolvedValue(undefined),
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

  it('should define name and experimental arguments', () => {
    expect(capturedCommand.args).toEqual({
      name: {
        alias: ['n'],
        description: 'Project name',
        required: false,
        type: 'string',
      },
      experimental: {
        alias: ['e'],
        description: 'Include experimental (pre-release) versions',
        required: false,
        type: 'boolean',
        default: false,
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
    expect(outro).toHaveBeenCalledWith('Project cool-project is ready!');
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
    expect(outro).toHaveBeenCalledWith('Project my-innovator-app is ready!');
  });

  it('should call setupProject with project name after template replacement', async () => {
    const { setupProject } = await import('./scaffold/setup.js');
    (setupProject as Mock).mockClear();
    await capturedCommand.run({ args: { name: 'cool-project' } });
    expect(setupProject).toHaveBeenCalledWith('cool-project');
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
