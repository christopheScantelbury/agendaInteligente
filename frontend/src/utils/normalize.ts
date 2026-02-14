export function normalizeForSearch(value: string): string {
  if (!value || typeof value !== 'string') return ''
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
}

export function matchSearch(text: string, searchTerm: string): boolean {
  if (!searchTerm.trim()) return true
  return normalizeForSearch(text).includes(normalizeForSearch(searchTerm))
}
