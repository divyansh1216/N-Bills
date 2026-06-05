import type { GarmentType, GarmentMeasurements } from '@/types'

export const GARMENT_LABELS: Record<GarmentType, string> = {
  blouse: 'Blouse',
  kurti_salwar: 'Kurti-Salwar',
  lehenga: 'Lehenga',
  lehenga_blouse: 'Lehenga-Blouse',
  gown: 'Gown',
}

export const GARMENT_COLORS: Record<GarmentType, string> = {
  blouse: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900',
  kurti_salwar: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/30 dark:text-teal-400 dark:border-teal-900',
  lehenga: 'bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-950/30 dark:text-pink-400 dark:border-pink-900',
  lehenga_blouse: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200 dark:bg-fuchsia-950/30 dark:text-fuchsia-400 dark:border-fuchsia-900',
  gown: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900',
}

export interface FieldConfig {
  key: keyof GarmentMeasurements
  label: string
  type: 'number' | 'text'
  placeholder?: string
  unit?: boolean
}

export const GARMENT_FIELDS: Record<GarmentType, FieldConfig[]> = {
  blouse: [
    { key: 'bust', label: 'Bust', type: 'number', unit: true },
    { key: 'waist', label: 'Waist', type: 'number', unit: true },
    { key: 'hip', label: 'Hip', type: 'number', unit: true },
    { key: 'shoulder', label: 'Shoulder', type: 'number', unit: true },
    { key: 'sleeveLength', label: 'Sleeve Length', type: 'number', unit: true },
    { key: 'armhole', label: 'Armhole', type: 'number', unit: true },
    { key: 'neckDepthFront', label: 'Neck Depth (Front)', type: 'number', unit: true },
    { key: 'neckDepthBack', label: 'Neck Depth (Back)', type: 'number', unit: true },
    { key: 'neckWidth', label: 'Neck Width', type: 'number', unit: true },
    { key: 'blouseLength', label: 'Blouse Length', type: 'number', unit: true },
    { key: 'apexPoint', label: 'Apex Point', type: 'number', unit: true },
    { key: 'sleeveRound', label: 'Sleeve Round', type: 'number', unit: true },
    { key: 'halfBody', label: 'Half Body', type: 'number', unit: true },
    { key: 'neckShape', label: 'Neck Shape', type: 'text', placeholder: 'Round, V-neck, Square, Boat...' },
    { key: 'totalItems', label: 'Total Items', type: 'number' },
  ],
  kurti_salwar: [
    // Kurti part
    { key: 'bust', label: 'Bust', type: 'number', unit: true },
    { key: 'waist', label: 'Waist', type: 'number', unit: true },
    { key: 'hip', label: 'Hip', type: 'number', unit: true },
    { key: 'shoulder', label: 'Shoulder', type: 'number', unit: true },
    { key: 'sleeveLength', label: 'Sleeve Length', type: 'number', unit: true },
    { key: 'armhole', label: 'Armhole', type: 'number', unit: true },
    { key: 'neckDepthFront', label: 'Neck Depth', type: 'number', unit: true },
    { key: 'neckWidth', label: 'Neck Width', type: 'number', unit: true },
    { key: 'kurtiLength', label: 'Kurti Length', type: 'number', unit: true },
    { key: 'neckShape', label: 'Neck Shape', type: 'text', placeholder: 'Round, V-neck, Square...' },
    // Salwar part
    { key: 'salwarLength', label: 'Salwar Length', type: 'number', unit: true },
    { key: 'bottomWidth', label: 'Bottom Width', type: 'number', unit: true },
    { key: 'kneeWidth', label: 'Knee Width', type: 'number', unit: true },
    { key: 'totalItems', label: 'Total Items', type: 'number' },
  ],
  lehenga: [
    { key: 'waist', label: 'Waist', type: 'number', unit: true },
    { key: 'hip', label: 'Hip', type: 'number', unit: true },
    { key: 'lehengaLength', label: 'Lehenga Length', type: 'number', unit: true },
    { key: 'fallLength', label: 'Fall Length', type: 'number', unit: true },
    { key: 'apexPoint', label: 'Apex Point', type: 'number', unit: true },
    { key: 'sleeveRound', label: 'Sleeve Round', type: 'number', unit: true },
    { key: 'halfBody', label: 'Half Body', type: 'number', unit: true },
    { key: 'totalItems', label: 'Total Items', type: 'number' },
  ],
  lehenga_blouse: [
    // Blouse part
    { key: 'bust', label: 'Bust', type: 'number', unit: true },
    { key: 'waist', label: 'Waist', type: 'number', unit: true },
    { key: 'hip', label: 'Hip', type: 'number', unit: true },
    { key: 'shoulder', label: 'Shoulder', type: 'number', unit: true },
    { key: 'sleeveLength', label: 'Sleeve Length', type: 'number', unit: true },
    { key: 'armhole', label: 'Armhole', type: 'number', unit: true },
    { key: 'neckDepthFront', label: 'Neck Depth (Front)', type: 'number', unit: true },
    { key: 'neckDepthBack', label: 'Neck Depth (Back)', type: 'number', unit: true },
    { key: 'neckWidth', label: 'Neck Width', type: 'number', unit: true },
    { key: 'blouseLength', label: 'Blouse Length', type: 'number', unit: true },
    { key: 'apexPoint', label: 'Apex Point', type: 'number', unit: true },
    { key: 'sleeveRound', label: 'Sleeve Round', type: 'number', unit: true },
    { key: 'halfBody', label: 'Half Body', type: 'number', unit: true },
    { key: 'neckShape', label: 'Neck Shape', type: 'text', placeholder: 'Round, V-neck, Square, Boat...' },
    // Lehenga part
    { key: 'lehengaLength', label: 'Lehenga Length', type: 'number', unit: true },
    { key: 'fallLength', label: 'Fall Length', type: 'number', unit: true },
    { key: 'totalItems', label: 'Total Items', type: 'number' },
  ],
  gown: [
    { key: 'bust', label: 'Bust', type: 'number', unit: true },
    { key: 'waist', label: 'Waist', type: 'number', unit: true },
    { key: 'hip', label: 'Hip', type: 'number', unit: true },
    { key: 'shoulder', label: 'Shoulder', type: 'number', unit: true },
    { key: 'sleeveLength', label: 'Sleeve Length', type: 'number', unit: true },
    { key: 'armhole', label: 'Armhole', type: 'number', unit: true },
    { key: 'neckDepthFront', label: 'Neck Depth', type: 'number', unit: true },
    { key: 'gownLength', label: 'Gown Length', type: 'number', unit: true },
    { key: 'apexPoint', label: 'Apex Point', type: 'number', unit: true },
    { key: 'sleeveRound', label: 'Sleeve Round', type: 'number', unit: true },
    { key: 'halfBody', label: 'Half Body', type: 'number', unit: true },
    { key: 'neckShape', label: 'Neck Shape', type: 'text', placeholder: 'Round, V-neck, Halter...' },
    { key: 'totalItems', label: 'Total Items', type: 'number' },
  ],
}

export const GARMENT_TYPES: GarmentType[] = ['blouse', 'kurti_salwar', 'lehenga', 'lehenga_blouse', 'gown']

export function getPreviewFields(garmentType: GarmentType): FieldConfig[] {
  const allFields = GARMENT_FIELDS[garmentType]
  return allFields.filter(f => ['bust', 'waist', 'hip', 'blouseLength', 'kurtiLength', 'salwarLength', 'lehengaLength', 'gownLength'].includes(f.key as string)).slice(0, 4)
}
