import { describe, it, expect } from 'vitest';
import { toCamel, toPascal, toTitle } from './case.js';

describe('case conversions', () => {
  describe('toCamel', () => {
    it('should convert single word', () => {
      expect(toCamel('project')).toBe('project');
    });

    it('should convert multi-word kebab', () => {
      expect(toCamel('my-cool-project')).toBe('myCoolProject');
    });

    it('should convert innovator-template', () => {
      expect(toCamel('innovator-template')).toBe('innovatorTemplate');
    });
  });

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

  describe('toTitle', () => {
    it('should convert single word', () => {
      expect(toTitle('project')).toBe('Project');
    });

    it('should convert multi-word kebab', () => {
      expect(toTitle('my-cool-project')).toBe('My Cool Project');
    });

    it('should convert innovator-template', () => {
      expect(toTitle('innovator-template')).toBe('Innovator Template');
    });
  });
});
