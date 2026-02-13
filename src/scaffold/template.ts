import { readFile, writeFile, readdir, rm } from 'node:fs/promises';
import { join, relative } from 'node:path';
import * as p from '@clack/prompts';

export interface Placeholder {
  key: string;
  prompt: string;
  transform?: string;
}

export interface TemplateConfig {
  placeholders: Placeholder[];
  files: string[];
  exclude: string[];
}

export async function readManifest(dir: string): Promise<TemplateConfig> {
  const configPath = join(dir, 'template.config.json');
  const raw = await readFile(configPath, 'utf8');
  return JSON.parse(raw) as TemplateConfig;
}

export async function collectValues(
  placeholders: Placeholder[],
  defaults: Record<string, string> = {},
): Promise<Record<string, string>> {
  const values: Record<string, string> = {};

  for (const ph of placeholders) {
    if (defaults[ph.key] !== undefined) {
      values[ph.key] = defaults[ph.key];
      continue;
    }

    const value = await p.text({
      message: ph.prompt,
      placeholder: ph.key,
    });

    if (p.isCancel(value) || !value) {
      throw new Error(`Value for "${ph.key}" is required. Aborting.`);
    }

    values[ph.key] = value;
  }

  return values;
}

function matchesPattern(filePath: string, pattern: string): boolean {
  if (pattern.startsWith('*')) {
    return filePath.endsWith(pattern.slice(1));
  }
  return filePath.includes(pattern);
}

function isBinaryBuffer(buffer: Buffer): boolean {
  for (let i = 0; i < Math.min(buffer.length, 8000); i++) {
    if (buffer[i] === 0) return true;
  }
  return false;
}

export async function applyReplacements(
  dir: string,
  config: TemplateConfig,
  values: Record<string, string>,
): Promise<void> {
  const s = p.spinner();
  s.start('Replacing placeholders');

  const allFiles = await readdir(dir, { recursive: true, withFileTypes: true });
  const files = allFiles.filter((f) => f.isFile()).map((f) => relative(dir, join(f.parentPath, f.name)));

  const matchingFiles = files.filter((f) => {
    const excluded = config.exclude.some((pattern) => matchesPattern(f, pattern));
    if (excluded) return false;
    return config.files.some((pattern) => matchesPattern(f, pattern));
  });

  let replacedCount = 0;

  for (const file of matchingFiles) {
    const filePath = join(dir, file);
    const buffer = await readFile(filePath);

    if (isBinaryBuffer(buffer)) continue;

    let content = buffer.toString('utf8');
    let changed = false;

    for (const [key, value] of Object.entries(values)) {
      const placeholder = `{{${key}}}`;
      if (content.includes(placeholder)) {
        content = content.replaceAll(placeholder, value);
        changed = true;
      }
    }

    if (changed) {
      await writeFile(filePath, content, 'utf8');
      replacedCount++;
    }
  }

  s.stop(`Replaced placeholders in ${replacedCount} file(s)`);

  await rm(join(dir, 'template.config.json'), { force: true });
}
