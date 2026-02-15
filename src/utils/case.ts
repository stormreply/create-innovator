import { capitalize, toCamelCase, toTitleCase } from 'remeda';

export { toCamelCase as toCamel, toTitleCase as toTitle };

export function toPascal(kebab: string): string {
  return capitalize(toCamelCase(kebab));
}
