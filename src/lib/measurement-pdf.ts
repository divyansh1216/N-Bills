import type { CustomerMeasurement } from '@/types'
import { GARMENT_LABELS, GARMENT_FIELDS } from './measurement-config'
import { registerPdfFont, PDF_FONT } from './pdf-font'

// ── Design tokens (shared visual language with the invoice PDF) ──
const INK = [17, 17, 17] as const
const BODY = [55, 55, 55] as const
const MUTED = [130, 130, 130] as const
const HAIRLINE = [222, 222, 222] as const
const ACCENT = [17, 17, 17] as const

const MARGIN = 18 // mm

export interface MeasurementShopInfo {
  name: string
  phone?: string
}

function safeDate(val: any): string {
  if (!val) return new Date().toISOString()
  if (typeof val === 'string') return val
  if (val?.seconds) return new Date(val.seconds * 1000).toISOString()
  return new Date().toISOString()
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export async function generateMeasurementPDF(
  measurement: CustomerMeasurement,
  shop: string | MeasurementShopInfo
): Promise<void> {
  // Backwards compatible: callers may still pass just the shop name.
  const shopInfo: MeasurementShopInfo = typeof shop === 'string' ? { name: shop } : shop

  const jspdf = await import('jspdf')
  const jsPDF = (jspdf as any).default?.jsPDF || (jspdf as any).jsPDF
  const autoTableMod = await import('jspdf-autotable')
  const autoTable = (autoTableMod as any).default || autoTableMod

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  registerPdfFont(doc) // embed Noto Sans so the " / cm units and ₹ render correctly
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const margin = MARGIN
  const contentR = pageW - margin

  const set = (size: number, rgb: readonly number[], style: 'normal' | 'bold' = 'normal') => {
    doc.setFont(PDF_FONT, style)
    doc.setFontSize(size)
    doc.setTextColor(rgb[0], rgb[1], rgb[2])
  }
  const rule = (y: number, rgb: readonly number[] = HAIRLINE, w = 0.3) => {
    doc.setDrawColor(rgb[0], rgb[1], rgb[2])
    doc.setLineWidth(w)
    doc.line(margin, y, contentR, y)
  }

  // ── Header band ───────────────────────────────────────────────
  set(22, INK, 'bold')
  doc.text(shopInfo.name, margin, 24)
  if (shopInfo.phone) {
    set(8.5, MUTED, 'normal')
    doc.text(shopInfo.phone, margin, 30)
  }

  set(13, INK, 'bold')
  doc.text('MEASUREMENT CARD', contentR, 23, { align: 'right' })
  set(8.5, MUTED, 'bold')
  doc.text(GARMENT_LABELS[measurement.garmentType].toUpperCase(), contentR, 29, { align: 'right' })

  rule(35, INK, 0.6)

  // ── Meta grid — three evenly spaced columns, label above value ─
  const metaY = 44
  const colGap = (pageW - margin * 2) / 3
  const cols = [
    { x: margin, label: 'CUSTOMER', value: measurement.customerName },
    { x: margin + colGap, label: 'LABEL', value: measurement.label },
    {
      x: margin + colGap * 2,
      label: 'UNIT',
      value: measurement.unit === 'in' ? 'Inches' : 'Centimetres',
    },
  ]
  cols.forEach(c => {
    set(7.5, MUTED, 'bold')
    doc.text(c.label, c.x, metaY)
    set(11, INK, 'bold')
    doc.text(c.value, c.x, metaY + 6.5)
  })

  // Dates line, muted, under the meta grid.
  set(8, MUTED, 'normal')
  let dateLine = `Created  ${fmtDate(safeDate(measurement.createdAt))}`
  if (measurement.updatedAt) {
    dateLine += `      Updated  ${fmtDate(safeDate(measurement.updatedAt))}`
  }
  doc.text(dateLine, margin, metaY + 13)

  rule(metaY + 18)

  // ── Measurements table ────────────────────────────────────────
  const fields = GARMENT_FIELDS[measurement.garmentType]
  const m = measurement.measurements
  const unitSuffix = measurement.unit === 'in' ? '"' : ' cm'
  const rows: [string, string][] = fields
    .filter(f => {
      const val = m[f.key]
      return val !== undefined && val !== null && val !== ''
    })
    .map(f => {
      const val = m[f.key]
      const display = f.type === 'number' ? `${val}${unitSuffix}` : String(val)
      return [f.label, display]
    })

  autoTable(doc, {
    startY: metaY + 24,
    head: [['Measurement', 'Value']],
    body: rows,
    theme: 'plain',
    styles: { font: PDF_FONT },
    headStyles: {
      font: PDF_FONT,
      fillColor: [ACCENT[0], ACCENT[1], ACCENT[2]],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
      cellPadding: { top: 2.8, bottom: 2.8, left: 3.5, right: 3.5 },
    },
    bodyStyles: {
      font: PDF_FONT,
      fontSize: 10,
      textColor: [BODY[0], BODY[1], BODY[2]],
      cellPadding: { top: 3, bottom: 3, left: 3.5, right: 3.5 },
      lineColor: [HAIRLINE[0], HAIRLINE[1], HAIRLINE[2]],
      lineWidth: { bottom: 0.2 },
    },
    columnStyles: {
      0: { cellWidth: 'auto', fontStyle: 'bold', textColor: [INK[0], INK[1], INK[2]] },
      1: { cellWidth: 45, halign: 'right' },
    },
    margin: { left: margin, right: margin },
  })

  let y = (doc as any).lastAutoTable.finalY + 12

  // ── Special stitching notes ───────────────────────────────────
  if (m.notes) {
    set(7.5, MUTED, 'bold')
    doc.text('SPECIAL STITCHING NOTES', margin, y)
    set(9.5, BODY, 'normal')
    const lines = doc.splitTextToSize(m.notes, pageW - margin * 2 - 4)
    doc.text(lines, margin, y + 6)
    y += 6 + lines.length * 5
  }

  // ── Footer ────────────────────────────────────────────────────
  const footerY = pageH - 12
  rule(footerY - 6)
  set(7.5, MUTED, 'normal')
  doc.text(shopInfo.name, margin, footerY)
  doc.text('Measurement Card · Confidential', contentR, footerY, { align: 'right' })

  const filename = `${measurement.customerName.replace(/\s+/g, '_')}_${GARMENT_LABELS[measurement.garmentType]}_${measurement.label.replace(/\s+/g, '_')}.pdf`
  doc.save(filename)
}
