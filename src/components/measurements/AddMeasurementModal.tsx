'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Loader2, Plus, Trash2, Camera } from 'lucide-react'
import { toast } from 'sonner'
import { addMeasurement, updateMeasurement } from '@/firebase/firestore'
import { uploadMeasurementImage } from '@/lib/cloudinary'
import { GARMENT_FIELDS, GARMENT_LABELS, GARMENT_TYPES } from '@/lib/measurement-config'
import { getHiddenFields } from '@/lib/field-reordering'
import type { CustomerMeasurement, GarmentType, GarmentMeasurements } from '@/types'
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
  const unit = 'in' as const
  const [fieldValues, setFieldValues] = useState<FieldValues>(emptyFields())
  const [notes, setNotes] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [designFiles, setDesignFiles] = useState<File[]>([])
  const [designPreviews, setDesignPreviews] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [hiddenFields, setHiddenFields] = useState<string[]>([])
  const [showAddFields, setShowAddFields] = useState(false)
  const [editingLabel, setEditingLabel] = useState<string | null>(null)
  const [fieldLabels, setFieldLabels] = useState<Record<string, string>>({})

  const editingInputRef = useRef<HTMLInputElement>(null)
  const designRef = useRef<HTMLInputElement>(null)
  const designCameraRef = useRef<HTMLInputElement>(null)
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    if (editItem) {
      setLabel(editItem.label)
      setGarmentType(editItem.garmentType)
      setFieldValues(toFieldValues(editItem.measurements))
      setNotes(editItem.measurements.notes || '')
      setDueDate(editItem.dueDate || '')
      setDesignPreviews(editItem.measurements.designImageUrls || [])
      // Load saved hidden fields
      const savedHidden = editItem.measurements.hiddenFields || []
      setHiddenFields(savedHidden)
    } else {
      setLabel('')
      setGarmentType('blouse')
      setFieldValues(emptyFields())
      setNotes('')
      setDueDate('')
      setDesignPreviews([])
      // For new measurement, hide ALL fields by default (user must add them)
      const allNumericFieldKeys = GARMENT_FIELDS['blouse']
        .filter(f => f.type === 'number')
        .map(f => String(f.key))
      setHiddenFields(allNumericFieldKeys)
    }
    setDesignFiles([])
    setUploadProgress(0)
    setShowAddFields(false)
    setEditingLabel(null)
    setFieldLabels({})
  }, [open, editItem])

  // Update hidden fields when garment type changes (for new measurements)
  useEffect(() => {
    if (!open || editItem) return
    // Hide all fields for new measurement when garment type changes
    const allNumericFieldKeys = GARMENT_FIELDS[garmentType]
      .filter(f => f.type === 'number')
      .map(f => String(f.key))
    setHiddenFields(allNumericFieldKeys)
  }, [garmentType, open, editItem])

  const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

  function handleDesignChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []).slice(0, 4 - designPreviews.length - designFiles.length)
    if (!files.length) return
    const invalidFiles = files.filter(f => f.size > MAX_FILE_SIZE)
    if (invalidFiles.length > 0) {
      toast.error(`${invalidFiles.length} file(s) exceed 10MB limit`)
      e.target.value = ''
      return
    }
    setDesignFiles(prev => [...prev, ...files])
    setDesignPreviews(prev => [...prev, ...files.map(f => URL.createObjectURL(f))])
    e.target.value = ''
  }

  function removeDesign(index: number) {
    setDesignPreviews(prev => prev.filter((_, i) => i !== index))
    setDesignFiles(prev => prev.filter((_, i) => i !== index))
  }

  function hideField(fieldKey: string) {
    setHiddenFields(prev => [...prev, fieldKey])
  }

  function showField(fieldKey: string) {
    setHiddenFields(prev => prev.filter(k => k !== fieldKey))
  }

  function startEditingLabel(fieldKey: string, currentLabel: string) {
    setEditingLabel(fieldKey)
    setFieldLabels(prev => ({ ...prev, [fieldKey]: currentLabel }))
    setTimeout(() => editingInputRef.current?.focus(), 0)
  }

  function saveEditingLabel(fieldKey: string) {
    setEditingLabel(null)
  }

  function getFieldLabel(field: any): string {
    return fieldLabels[String(field.key)] ?? field.label
  }

  function handleLabelKeyDown(e: React.KeyboardEvent, fieldKey: string) {
    if (e.key === 'Enter') {
      saveEditingLabel(fieldKey)
    } else if (e.key === 'Escape') {
      setEditingLabel(null)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!label.trim()) { toast.error('Enter a label for this measurement'); return }
    if (!dueDate) { toast.error('Select a due date'); return }

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
      // Save hidden fields if any exist
      if (hiddenFields.length > 0) {
        measurements.hiddenFields = hiddenFields
      }

      const totalUploads = designFiles.length
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
          ...(dueDate ? { dueDate } : {}),
        })
        docId = ref.id
      }

      let designImageUrls = [...(editItem?.measurements.designImageUrls || [])]

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

      if (designImageUrls.length) measurements.designImageUrls = designImageUrls

      // Update the doc with final image URLs (always update to set images)
      await updateMeasurement(docId, {
        label: label.trim(),
        garmentType,
        unit,
        measurements,
        ...(dueDate ? { dueDate } : { dueDate: '' }),
      })

      if (!isNew) {
        // editItem path — return updated record
        const updated: CustomerMeasurement = {
          ...editItem!,
          label: label.trim(),
          garmentType,
          unit,
          measurements,
          dueDate: dueDate || undefined,
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
          dueDate: dueDate || undefined,
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
        <div key="measurement-modal" className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />
          <motion.div
            key="modal-content"
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
              {/* Garment Type + Due Date row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Label *</label>
                  <select
                    required
                    value={garmentType}
                    onChange={e => {
                      const type = e.target.value as GarmentType
                      setGarmentType(type)
                      setLabel(GARMENT_LABELS[type])
                      setFieldValues(emptyFields())
                    }}
                    className={inputClass}
                  >
                    <option key="placeholder" value="">Select Garment Type</option>
                    {GARMENT_TYPES.map(type => (
                      <option key={type} value={type}>
                        {GARMENT_LABELS[type]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Due Date *</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                    required
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Dynamic measurement fields */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xs font-medium text-muted-foreground">
                    {GARMENT_LABELS[garmentType]} Measurements
                  </label>
                  <span className="text-xs text-muted-foreground">inches</span>
                </div>

                {/* Add Fields Section - Prominent Display */}
                {getHiddenFields(fields.filter(f => f.type === 'number'), hiddenFields).length > 0 && (
                  <div className="mb-4 p-4 rounded-xl bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-foreground">Select Measurement Fields</p>
                        <p className="text-xs text-muted-foreground">Choose which fields you want to measure for this garment</p>
                      </div>
                      <div className="text-right">
                        <span className="inline-block px-2 py-1 rounded-lg bg-primary/20 text-primary text-xs font-medium">
                          {getHiddenFields(fields.filter(f => f.type === 'number'), hiddenFields).length} available
                        </span>
                      </div>
                    </div>

                    <AnimatePresence>
                      {!showAddFields && (
                        <motion.button
                          type="button"
                          onClick={() => setShowAddFields(true)}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground rounded-lg font-medium text-xs hover:opacity-90 transition-all"
                        >
                          <Plus size={14} />
                          Add Fields
                        </motion.button>
                      )}
                    </AnimatePresence>

                    <AnimatePresence>
                      {showAddFields && (
                        <motion.div
                          key="add-fields-list"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="grid grid-cols-2 sm:grid-cols-3 gap-2 overflow-hidden"
                        >
                          {getHiddenFields(fields.filter(f => f.type === 'number'), hiddenFields).map(field => (
                            <motion.button
                              key={String(field.key)}
                              type="button"
                              onClick={() => showField(String(field.key))}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              className="px-3 py-2 rounded-lg bg-background border border-primary/40 hover:border-primary hover:bg-primary/5 text-foreground text-xs font-medium transition-all duration-200"
                            >
                              <Plus size={12} className="inline mr-1" />
                              {field.label}
                            </motion.button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {showAddFields && (
                      <button
                        type="button"
                        onClick={() => setShowAddFields(false)}
                        className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
                      >
                        Hide fields
                      </button>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {fields.filter(f => f.type === 'number' && !hiddenFields.includes(String(f.key))).map(field => (
                    <div
                      key={String(field.key)}
                      className="p-3 rounded-xl border border-border bg-background hover:border-muted-foreground transition-colors group"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {editingLabel === String(field.key) ? (
                          <input
                            ref={editingInputRef}
                            type="text"
                            value={fieldLabels[String(field.key)] ?? field.label}
                            onChange={e => setFieldLabels(prev => ({ ...prev, [String(field.key)]: e.target.value }))}
                            onBlur={() => saveEditingLabel(String(field.key))}
                            onKeyDown={e => handleLabelKeyDown(e, String(field.key))}
                            className="text-xs bg-background border border-ring rounded px-2 py-1 flex-1 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                          />
                        ) : (
                          <label
                            onClick={() => startEditingLabel(String(field.key), field.label)}
                            className="text-xs text-muted-foreground select-none flex-1 cursor-text hover:text-foreground transition-colors"
                            title="Click to edit"
                          >
                            {getFieldLabel(field)}
                          </label>
                        )}
                        <button
                          type="button"
                          onClick={() => hideField(String(field.key))}
                          className="text-muted-foreground hover:text-destructive transition-colors p-1 -mr-1 opacity-0 group-hover:opacity-100"
                          title="Hide field"
                        >
                          <X size={14} />
                        </button>
                      </div>
                      <div className="relative">
                        <input
                          type="number"
                          min={0}
                          step="any"
                          value={fieldValues[field.key as keyof GarmentMeasurements] ?? ''}
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
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Stitching Notes (Blouse Color , Blouse Piece , Pattern Name) </label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Any special instructions, fitting notes, fabric preferences..."
                  rows={3}
                  className={cn(inputClass, 'resize-none')}
                />
              </div>

              {/* Design reference images */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-muted-foreground">Design Reference Images</label>
                  <span className="text-xs text-muted-foreground">{designPreviews.length}/4</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {designPreviews.map((src, i) => (
                    <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-border group">
                      <img
                        src={src}
                        alt={`Design ${i + 1}`}
                        className="w-full h-full object-cover cursor-pointer"
                        onClick={() => setLightboxSrc(src)}
                      />
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
                      onClick={() => designCameraRef.current?.click()}
                      className="aspect-square rounded-xl border-2 border-dashed border-border hover:border-foreground/30 flex flex-col items-center justify-center gap-1 transition-colors"
                    >
                      <Camera size={14} className="text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground">Camera</span>
                    </button>
                  )}
                  {designPreviews.length < 4 && (
                    <button
                      type="button"
                      onClick={() => designRef.current?.click()}
                      className="aspect-square rounded-xl border-2 border-dashed border-border hover:border-foreground/30 flex flex-col items-center justify-center gap-1 transition-colors"
                    >
                      <Plus size={14} className="text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground">Gallery</span>
                    </button>
                  )}
                </div>
                <input ref={designCameraRef} type="file" accept="image/*" capture="environment" onChange={handleDesignChange} className="hidden" />
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
      {/* Lightbox */}
      <AnimatePresence>
        {lightboxSrc && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90"
            onClick={() => setLightboxSrc(null)}
          >
            <button
              className="absolute top-4 right-4 w-8 h-8 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors"
              onClick={() => setLightboxSrc(null)}
            >
              <X size={16} />
            </button>
            <motion.img
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              src={lightboxSrc}
              alt="Preview"
              className="max-w-full max-h-full object-contain rounded-xl"
              onClick={e => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </AnimatePresence>
  )
}
