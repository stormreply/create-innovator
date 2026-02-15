import { capitalize, toCamelCase } from 'remeda';

export function toPascal(kebab: string): string {
  return capitalize(toCamelCase(kebab));
}
