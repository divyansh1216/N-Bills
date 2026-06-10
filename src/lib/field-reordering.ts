export function getHiddenFields(
  fields: any[],
  hiddenFields?: string[]
): any[] {
  if (!hiddenFields || hiddenFields.length === 0) return []
  return fields.filter(f => hiddenFields.includes(String(f.key)))
}
