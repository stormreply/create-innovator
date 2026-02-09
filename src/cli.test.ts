import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

let capturedCommand: {
  meta: Record<string, unknown>;
  args: Record<string, unknown>;
  run: (ctx: { args: Record<string, unknown> }) => void;
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

describe('cli', () => {
  beforeEach(async () => {
    vi.resetModules();
    const { runMain } = await import('citty');
    (runMain as Mock).mockClear();
    await import('./cli.js');
  });

  it('should define command with correct meta', () => {
    expect(capturedCommand.meta).toEqual({
      name: 'create-innovator',
      version: '1.2.3',
      description: 'Create an Innovator app',
    });
  });

  it('should define a name argument as optional string', () => {
    expect(capturedCommand.args).toEqual({
      name: {
        type: 'string',
        required: false,
        description: 'Project name',
      },
    });
  });

  it('should call runMain with the command', async () => {
    const { runMain } = await import('citty');
    expect(runMain).toHaveBeenCalledWith(capturedCommand);
  });

  it('should use provided project name', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    capturedCommand.run({ args: { name: 'cool-project' } });
    expect(logSpy).toHaveBeenCalledWith('Scaffolding cool-project...');
    logSpy.mockRestore();
  });

  it('should default to my-innovator-app when no name given', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    capturedCommand.run({ args: {} });
    expect(logSpy).toHaveBeenCalledWith('Scaffolding my-innovator-app...');
    logSpy.mockRestore();
  });
});
