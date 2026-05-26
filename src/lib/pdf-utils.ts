import type { Invoice } from '@/types'
import { formatCurrency, formatDate } from './formatters'
import { SHOP_NAME, SHOP_TAGLINE } from './constants'
import { registerPdfFont, PDF_FONT } from './pdf-font'

export interface ShopInfo {
  name: string
  tagline: string
  phone?: string
  address?: string
}

// ── Design tokens ──────────────────────────────────────────────
const INK = [17, 17, 17] as const // near-black headings
const BODY = [55, 55, 55] as const // body text
const MUTED = [130, 130, 130] as const // labels / secondary
const HAIRLINE = [222, 222, 222] as const // light rules
const ACCENT = [17, 17, 17] as const // table header / total band
const POSITIVE = [21, 128, 61] as const // green-700 for paid

const MARGIN = 18 // mm

function safeDate(val: any): string {
  if (!val) return new Date().toISOString()
  if (typeof val === 'string') return val
  if (val?.seconds) return new Date(val.seconds * 1000).toISOString()
  return new Date().toISOString()
}

export async function generateInvoicePDF(
  invoice: Invoice,
  shop: ShopInfo = { name: SHOP_NAME, tagline: SHOP_TAGLINE }
): Promise<void> {
  const jspdf = await import('jspdf')
  const jsPDF = (jspdf as any).default?.jsPDF || (jspdf as any).jsPDF
  const autoTableMod = await import('jspdf-autotable')
  const autoTable = (autoTableMod as any).default || autoTableMod

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  registerPdfFont(doc) // embed Noto Sans so the ₹ symbol renders correctly
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const margin = MARGIN
  const contentR = pageW - margin // right content edge

  // Typography helper keeps font/size/color changes to one readable call.
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
  doc.text(shop.name, margin, 24)

  set(8.5, MUTED, 'normal')
  doc.text(shop.tagline, margin, 30)

  // Shop contact block, stacked under the tagline (only what exists).
  let contactY = 35
  if (shop.phone) {
    doc.text(shop.phone, margin, contactY)
    contactY += 4.5
  }
  if (shop.address) {
    const addr = doc.splitTextToSize(shop.address, 90)
    doc.text(addr, margin, contactY)
    contactY += addr.length * 4.5
  }

  // Invoice meta — right aligned label/value pairs.
  set(20, INK, 'bold')
  doc.text('INVOICE', contentR, 24, { align: 'right' })

  set(9, BODY, 'normal')
  doc.text(`No.  ${invoice.invoiceNumber}`, contentR, 31, { align: 'right' })
  doc.text(`Date  ${formatDate(safeDate(invoice.createdAt))}`, contentR, 36.5, { align: 'right' })
  if (invoice.dueAt) {
    doc.text(`Due  ${formatDate(safeDate(invoice.dueAt))}`, contentR, 42, { align: 'right' })
  }

  const headerBottom = Math.max(contactY, invoice.dueAt ? 46 : 41)
  rule(headerBottom, INK, 0.6)

  // ── Bill to + status ──────────────────────────────────────────
  const billTop = headerBottom + 9
  set(7.5, MUTED, 'bold')
  doc.text('BILL TO', margin, billTop)

  set(12, INK, 'bold')
  doc.text(invoice.customerName, margin, billTop + 6.5)
  if (invoice.customerPhone) {
    set(9, BODY, 'normal')
    doc.text(invoice.customerPhone, margin, billTop + 12)
  }

  // Status chip — outlined pill, right aligned, level with BILL TO.
  const statusText = invoice.status.toUpperCase()
  set(8, INK, 'bold')
  const chipW = doc.getTextWidth(statusText) + 6
  const chipH = 6
  const chipX = contentR - chipW
  const chipY = billTop - 4
  doc.setDrawColor(HAIRLINE[0], HAIRLINE[1], HAIRLINE[2])
  doc.setLineWidth(0.4)
  doc.roundedRect(chipX, chipY, chipW, chipH, 1.2, 1.2, 'S')
  doc.text(statusText, chipX + chipW / 2, chipY + 4.2, { align: 'center' })

  // ── Line items table ──────────────────────────────────────────
  autoTable(doc, {
    startY: billTop + 18,
    head: [['#', 'Item', 'Type', 'Qty', 'Unit Price', 'Amount']],
    body: invoice.items.map((item, i) => [
      i + 1,
      item.name,
      item.type === 'rental' ? `Rental · ${item.rentalDays}d` : 'Stitching',
      item.quantity,
      formatCurrency(item.unitPrice),
      formatCurrency(item.amount),
    ]),
    theme: 'plain',
    styles: { font: PDF_FONT },
    headStyles: {
      font: PDF_FONT,
      fillColor: [ACCENT[0], ACCENT[1], ACCENT[2]],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      cellPadding: { top: 2.6, bottom: 2.6, left: 3, right: 3 },
    },
    bodyStyles: {
      font: PDF_FONT,
      fontSize: 9,
      textColor: [BODY[0], BODY[1], BODY[2]],
      cellPadding: { top: 2.8, bottom: 2.8, left: 3, right: 3 },
      lineColor: [HAIRLINE[0], HAIRLINE[1], HAIRLINE[2]],
      lineWidth: { bottom: 0.2 },
    },
    columnStyles: {
      0: { cellWidth: 9, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 26 },
      3: { cellWidth: 14, halign: 'center' },
      4: { cellWidth: 28, halign: 'right' },
      5: { cellWidth: 28, halign: 'right' },
    },
    margin: { left: margin, right: margin },
  })

  // ── Totals — every value shares the right edge; labels sit 62mm in ─
  let y = (doc as any).lastAutoTable.finalY + 9
  const labelX = contentR - 62

  const totalRow = (
    label: string,
    value: string,
    opts?: { bold?: boolean; size?: number; color?: readonly number[] }
  ) => {
    set(opts?.size ?? 9, opts?.color ?? BODY, opts?.bold ? 'bold' : 'normal')
    doc.text(label, labelX, y)
    doc.text(value, contentR, y, { align: 'right' })
  }

  totalRow('Subtotal', formatCurrency(invoice.subtotal))
  y += 6
  if (invoice.discount > 0) {
    totalRow('Discount', `- ${formatCurrency(invoice.discount)}`)
    y += 6
  }
  if (invoice.tax > 0) {
    totalRow('Tax', formatCurrency(invoice.tax))
    y += 6
  }

  // Total band
  y += 1
  doc.setDrawColor(HAIRLINE[0], HAIRLINE[1], HAIRLINE[2])
  doc.setLineWidth(0.3)
  doc.line(labelX, y, contentR, y)
  y += 6.5
  totalRow('TOTAL', formatCurrency(invoice.total), { bold: true, size: 11, color: INK })

  if ((invoice.amountPaid ?? 0) > 0) {
    y += 7
    totalRow('Amount Paid', formatCurrency(invoice.amountPaid!), { color: POSITIVE })
    const balance = Math.max(0, invoice.total - invoice.amountPaid!)
    y += 6
    totalRow('Balance Due', formatCurrency(balance), { bold: true, size: 10, color: INK })
  }

  // ── Notes (left column, below totals) ─────────────────────────
  if (invoice.notes) {
    const notesY = y + 14
    set(7.5, MUTED, 'bold')
    doc.text('NOTES', margin, notesY)
    set(9, BODY, 'normal')
    const lines = doc.splitTextToSize(invoice.notes, pageW - margin * 2 - 4)
    doc.text(lines, margin, notesY + 6)
  }

  // ── Footer ────────────────────────────────────────────────────
  const footerY = pageH - 12
  rule(footerY - 6)
  set(7.5, MUTED, 'normal')
  doc.text(shop.phone ? `${shop.name}  ·  ${shop.phone}` : shop.name, margin, footerY)
  doc.text('Thank you for your business.', contentR, footerY, { align: 'right' })

  doc.save(`${invoice.invoiceNumber}.pdf`)
}
