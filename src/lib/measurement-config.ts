import type { GarmentType, GarmentMeasurements } from '@/types'

export const GARMENT_LABELS: Record<GarmentType, string> = {
  blouse: 'Blouse',
  kurti: 'Kurti',
  salwar: 'Salwar',
  palazzo: 'Palazzo',
  lehenga: 'Lehenga',
  gown: 'Gown',
}

export const GARMENT_COLORS: Record<GarmentType, string> = {
  blouse: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900',
  kurti: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900',
  salwar: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/30 dark:text-sky-400 dark:border-sky-900',
  palazzo: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/30 dark:text-violet-400 dark:border-violet-900',
  lehenga: 'bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-950/30 dark:text-pink-400 dark:border-pink-900',
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
    { key: 'bust', label: 'Bust', type: 'number', placeholder: '36', unit: true },
    { key: 'waist', label: 'Waist', type: 'number', placeholder: '30', unit: true },
    { key: 'hip', label: 'Hip', type: 'number', placeholder: '38', unit: true },
    { key: 'shoulder', label: 'Shoulder', type: 'number', placeholder: '14', unit: true },
    { key: 'sleeveLength', label: 'Sleeve Length', type: 'number', placeholder: '6', unit: true },
    { key: 'armhole', label: 'Armhole', type: 'number', placeholder: '15', unit: true },
    { key: 'neckDepthFront', label: 'Neck Depth (Front)', type: 'number', placeholder: '5', unit: true },
    { key: 'neckDepthBack', label: 'Neck Depth (Back)', type: 'number', placeholder: '1', unit: true },
    { key: 'neckWidth', label: 'Neck Width', type: 'number', placeholder: '5', unit: true },
    { key: 'blouseLength', label: 'Blouse Length', type: 'number', placeholder: '15', unit: true },
    { key: 'neckShape', label: 'Neck Shape', type: 'text', placeholder: 'Round, V-neck, Square, Boat...' },
  ],
  kurti: [
    { key: 'bust', label: 'Bust', type: 'number', placeholder: '36', unit: true },
    { key: 'waist', label: 'Waist', type: 'number', placeholder: '30', unit: true },
    { key: 'hip', label: 'Hip', type: 'number', placeholder: '38', unit: true },
    { key: 'shoulder', label: 'Shoulder', type: 'number', placeholder: '14', unit: true },
    { key: 'sleeveLength', label: 'Sleeve Length', type: 'number', placeholder: '12', unit: true },
    { key: 'armhole', label: 'Armhole', type: 'number', placeholder: '15', unit: true },
    { key: 'neckDepthFront', label: 'Neck Depth', type: 'number', placeholder: '5', unit: true },
    { key: 'neckWidth', label: 'Neck Width', type: 'number', placeholder: '5', unit: true },
    { key: 'kurtiLength', label: 'Kurti Length', type: 'number', placeholder: '44', unit: true },
    { key: 'neckShape', label: 'Neck Shape', type: 'text', placeholder: 'Round, V-neck, Square...' },
  ],
  salwar: [
    { key: 'waist', label: 'Waist', type: 'number', placeholder: '30', unit: true },
    { key: 'hip', label: 'Hip', type: 'number', placeholder: '38', unit: true },
    { key: 'salwarLength', label: 'Salwar Length', type: 'number', placeholder: '38', unit: true },
    { key: 'bottomWidth', label: 'Bottom Width', type: 'number', placeholder: '10', unit: true },
    { key: 'kneeWidth', label: 'Knee Width', type: 'number', placeholder: '18', unit: true },
  ],
  palazzo: [
    { key: 'waist', label: 'Waist', type: 'number', placeholder: '30', unit: true },
    { key: 'hip', label: 'Hip', type: 'number', placeholder: '38', unit: true },
    { key: 'palazzoLength', label: 'Palazzo Length', type: 'number', placeholder: '40', unit: true },
    { key: 'bottomWidth', label: 'Bottom Width', type: 'number', placeholder: '24', unit: true },
  ],
  lehenga: [
    { key: 'waist', label: 'Waist', type: 'number', placeholder: '30', unit: true },
    { key: 'hip', label: 'Hip', type: 'number', placeholder: '38', unit: true },
    { key: 'lehengaLength', label: 'Lehenga Length', type: 'number', placeholder: '42', unit: true },
    { key: 'fallLength', label: 'Fall Length', type: 'number', placeholder: '4', unit: true },
  ],
  gown: [
    { key: 'bust', label: 'Bust', type: 'number', placeholder: '36', unit: true },
    { key: 'waist', label: 'Waist', type: 'number', placeholder: '30', unit: true },
    { key: 'hip', label: 'Hip', type: 'number', placeholder: '38', unit: true },
    { key: 'shoulder', label: 'Shoulder', type: 'number', placeholder: '14', unit: true },
    { key: 'sleeveLength', label: 'Sleeve Length', type: 'number', placeholder: '6', unit: true },
    { key: 'armhole', label: 'Armhole', type: 'number', placeholder: '15', unit: true },
    { key: 'neckDepthFront', label: 'Neck Depth', type: 'number', placeholder: '5', unit: true },
    { key: 'gownLength', label: 'Gown Length', type: 'number', placeholder: '58', unit: true },
    { key: 'neckShape', label: 'Neck Shape', type: 'text', placeholder: 'Round, V-neck, Halter...' },
  ],
}

export const GARMENT_TYPES: GarmentType[] = ['blouse', 'kurti', 'salwar', 'palazzo', 'lehenga', 'gown']

export function getPreviewFields(garmentType: GarmentType): FieldConfig[] {
  const allFields = GARMENT_FIELDS[garmentType]
  return allFields.filter(f => ['bust', 'waist', 'hip', 'blouseLength', 'kurtiLength', 'salwarLength', 'palazzoLength', 'lehengaLength', 'gownLength'].includes(f.key as string)).slice(0, 4)
}
