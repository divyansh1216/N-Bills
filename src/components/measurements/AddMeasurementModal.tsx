'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Loader2, Image as ImageIcon, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { addMeasurement, updateMeasurement } from '@/firebase/firestore'
import { uploadMeasurementImage } from '@/lib/cloudinary'
import { GARMENT_FIELDS, GARMENT_LABELS, GARMENT_TYPES, GARMENT_COLORS } from '@/lib/measurement-config'
import type { CustomerMeasurement, GarmentType, GarmentMeasurements, MeasurementUnit } from '@/types'
import { cn } from '@/lib/utils'

interface Props {
  open: boolean
  onClose: () => void
  customerId: string
  customerName: string
  editItem?: CustomerMeasurement | null
  onSaved: (m: CustomerMeasurement) => void
}

type FieldValues = Partial<Record<keyof GarmentMeasurements, string>>

function toFieldValues(m: GarmentMeasurements): FieldValues {
  const out: FieldValues = {}
  for (const k of Object.keys(m) as (keyof GarmentMeasurements)[]) {
    const v = m[k]
    if (v !== undefined && v !== null) out[k] = String(v)
  }
  return out
}

function emptyFields(): FieldValues {
  return {}
}

export default function AddMeasurementModal({ open, onClose, customerId, customerName, editItem, onSaved }: Props) {
  const [label, setLabel] = useState('')
  const [garmentType, setGarmentType] = useState<GarmentType>('blouse')
  const [unit, setUnit] = useState<MeasurementUnit>('in')
  const [fieldValues, setFieldValues] = useState<FieldValues>(emptyFields())
  const [notes, setNotes] = useState('')
  const [patternFile, setPatternFile] = useState<File | null>(null)
  const [patternPreview, setPatternPreview] = useState('')
  const [designFiles, setDesignFiles] = useState<File[]>([])
  const [designPreviews, setDesignPreviews] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const patternRef = useRef<HTMLInputElement>(null)
  const designRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    if (editItem) {
      setLabel(editItem.label)
      setGarmentType(editItem.garmentType)
      setUnit(editItem.unit)
      setFieldValues(toFieldValues(editItem.measurements))
      setNotes(editItem.measurements.notes || '')
      setPatternPreview(editItem.measurements.patternImageUrl || '')
      setDesignPreviews(editItem.measurements.designImageUrls || [])
    } else {
      setLabel('')
      setGarmentType('blouse')
      setUnit('in')
      setFieldValues(emptyFields())
      setNotes('')
      setPatternPreview('')
      setDesignPreviews([])
    }
    setPatternFile(null)
    setDesignFiles([])
    setUploadProgress(0)
  }, [open, editItem])

  function handlePatternChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPatternFile(file)
    setPatternPreview(URL.createObjectURL(file))
  }

  function handleDesignChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []).slice(0, 4 - designPreviews.length - designFiles.length)
    if (!files.length) return
    setDesignFiles(prev => [...prev, ...files])
    setDesignPreviews(prev => [...prev, ...files.map(f => URL.createObjectURL(f))])
    e.target.value = ''
  }

  function removeDesign(index: number) {
    setDesignPreviews(prev => prev.filter((_, i) => i !== index))
    setDesignFiles(prev => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!label.trim()) { toast.error('Enter a label for this measurement'); return }

    setLoading(true)
    setUploadProgress(0)

    try {
      const fields = GARMENT_FIELDS[garmentType]
      const measurements: GarmentMeasurements = {}

      for (const field of fields) {
        const val = fieldValues[field.key]
        if (val !== undefined && val !== '') {
          if (field.type === 'number') {
            (measurements as any)[field.key] = Number(val)
          } else {
            (measurements as any)[field.key] = val
          }
        }
      }
      if (notes.trim()) measurements.notes = notes.trim()

      const totalUploads = (patternFile ? 1 : 0) + designFiles.length
      let done = 0

      // Determine the real document ID before uploading images
      let docId: string
      let isNew = !editItem

      if (editItem) {
        docId = editItem.id
      } else {
        // Create the doc first so we have a real ID for the storage path
        const ref = await addMeasurement({
          customerId,
          customerName,
          label: label.trim(),
          garmentType,
          unit,
          measurements,
        })
        docId = ref.id
      }

      let patternImageUrl = editItem?.measurements.patternImageUrl || ''
      let designImageUrls = [...(editItem?.measurements.designImageUrls || [])]

      if (patternFile) {
        patternImageUrl = await uploadMeasurementImage(
          patternFile, customerId, docId, 'pattern',
          p => setUploadProgress(Math.round(((done + p / 100) / totalUploads) * 100))
        )
        done++
        setUploadProgress(Math.round((done / totalUploads) * 100))
      }

      for (let i = 0; i < designFiles.length; i++) {
        const file = designFiles[i]
        const url = await uploadMeasurementImage(
          file, customerId, docId, `design_${i}_${Date.now()}`,
          p => setUploadProgress(Math.round(((done + p / 100) / totalUploads) * 100))
        )
        designImageUrls = [...designImageUrls, url]
        done++
        setUploadProgress(Math.round((done / totalUploads) * 100))
      }

      if (patternImageUrl) measurements.patternImageUrl = patternImageUrl
      if (designImageUrls.length) measurements.designImageUrls = designImageUrls

      // Update the doc with final image URLs (always update to set images)
      await updateMeasurement(docId, {
        label: label.trim(),
        garmentType,
        unit,
        measurements,
      })

      if (!isNew) {
        // editItem path — return updated record
        const updated: CustomerMeasurement = {
          ...editItem!,
          label: label.trim(),
          garmentType,
          unit,
          measurements,
          updatedAt: new Date().toISOString(),
        }
        toast.success('Measurements updated')
        onSaved(updated)
      } else {
        const created: CustomerMeasurement = {
          id: docId,
          customerId,
          customerName,
          label: label.trim(),
          garmentType,
          unit,
          measurements,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        toast.success('Measurements saved')
        onSaved(created)
      }
      onClose()
    } catch (err: any) {
      console.error(err)
      toast.error(err?.message || 'Failed to save measurements')
    } finally {
      setLoading(false)
      setUploadProgress(0)
    }
  }

  const inputClass = 'w-full px-3 py-2 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all'
  const fields = GARMENT_FIELDS[garmentType]

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="relative bg-card border border-border rounded-t-2xl sm:rounded-2xl w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto luxury-shadow-lg scrollbar-thin"
          >
            {/* Header */}
            <div className="sticky top-0 bg-card z-10 px-6 py-4 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-foreground">
                  {editItem ? 'Edit Measurements' : 'Add Measurements'}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">{customerName}</p>
              </div>
              <button onClick={onClose} className="p-2 text-muted-foreground hover:text-foreground rounded-xl hover:bg-muted transition-colors">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Label + Unit row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Label *</label>
                  <input
                    required
                    value={label}
                    onChange={e => setLabel(e.target.value)}
                    placeholder="e.g. Wedding 2024, Casual"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Unit</label>
                  <div className="flex gap-1">
                    {(['in', 'cm'] as const).map(u => (
                      <button
                        key={u}
                        type="button"
                        onClick={() => setUnit(u)}
                        className={cn(
                          'flex-1 py-2 rounded-xl text-sm font-medium transition-colors border',
                          unit === u
                            ? 'bg-foreground text-background border-foreground'
                            : 'bg-background border-border text-muted-foreground hover:text-foreground'
                        )}
                      >
                        {u === 'in' ? 'Inches' : 'CM'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Garment type */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">Garment Type</label>
                <div className="flex flex-wrap gap-2">
                  {GARMENT_TYPES.map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => { setGarmentType(type); setFieldValues(emptyFields()) }}
                      className={cn(
                        'px-3 py-1.5 rounded-xl text-xs font-medium border transition-all',
                        garmentType === type
                          ? 'bg-foreground text-background border-foreground'
                          : 'bg-background border-border text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {GARMENT_LABELS[type]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic measurement fields */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xs font-medium text-muted-foreground">
                    {GARMENT_LABELS[garmentType]} Measurements
                  </label>
                  <span className="text-xs text-muted-foreground">{unit === 'in' ? 'inches' : 'centimetres'}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {fields.filter(f => f.type === 'number').map(field => (
                    <div key={String(field.key)}>
                      <label className="text-xs text-muted-foreground mb-1 block">{field.label}</label>
                      <div className="relative">
                        <input
                          type="number"
                          min={0}
                          step={0.5}
                          value={fieldValues[field.key] ?? ''}
                          onChange={e => setFieldValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                          placeholder={field.placeholder}
                          className={cn(inputClass, 'pr-8')}
                        />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                          {unit}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Text fields (neck shape) */}
                {fields.filter(f => f.type === 'text').map(field => (
                  <div key={String(field.key)} className="mt-3">
                    <label className="text-xs text-muted-foreground mb-1 block">{field.label}</label>
                    <input
                      type="text"
                      value={fieldValues[field.key] ?? ''}
                      onChange={e => setFieldValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                      placeholder={field.placeholder}
                      className={inputClass}
                    />
                  </div>
                ))}
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Special Stitching Notes</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Any special instructions, fitting notes, fabric preferences..."
                  rows={3}
                  className={cn(inputClass, 'resize-none')}
                />
              </div>

              {/* Blouse pattern upload */}
              {garmentType === 'blouse' && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-2 block">Blouse Pattern</label>
                  <div
                    onClick={() => patternRef.current?.click()}
                    className={cn(
                      'h-28 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-foreground/30 transition-colors flex items-center justify-center overflow-hidden',
                      patternPreview ? 'p-0' : 'gap-2 flex-col'
                    )}
                  >
                    {patternPreview ? (
                      <div className="relative w-full h-full group">
                        <img src={patternPreview} alt="Pattern" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <p className="text-white text-xs font-medium">Click to change</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <ImageIcon size={20} className="text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">Upload blouse pattern</p>
                      </>
                    )}
                  </div>
                  <input ref={patternRef} type="file" accept="image/*" onChange={handlePatternChange} className="hidden" />
                </div>
              )}

              {/* Design reference images */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-muted-foreground">Design Reference Images</label>
                  <span className="text-xs text-muted-foreground">{designPreviews.length}/4</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {designPreviews.map((src, i) => (
                    <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-border group">
                      <img src={src} alt={`Design ${i + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeDesign(i)}
                        className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  ))}
                  {designPreviews.length < 4 && (
                    <button
                      type="button"
                      onClick={() => designRef.current?.click()}
                      className="aspect-square rounded-xl border-2 border-dashed border-border hover:border-foreground/30 flex items-center justify-center transition-colors"
                    >
                      <Plus size={16} className="text-muted-foreground" />
                    </button>
                  )}
                </div>
                <input ref={designRef} type="file" accept="image/*" multiple onChange={handleDesignChange} className="hidden" />
              </div>

              {/* Upload progress */}
              {uploadProgress > 0 && uploadProgress < 100 && (
                <div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Uploading images...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-foreground rounded-full"
                      animate={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 border border-border rounded-xl text-sm font-medium hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-60"
                >
                  {loading && <Loader2 size={14} className="animate-spin" />}
                  {editItem ? 'Update' : 'Save Measurements'}
                </motion.button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
