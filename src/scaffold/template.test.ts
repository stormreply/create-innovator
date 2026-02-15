import { describe, it, expect, vi, beforeEach } from 'vitest';
import { vol } from 'memfs';

vi.mock('node:fs/promises', async () => {
  const memfs = await import('memfs');
  return memfs.fs.promises;
});

vi.mock('@clack/prompts', () => ({
  spinner: vi.fn(() => ({
    start: vi.fn(),
    stop: vi.fn(),
  })),
}));

describe('template', () => {
  beforeEach(() => {
    vol.reset();
  });

  describe('replaceTemplateNames', () => {
    it('should replace all 4 case variants in file contents', async () => {
      vol.fromJSON({
        '/project/package.json': '{ "name": "innovator-template" }',
        '/project/src/index.ts': 'export const app = "innovatorTemplate";',
        '/project/src/App.tsx': 'class InnovatorTemplate {}',
        '/project/README.md': '# Innovator Template',
      });

      const { replaceTemplateNames } = await import('./template.js');
      await replaceTemplateNames('/project', 'my-cool-app');

      expect(vol.readFileSync('/project/package.json', 'utf8')).toBe('{ "name": "my-cool-app" }');
      expect(vol.readFileSync('/project/src/index.ts', 'utf8')).toBe('export const app = "myCoolApp";');
      expect(vol.readFileSync('/project/src/App.tsx', 'utf8')).toBe('class MyCoolApp {}');
      expect(vol.readFileSync('/project/README.md', 'utf8')).toBe('# My Cool App');
    });

    it('should skip binary files', async () => {
      const binaryContent = Buffer.alloc(100);
      binaryContent[50] = 0; // null byte makes it binary
      binaryContent.write('innovator-template', 0);

      vol.fromJSON({
        '/project/image.png': binaryContent.toString('binary'),
        '/project/src/index.ts': 'innovator-template',
      });
      // Overwrite with actual buffer for binary detection
      vol.writeFileSync('/project/image.png', binaryContent);

      const { replaceTemplateNames } = await import('./template.js');
      await replaceTemplateNames('/project', 'my-app');

      expect(vol.readFileSync('/project/src/index.ts', 'utf8')).toBe('my-app');
      // Binary file should not be modified - it still contains the original buffer
      const result = vol.readFileSync('/project/image.png') as Buffer;
      expect(result[50]).toBe(0);
    });

    it('should leave files without template name untouched', async () => {
      const original = 'console.log("hello world")';
      vol.fromJSON({
        '/project/src/utils.ts': original,
      });

      const { replaceTemplateNames } = await import('./template.js');
      await replaceTemplateNames('/project', 'my-app');

      expect(vol.readFileSync('/project/src/utils.ts', 'utf8')).toBe(original);
    });

    it('should handle single-word project names (kebab-case)', async () => {
      vol.fromJSON({
        '/project/package.json': '{ "name": "innovator-template" }',
        '/project/README.md': '# Innovator Template',
      });

      const { replaceTemplateNames } = await import('./template.js');
      await replaceTemplateNames('/project', 'dashboard');

      expect(vol.readFileSync('/project/package.json', 'utf8')).toBe('{ "name": "dashboard" }');
      expect(vol.readFileSync('/project/README.md', 'utf8')).toBe('# Dashboard');
    });
  });

  describe('removeTemplateFiles', () => {
    it('should remove changelog.md, claude.md, and readme.md', async () => {
      vol.fromJSON({
        '/project/changelog.md': '# Changelog',
        '/project/claude.md': '# Claude',
        '/project/readme.md': '# Readme',
        '/project/package.json': '{}',
        '/project/src/index.ts': 'export default {}',
      });

      const { removeTemplateFiles } = await import('./template.js');
      await removeTemplateFiles('/project');

      expect(vol.existsSync('/project/changelog.md')).toBe(false);
      expect(vol.existsSync('/project/claude.md')).toBe(false);
      expect(vol.existsSync('/project/readme.md')).toBe(false);
      expect(vol.existsSync('/project/package.json')).toBe(true);
      expect(vol.existsSync('/project/src/index.ts')).toBe(true);
    });

    it('should handle case-insensitive file names', async () => {
      vol.fromJSON({
        '/project/CHANGELOG.md': '# Changelog',
        '/project/CLAUDE.md': '# Claude',
        '/project/README.md': '# Readme',
      });

      const { removeTemplateFiles } = await import('./template.js');
      await removeTemplateFiles('/project');

      expect(vol.existsSync('/project/CHANGELOG.md')).toBe(false);
      expect(vol.existsSync('/project/CLAUDE.md')).toBe(false);
      expect(vol.existsSync('/project/README.md')).toBe(false);
    });

    it('should not fail when no template files exist', async () => {
      vol.fromJSON({
        '/project/package.json': '{}',
      });

      const { removeTemplateFiles } = await import('./template.js');
      await expect(removeTemplateFiles('/project')).resolves.not.toThrow();
    });
  });
});
