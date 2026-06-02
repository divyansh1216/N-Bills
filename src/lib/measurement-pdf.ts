import type { CustomerMeasurement } from '@/types'
import { GARMENT_LABELS, GARMENT_FIELDS } from './measurement-config'
import { registerPdfFont, PDF_FONT } from './pdf-font'

const INK     = [17, 17, 17]   as const
const BODY    = [55, 55, 55]   as const
const MUTED   = [130, 130, 130] as const
const HAIRLINE= [222, 222, 222] as const
const WHITE   = [255, 255, 255] as const
const ACCENT  = [30, 30, 30]   as const

const MARGIN = 16 // mm

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
  const shopInfo: MeasurementShopInfo = typeof shop === 'string' ? { name: shop } : shop

  const jspdf = await import('jspdf')
  const jsPDF = (jspdf as any).default?.jsPDF || (jspdf as any).jsPDF
  const autoTableMod = await import('jspdf-autotable')
  const autoTable = (autoTableMod as any).default || autoTableMod

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  registerPdfFont(doc)

  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const contentR = pageW - MARGIN

  const set = (size: number, rgb: readonly number[], style: 'normal' | 'bold' = 'normal') => {
    doc.setFont(PDF_FONT, style)
    doc.setFontSize(size)
    doc.setTextColor(rgb[0], rgb[1], rgb[2])
  }

  const rule = (y: number, rgb: readonly number[] = HAIRLINE, w = 0.25) => {
    doc.setDrawColor(rgb[0], rgb[1], rgb[2])
    doc.setLineWidth(w)
    doc.line(MARGIN, y, contentR, y)
  }

  const fillRect = (x: number, y: number, w: number, h: number, rgb: readonly number[]) => {
    doc.setFillColor(rgb[0], rgb[1], rgb[2])
    doc.rect(x, y, w, h, 'F')
  }

  // ── Header band ───────────────────────────────────────────────
  fillRect(0, 0, pageW, 38, ACCENT)

  set(20, WHITE, 'bold')
  doc.text(shopInfo.name, MARGIN, 18)

  if (shopInfo.phone) {
    set(8, [200, 200, 200], 'normal')
    doc.text(shopInfo.phone, MARGIN, 25)
  }

  set(9, WHITE, 'bold')
  doc.text('MEASUREMENT CARD', contentR, 16, { align: 'right' })
  set(8, [200, 200, 200], 'normal')
  doc.text(GARMENT_LABELS[measurement.garmentType].toUpperCase(), contentR, 23, { align: 'right' })

  const createdStr = fmtDate(safeDate(measurement.createdAt))
  doc.text(createdStr, contentR, 30, { align: 'right' })

  // ── Meta strip ────────────────────────────────────────────────
  const metaY = 46
  const colW = (pageW - MARGIN * 2) / 3

  const metaCols = [
    { label: 'CUSTOMER', value: measurement.customerName },
    { label: 'LABEL',    value: measurement.label },
    { label: 'UNIT',     value: measurement.unit === 'in' ? 'Inches (")' : 'Centimetres (cm)' },
  ]
  metaCols.forEach((c, i) => {
    const x = MARGIN + colW * i
    set(7, MUTED, 'bold')
    doc.text(c.label, x, metaY)
    set(10.5, INK, 'bold')
    doc.text(c.value, x, metaY + 7)
  })

  rule(metaY + 13, HAIRLINE)

  // ── Measurements table (two columns of label/value pairs) ─────
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

  // Split into two side-by-side tables
  const half = Math.ceil(rows.length / 2)
  const leftRows  = rows.slice(0, half)
  const rightRows = rows.slice(half)

  const tableW = (pageW - MARGIN * 2 - 8) / 2 // 8mm gap between tables
  const tableStartY = metaY + 20

  const sharedOpts = {
    theme: 'plain' as const,
    styles: { font: PDF_FONT },
    headStyles: {
      font: PDF_FONT,
      fillColor: [40, 40, 40] as [number,number,number],
      textColor: [255, 255, 255] as [number,number,number],
      fontStyle: 'bold' as const,
      fontSize: 8,
      cellPadding: { top: 3, bottom: 3, left: 3.5, right: 3.5 },
    },
    bodyStyles: {
      font: PDF_FONT,
      fontSize: 9.5,
      textColor: [BODY[0], BODY[1], BODY[2]] as [number,number,number],
      cellPadding: { top: 3.2, bottom: 3.2, left: 3.5, right: 3.5 },
      lineColor: [HAIRLINE[0], HAIRLINE[1], HAIRLINE[2]] as [number,number,number],
      lineWidth: { bottom: 0.18 },
    },
    alternateRowStyles: { fillColor: [248, 248, 248] as [number,number,number] },
    columnStyles: {
      0: { fontStyle: 'bold' as const, textColor: [INK[0], INK[1], INK[2]] as [number,number,number] },
      1: { halign: 'right' as const, cellWidth: 28 },
    },
  }

  autoTable(doc, {
    ...sharedOpts,
    startY: tableStartY,
    head: [['Measurement', 'Value']],
    body: leftRows,
    tableWidth: tableW,
    margin: { left: MARGIN, right: pageW - MARGIN - tableW },
  })

  const leftFinalY = (doc as any).lastAutoTable.finalY

  autoTable(doc, {
    ...sharedOpts,
    startY: tableStartY,
    head: [['Measurement', 'Value']],
    body: rightRows,
    tableWidth: tableW,
    margin: { left: MARGIN + tableW + 8, right: MARGIN },
  })

  const rightFinalY = (doc as any).lastAutoTable.finalY
  let y = Math.max(leftFinalY, rightFinalY) + 12

  // ── Special stitching notes ───────────────────────────────────
  if (m.notes) {
    rule(y - 4, HAIRLINE)
    set(7.5, MUTED, 'bold')
    doc.text('SPECIAL STITCHING NOTES', MARGIN, y + 2)
    set(9.5, BODY, 'normal')
    const lines = doc.splitTextToSize(m.notes, pageW - MARGIN * 2)
    doc.text(lines, MARGIN, y + 10)
    y += 10 + lines.length * 5.5
  }

  // ── Footer ────────────────────────────────────────────────────
  const footerY = pageH - 12
  rule(footerY - 6)
  set(7.5, MUTED, 'normal')
  doc.text(shopInfo.name, MARGIN, footerY)
  doc.text('Measurement Card · Confidential', contentR, footerY, { align: 'right' })

  const filename = `${measurement.customerName.replace(/\s+/g, '_')}_${GARMENT_LABELS[measurement.garmentType]}_${measurement.label.replace(/\s+/g, '_')}.pdf`
  doc.save(filename)
}
