import { readFile, writeFile, readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';
import * as p from '@clack/prompts';
import { TEMPLATE_REPO } from '../utils/constants.js';
import { toCamel, toPascal, toTitle } from '../utils/case.js';

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
    [toCamel(TEMPLATE_REPO), toCamel(projectName)],
    [toPascal(TEMPLATE_REPO), toPascal(projectName)],
    [toTitle(TEMPLATE_REPO), toTitle(projectName)],
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
