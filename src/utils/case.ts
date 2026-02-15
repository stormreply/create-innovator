export function toCamel(kebab: string): string {
  return kebab.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

export function toPascal(kebab: string): string {
  const camel = toCamel(kebab);
  return camel.charAt(0).toUpperCase() + camel.slice(1);
}

export function toTitle(kebab: string): string {
  return kebab
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
