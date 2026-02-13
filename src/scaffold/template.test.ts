import { describe, it, expect, vi, beforeEach } from 'vitest';
import { vol } from 'memfs';

vi.mock('node:fs/promises', async () => {
  const memfs = await import('memfs');
  return memfs.fs.promises;
});

vi.mock('@clack/prompts', () => ({
  text: vi.fn(),
  isCancel: vi.fn(() => false),
  spinner: vi.fn(() => ({
    start: vi.fn(),
    stop: vi.fn(),
  })),
}));

describe('template', () => {
  beforeEach(() => {
    vol.reset();
  });

  describe('readManifest', () => {
    it('should read and parse template.config.json', async () => {
      const config = {
        placeholders: [{ key: 'PROJECT_NAME', prompt: 'Project name' }],
        files: ['*.ts'],
        exclude: ['node_modules'],
      };
      vol.fromJSON({ '/project/template.config.json': JSON.stringify(config) });

      const { readManifest } = await import('./template.js');
      const result = await readManifest('/project');
      expect(result).toEqual(config);
    });

    it('should throw when template.config.json is missing', async () => {
      vol.fromJSON({});
      const { readManifest } = await import('./template.js');
      await expect(readManifest('/project')).rejects.toThrow();
    });
  });

  describe('collectValues', () => {
    it('should use defaults without prompting', async () => {
      const placeholders = [{ key: 'PROJECT_NAME', prompt: 'Project name' }];
      const { collectValues } = await import('./template.js');
      const result = await collectValues(placeholders, { PROJECT_NAME: 'my-app' });
      expect(result).toEqual({ PROJECT_NAME: 'my-app' });

      const { text } = await import('@clack/prompts');
      expect(text).not.toHaveBeenCalled();
    });

    it('should prompt for values not in defaults', async () => {
      const { text } = await import('@clack/prompts');
      (text as ReturnType<typeof vi.fn>).mockResolvedValue('Storm Reply');

      const placeholders = [{ key: 'ORG_NAME', prompt: 'Organization name' }];
      const { collectValues } = await import('./template.js');
      const result = await collectValues(placeholders);
      expect(result).toEqual({ ORG_NAME: 'Storm Reply' });
    });

    it('should throw when user cancels', async () => {
      const { text, isCancel } = await import('@clack/prompts');
      (text as ReturnType<typeof vi.fn>).mockResolvedValue(Symbol('cancel'));
      (isCancel as ReturnType<typeof vi.fn>).mockReturnValue(true);

      const placeholders = [{ key: 'NAME', prompt: 'Name' }];
      const { collectValues } = await import('./template.js');
      await expect(collectValues(placeholders)).rejects.toThrow('Value for "NAME" is required');
    });
  });

  describe('applyReplacements', () => {
    it('should replace placeholders in matching files', async () => {
      vol.fromJSON({
        '/project/src/index.ts': 'console.log("{{PROJECT_NAME}}")',
        '/project/template.config.json': '{}',
      });

      const config = {
        placeholders: [],
        files: ['*.ts'],
        exclude: ['node_modules'],
      };

      const { applyReplacements } = await import('./template.js');
      await applyReplacements('/project', config, { PROJECT_NAME: 'cool-app' });

      const content = vol.readFileSync('/project/src/index.ts', 'utf8');
      expect(content).toBe('console.log("cool-app")');
    });

    it('should remove template.config.json after replacement', async () => {
      vol.fromJSON({
        '/project/readme.md': '# {{PROJECT_NAME}}',
        '/project/template.config.json': '{}',
      });

      const config = {
        placeholders: [],
        files: ['*.md'],
        exclude: [],
      };

      const { applyReplacements } = await import('./template.js');
      await applyReplacements('/project', config, { PROJECT_NAME: 'my-app' });

      expect(() => vol.readFileSync('/project/template.config.json')).toThrow();
    });

    it('should skip excluded files', async () => {
      vol.fromJSON({
        '/project/node_modules/pkg/index.ts': '{{PROJECT_NAME}}',
        '/project/src/index.ts': '{{PROJECT_NAME}}',
        '/project/template.config.json': '{}',
      });

      const config = {
        placeholders: [],
        files: ['*.ts'],
        exclude: ['node_modules'],
      };

      const { applyReplacements } = await import('./template.js');
      await applyReplacements('/project', config, { PROJECT_NAME: 'app' });

      expect(vol.readFileSync('/project/node_modules/pkg/index.ts', 'utf8')).toBe('{{PROJECT_NAME}}');
      expect(vol.readFileSync('/project/src/index.ts', 'utf8')).toBe('app');
    });
  });
});
