'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Ruler, ChevronRight, Loader2 } from 'lucide-react'
import { getCustomerMeasurements } from '@/firebase/firestore'
import { GARMENT_LABELS, GARMENT_COLORS, GARMENT_FIELDS } from '@/lib/measurement-config'
import type { CustomerMeasurement, GarmentType } from '@/types'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface Props {
  open: boolean
  onClose: () => void
  customerId: string
  customerName: string
  onLoad: (text: string) => void
}

function safeDate(val: any): string {
  if (!val) return ''
  if (typeof val === 'string') return val
  if (val?.seconds) return new Date(val.seconds * 1000).toISOString()
  return ''
}

function buildMeasurementText(m: CustomerMeasurement): string {
  const fields = GARMENT_FIELDS[m.garmentType]
  const lines: string[] = [
    `[${GARMENT_LABELS[m.garmentType]} — ${m.label}]`,
  ]
  for (const f of fields) {
    const val = m.measurements[f.key]
    if (val !== undefined && val !== null && val !== '') {
      lines.push(`${f.label}: ${val}${f.type === 'number' ? ` ${m.unit}` : ''}`)
    }
  }
  if (m.measurements.notes) {
    lines.push(`Notes: ${m.measurements.notes}`)
  }
  return lines.join('\n')
}

export default function LoadMeasurementsModal({ open, onClose, customerId, customerName, onLoad }: Props) {
  const [measurements, setMeasurements] = useState<CustomerMeasurement[]>([])
  const [loading, setLoading] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !customerId) return
    setLoading(true)
    getCustomerMeasurements(customerId)
      .then(setMeasurements)
      .catch(() => toast.error('Failed to load measurements'))
      .finally(() => setLoading(false))
  }, [open, customerId])

  function handleLoad(m: CustomerMeasurement) {
    onLoad(buildMeasurementText(m))
    onClose()
    toast.success('Measurements loaded into notes')
  }

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
            initial={{ opacity: 0, y: 30, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="relative bg-card border border-border rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[80vh] overflow-y-auto luxury-shadow-lg scrollbar-thin"
          >
            <div className="sticky top-0 bg-card z-10 px-5 py-4 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Saved Measurements</h2>
                <p className="text-xs text-muted-foreground mt-0.5">{customerName}</p>
              </div>
              <button onClick={onClose} className="p-2 text-muted-foreground hover:text-foreground rounded-xl hover:bg-muted transition-colors">
                <X size={16} />
              </button>
            </div>

            <div className="p-4">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={20} className="animate-spin text-muted-foreground" />
                </div>
              ) : measurements.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Ruler size={24} className="text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">No measurements saved for this customer.</p>
                  <p className="text-xs text-muted-foreground mt-1">Add measurements from the customer profile page.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground mb-3">
                    Select a measurement record to load it into the invoice notes.
                  </p>
                  {measurements.map(m => {
                    const isExpanded = expandedId === m.id
                    const previewFields = GARMENT_FIELDS[m.garmentType].filter(f => {
                      const v = m.measurements[f.key]
                      return v !== undefined && v !== null && v !== ''
                    }).slice(0, 4)

                    return (
                      <div key={m.id} className="border border-border rounded-xl overflow-hidden">
                        <div
                          className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/40 transition-colors"
                          onClick={() => setExpandedId(isExpanded ? null : m.id)}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className={cn('text-xs font-medium px-2 py-0.5 rounded-md border shrink-0', GARMENT_COLORS[m.garmentType])}>
                              {GARMENT_LABELS[m.garmentType]}
                            </span>
                            <span className="text-sm font-medium text-foreground truncate">{m.label}</span>
                          </div>
                          <motion.div animate={{ rotate: isExpanded ? 90 : 0 }} className="shrink-0 ml-2">
                            <ChevronRight size={14} className="text-muted-foreground" />
                          </motion.div>
                        </div>

                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden border-t border-border"
                            >
                              <div className="p-3 bg-muted/20">
                                <div className="grid grid-cols-2 gap-2 mb-3">
                                  {previewFields.map(f => (
                                    <div key={String(f.key)} className="bg-card rounded-lg px-3 py-2">
                                      <p className="text-xs text-muted-foreground">{f.label}</p>
                                      <p className="text-sm font-semibold text-foreground">
                                        {m.measurements[f.key]}{f.type === 'number' ? ` ${m.unit}` : ''}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                                {m.measurements.notes && (
                                  <p className="text-xs text-muted-foreground mb-3">
                                    Notes: {m.measurements.notes}
                                  </p>
                                )}
                                <button
                                  onClick={() => handleLoad(m)}
                                  className="w-full py-2 bg-primary text-primary-foreground rounded-xl text-xs font-medium hover:opacity-90 transition-opacity"
                                >
                                  Load into Invoice Notes
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
