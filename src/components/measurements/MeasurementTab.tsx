'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Search, Download, Edit2, Trash2, Ruler, ChevronRight, Eye, X, CalendarClock } from 'lucide-react'
import { toast } from 'sonner'
import { getCustomerMeasurements, deleteMeasurement } from '@/firebase/firestore'
import { generateMeasurementPDF } from '@/lib/measurement-pdf'
import { GARMENT_LABELS, GARMENT_COLORS, GARMENT_TYPES, GARMENT_FIELDS, getPreviewFields } from '@/lib/measurement-config'
import { useShopSettings } from '@/contexts/ShopSettingsContext'
import AddMeasurementModal from './AddMeasurementModal'
import type { CustomerMeasurement, GarmentType } from '@/types'
import { cn } from '@/lib/utils'

interface Props {
  customerId: string
  customerName: string
}

function safeDate(val: any): string {
  if (!val) return ''
  if (typeof val === 'string') return val
  if (val?.seconds) return new Date(val.seconds * 1000).toISOString()
  return ''
}

function fmtDate(val: any): string {
  const iso = safeDate(val)
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function MeasurementTab({ customerId, customerName }: Props) {
  const { name: shopName, phone: shopPhone } = useShopSettings()
  const [measurements, setMeasurements] = useState<CustomerMeasurement[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<GarmentType | 'all'>('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editItem, setEditItem] = useState<CustomerMeasurement | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [pdfLoading, setPdfLoading] = useState<string | null>(null)
  const [viewItem, setViewItem] = useState<CustomerMeasurement | null>(null)
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)

  useEffect(() => {
    load()
  }, [customerId])

  async function load() {
    setLoading(true)
    try {
      const data = await getCustomerMeasurements(customerId)
      setMeasurements(data)
    } catch {
      toast.error('Failed to load measurements')
    } finally {
      setLoading(false)
    }
  }

  function handleSaved(m: CustomerMeasurement) {
    setMeasurements(prev => {
      const idx = prev.findIndex(x => x.id === m.id)
      if (idx >= 0) {
        const updated = [...prev]
        updated[idx] = m
        return updated
      }
      return [m, ...prev]
    })
  }

  async function handleDelete(id: string) {
    try {
      await deleteMeasurement(id)
      setMeasurements(prev => prev.filter(m => m.id !== id))
      toast.success('Measurement deleted')
    } catch {
      toast.error('Failed to delete')
    }
    setConfirmDelete(null)
  }

  async function handlePDF(m: CustomerMeasurement) {
    setPdfLoading(m.id)
    try {
      await generateMeasurementPDF(m, { name: shopName, phone: shopPhone })
    } catch {
      toast.error('Failed to generate PDF')
    } finally {
      setPdfLoading(null)
    }
  }

  const filtered = useMemo(() => {
    return measurements.filter(m => {
      const matchType = filterType === 'all' || m.garmentType === filterType
      const matchSearch = !search || m.label.toLowerCase().includes(search.toLowerCase()) || GARMENT_LABELS[m.garmentType].toLowerCase().includes(search.toLowerCase())
      return matchType && matchSearch
    })
  }, [measurements, filterType, search])

  const groupedByType = useMemo(() => {
    const groups: Record<string, number> = { all: measurements.length }
    for (const m of measurements) {
      groups[m.garmentType] = (groups[m.garmentType] || 0) + 1
    }
    return groups
  }, [measurements])

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="flex-1 flex items-center gap-2 bg-background border border-border rounded-xl px-3 py-2.5">
          <Search size={15} className="text-muted-foreground shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by label or garment..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => { setEditItem(null); setModalOpen(true) }}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 transition-opacity shrink-0"
        >
          <Plus size={15} />
          Add Measurements
        </motion.button>
      </div>

      {/* Garment filter pills */}
      <div className="flex flex-wrap gap-2 mb-5">
        {(['all', ...GARMENT_TYPES] as const).map(type => {
          const count = groupedByType[type] || 0
          if (type !== 'all' && count === 0) return null
          return (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={cn(
                'px-3 py-1.5 rounded-xl text-xs font-medium border transition-all',
                filterType === type
                  ? 'bg-foreground text-background border-foreground'
                  : 'bg-card border-border text-muted-foreground hover:text-foreground'
              )}
            >
              {type === 'all' ? 'All' : GARMENT_LABELS[type]}
              <span className={cn('ml-1.5 text-xs', filterType === type ? 'opacity-70' : 'opacity-50')}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-2xl p-5 animate-pulse">
              <div className="h-4 w-16 bg-muted rounded mb-3" />
              <div className="h-5 w-32 bg-muted rounded mb-4" />
              <div className="grid grid-cols-2 gap-2">
                {Array.from({ length: 4 }).map((_, j) => <div key={j} className="h-8 bg-muted rounded-lg" />)}
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <Ruler size={24} className="text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground mb-1">
            {measurements.length === 0 ? 'No measurements yet' : 'No results found'}
          </p>
          <p className="text-xs text-muted-foreground mb-5">
            {measurements.length === 0
              ? 'Save customer measurements to use them when creating orders'
              : 'Try a different search or filter'}
          </p>
          {measurements.length === 0 && (
            <button
              onClick={() => { setEditItem(null); setModalOpen(true) }}
              className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90"
            >
              <Plus size={14} />
              Add First Measurement
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <AnimatePresence>
            {filtered.map((m, i) => {
              const previewFields = getPreviewFields(m.garmentType)
              const isExpanded = expandedId === m.id
              const allFields = GARMENT_FIELDS[m.garmentType]

              return (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ delay: i * 0.04 }}
                  className="bg-card border border-border rounded-2xl overflow-hidden luxury-shadow hover:border-foreground/20 transition-colors"
                >
                  {/* Card header */}
                  <div className="p-4 pb-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn('text-xs font-medium px-2 py-0.5 rounded-md border', GARMENT_COLORS[m.garmentType])}>
                          {GARMENT_LABELS[m.garmentType]}
                        </span>
                        <span className="text-xs text-muted-foreground border border-border px-2 py-0.5 rounded-md">
                          {m.unit === 'in' ? 'inches' : 'cm'}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">{fmtDate(m.createdAt)}</span>
                    </div>
                    <h4 className="text-sm font-semibold text-foreground">{m.label}</h4>
                    {m.dueDate && (
                      <div className={cn(
                        'flex items-center gap-1 mt-1.5 text-xs font-medium px-2 py-0.5 rounded-md w-fit',
                        new Date(m.dueDate) < new Date()
                          ? 'bg-red-50 text-red-600 border border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900'
                          : 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900'
                      )}>
                        <CalendarClock size={11} />
                        {new Date(m.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    )}
                  </div>

                  {/* Preview measurements */}
                  <div className="px-4 pb-3">
                    <div className="grid grid-cols-2 gap-2">
                      {previewFields.map(f => {
                        const val = m.measurements[f.key]
                        if (!val) return null
                        return (
                          <div key={String(f.key)} className="bg-muted/60 rounded-xl px-3 py-2">
                            <p className="text-xs text-muted-foreground">{f.label}</p>
                            <p className="text-sm font-semibold text-foreground mt-0.5">
                              {val}{f.type === 'number' ? `"` : ''}
                            </p>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Expanded: all fields */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-3 border-t border-border pt-3">
                          <div className="grid grid-cols-2 gap-2">
                            {allFields.filter(f => {
                              const v = m.measurements[f.key]
                              return v !== undefined && v !== null && v !== '' &&
                                !previewFields.find(pf => pf.key === f.key)
                            }).map(f => {
                              const val = m.measurements[f.key]
                              return (
                                <div key={String(f.key)} className="bg-muted/40 rounded-xl px-3 py-2">
                                  <p className="text-xs text-muted-foreground">{f.label}</p>
                                  <p className="text-sm font-semibold text-foreground mt-0.5">
                                    {f.type === 'number' ? `${val}${m.unit}` : String(val)}
                                  </p>
                                </div>
                              )
                            })}
                          </div>

                          {m.measurements.notes && (
                            <div className="mt-3 p-3 bg-muted/40 rounded-xl">
                              <p className="text-xs text-muted-foreground mb-1">Special Notes</p>
                              <p className="text-xs text-foreground leading-relaxed">{m.measurements.notes}</p>
                            </div>
                          )}

                          {/* Pattern image */}
                          {m.measurements.patternImageUrl && (
                            <div className="mt-3">
                              <p className="text-xs text-muted-foreground mb-1.5">Blouse Pattern</p>
                              <img
                                src={m.measurements.patternImageUrl}
                                alt="Pattern"
                                className="w-full h-32 object-cover rounded-xl border border-border"
                              />
                            </div>
                          )}

                          {/* Design images */}
                          {m.measurements.designImageUrls && m.measurements.designImageUrls.length > 0 && (
                            <div className="mt-3">
                              <p className="text-xs text-muted-foreground mb-1.5">Design References</p>
                              <div className="grid grid-cols-4 gap-2">
                                {m.measurements.designImageUrls.map((url, idx) => (
                                  <img
                                    key={idx}
                                    src={url}
                                    alt={`Design ${idx + 1}`}
                                    className="aspect-square object-cover rounded-xl border border-border"
                                  />
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Actions */}
                  <div className="px-4 py-3 border-t border-border flex items-center justify-between gap-2">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : m.id)}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {isExpanded ? 'Show less' : 'View all'}
                      <motion.div animate={{ rotate: isExpanded ? 90 : 0 }}>
                        <ChevronRight size={12} />
                      </motion.div>
                    </button>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setViewItem(m)}
                        title="View"
                        className="p-2 text-muted-foreground hover:text-foreground rounded-xl hover:bg-muted transition-colors"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        onClick={() => handlePDF(m)}
                        disabled={pdfLoading === m.id}
                        title="Download PDF"
                        className="p-2 text-muted-foreground hover:text-foreground rounded-xl hover:bg-muted transition-colors disabled:opacity-50"
                      >
                        <Download size={14} />
                      </button>
                      <button
                        onClick={() => { setEditItem(m); setModalOpen(true) }}
                        title="Edit"
                        className="p-2 text-muted-foreground hover:text-foreground rounded-xl hover:bg-muted transition-colors"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => setConfirmDelete(m.id)}
                        title="Delete"
                        className="p-2 text-muted-foreground hover:text-red-500 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      {/* View measurement modal */}
      <AnimatePresence>
        {viewItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setViewItem(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ duration: 0.2 }}
              className="relative bg-card border border-border rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto luxury-shadow-lg"
            >
              {/* Modal header */}
              <div className="sticky top-0 bg-card border-b border-border px-5 py-4 flex items-start justify-between gap-3 rounded-t-2xl">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn('text-xs font-medium px-2 py-0.5 rounded-md border', GARMENT_COLORS[viewItem.garmentType])}>
                      {GARMENT_LABELS[viewItem.garmentType]}
                    </span>
                    <span className="text-xs text-muted-foreground border border-border px-2 py-0.5 rounded-md">
                      {viewItem.unit === 'in' ? 'inches' : 'cm'}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-foreground">{viewItem.label}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{fmtDate(viewItem.createdAt)}</p>
                  {viewItem.dueDate && (
                    <div className={cn(
                      'flex items-center gap-1 mt-1.5 text-xs font-medium px-2 py-0.5 rounded-md w-fit',
                      new Date(viewItem.dueDate) < new Date()
                        ? 'bg-red-50 text-red-600 border border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900'
                        : 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900'
                    )}>
                      <CalendarClock size={11} />
                      Due: {new Date(viewItem.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setViewItem(null)}
                  className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors shrink-0"
                >
                  <X size={16} />
                </button>
              </div>

              {/* All measurements */}
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  {GARMENT_FIELDS[viewItem.garmentType]
                    .filter(f => {
                      const v = viewItem.measurements[f.key]
                      return v !== undefined && v !== null && v !== ''
                    })
                    .map(f => {
                      const val = viewItem.measurements[f.key]
                      return (
                        <div key={String(f.key)} className="bg-muted/50 rounded-xl px-3 py-2.5">
                          <p className="text-xs text-muted-foreground">{f.label}</p>
                          <p className="text-sm font-semibold text-foreground mt-0.5">
                            {f.type === 'number' ? `${val} ${viewItem.unit}` : String(val)}
                          </p>
                        </div>
                      )
                    })}
                </div>

                {viewItem.measurements.notes && (
                  <div className="p-3 bg-muted/40 rounded-xl">
                    <p className="text-xs text-muted-foreground mb-1">Special Notes</p>
                    <p className="text-sm text-foreground leading-relaxed">{viewItem.measurements.notes}</p>
                  </div>
                )}

                {viewItem.measurements.patternImageUrl && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1.5">Blouse Pattern</p>
                    <img
                      src={viewItem.measurements.patternImageUrl}
                      alt="Pattern"
                      className="w-full h-48 object-cover rounded-xl border border-border cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => setLightboxSrc(viewItem.measurements.patternImageUrl!)}
                    />
                  </div>
                )}

                {viewItem.measurements.designImageUrls && viewItem.measurements.designImageUrls.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1.5">Design References</p>
                    <div className="grid grid-cols-4 gap-2">
                      {viewItem.measurements.designImageUrls.map((url, idx) => (
                        <img
                          key={idx}
                          src={url}
                          alt={`Design ${idx + 1}`}
                          className="aspect-square object-cover rounded-xl border border-border cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => setLightboxSrc(url)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => { setEditItem(viewItem); setViewItem(null); setModalOpen(true) }}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-border rounded-xl text-sm font-medium hover:bg-muted transition-colors"
                  >
                    <Edit2 size={13} />
                    Edit
                  </button>
                  <button
                    onClick={() => handlePDF(viewItem)}
                    disabled={pdfLoading === viewItem.id}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-foreground text-background rounded-xl text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    <Download size={13} />
                    Download PDF
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AddMeasurementModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditItem(null) }}
        customerId={customerId}
        customerName={customerName}
        editItem={editItem}
        onSaved={handleSaved}
      />

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

      {/* Delete confirmation */}
      <AnimatePresence>
        {confirmDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmDelete(null)}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-card border border-border rounded-2xl p-6 max-w-sm w-full luxury-shadow-lg"
            >
              <h3 className="text-base font-semibold text-foreground mb-2">Delete Measurement?</h3>
              <p className="text-sm text-muted-foreground mb-6">This action cannot be undone.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 py-2.5 border border-border rounded-xl text-sm font-medium hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(confirmDelete)}
                  className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
