export function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // spaces/symbols -> dash
    .replace(/^-+|-+$/g, '') // trim dashes
    .replace(/--+/g, '-'); // collapse
}
