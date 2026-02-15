import { readFile, writeFile, readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';
import * as p from '@clack/prompts';
import { toCamelCase, toTitleCase } from 'remeda';
import { TEMPLATE_REPO } from '../utils/constants.js';
import { toPascal } from '../utils/case.js';

function isBinaryBuffer(buffer: Buffer): boolean {
  for (let i = 0; i < Math.min(buffer.length, 8000); i++) {
    if (buffer[i] === 0) return true;
  }
  return false;
}

export async function replaceTemplateNames(dir: string, projectName: string): Promise<void> {
  const s = p.spinner();
  s.start('Replacing template names');

  const replacements = new Map<string, string>([
    [TEMPLATE_REPO, projectName],
    [toCamelCase(TEMPLATE_REPO), toCamelCase(projectName)],
    [toPascal(TEMPLATE_REPO), toPascal(projectName)],
    [toTitleCase(TEMPLATE_REPO), toTitleCase(projectName)],
  ]);

  const allFiles = await readdir(dir, { recursive: true, withFileTypes: true });
  const files = allFiles.filter((f) => f.isFile()).map((f) => relative(dir, join(f.parentPath, f.name)));

  let replacedCount = 0;

  for (const file of files) {
    const filePath = join(dir, file);
    const buffer = await readFile(filePath);

    if (isBinaryBuffer(buffer)) continue;

    let content = buffer.toString('utf8');
    let changed = false;

    for (const [from, to] of replacements) {
      if (content.includes(from)) {
        content = content.replaceAll(from, to);
        changed = true;
      }
    }

    if (changed) {
      await writeFile(filePath, content, 'utf8');
      replacedCount++;
    }
  }

  s.stop(`Replaced template names in ${replacedCount} file(s)`);
}
