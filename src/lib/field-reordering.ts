export function getReorderedFieldOrder(
  draggedIndex: number,
  targetIndex: number,
  currentOrder: string[]
): string[] {
  const updated = [...currentOrder]
  const [moved] = updated.splice(draggedIndex, 1)
  updated.splice(targetIndex, 0, moved)
  return updated
}

export function sortFieldsByOrder(
  fields: any[],
  savedOrder?: string[],
  hiddenFields?: string[]
): any[] {
  // Filter out hidden fields first
  const visibleFields = fields.filter(f => !(hiddenFields?.includes(String(f.key))))

  // If no saved order, return visible fields in original order
  if (!savedOrder || savedOrder.length === 0) return visibleFields

  // Create a map for quick lookup
  const orderMap = new Map(savedOrder.map((key, idx) => [String(key), idx]))

  // Sort visible fields based on savedOrder, fields not in savedOrder go to end
  return [...visibleFields].sort((a, b) => {
    const aIdx = orderMap.get(String(a.key)) ?? Infinity
    const bIdx = orderMap.get(String(b.key)) ?? Infinity
    return aIdx - bIdx
  })
}

export function getHiddenFields(
  fields: any[],
  hiddenFields?: string[]
): any[] {
  if (!hiddenFields || hiddenFields.length === 0) return []
  return fields.filter(f => hiddenFields.includes(String(f.key)))
}
