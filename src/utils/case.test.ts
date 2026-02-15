import { describe, it, expect } from 'vitest';
import { toPascal } from './case.js';

describe('toPascal', () => {
  it('should convert single word', () => {
    expect(toPascal('project')).toBe('Project');
  });

  it('should convert multi-word kebab', () => {
    expect(toPascal('my-cool-project')).toBe('MyCoolProject');
  });

  it('should convert innovator-template', () => {
    expect(toPascal('innovator-template')).toBe('InnovatorTemplate');
  });
});
