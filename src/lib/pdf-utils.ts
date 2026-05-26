import type { Invoice } from '@/types'
import { formatCurrency, formatDate } from './formatters'
import { SHOP_NAME, SHOP_TAGLINE } from './constants'

export interface ShopInfo {
  name: string
  tagline: string
}

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
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 20

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(24)
  doc.setTextColor(0, 0, 0)
  doc.text(shop.name, margin, 30)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(100, 100, 100)
  doc.text(shop.tagline, margin, 37)

  doc.setDrawColor(0, 0, 0)
  doc.setLineWidth(0.5)
  doc.line(margin, 42, pageWidth - margin, 42)

  doc.setFontSize(10)
  doc.setTextColor(0, 0, 0)
  doc.setFont('helvetica', 'bold')
  doc.text('INVOICE', pageWidth - margin, 30, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(80, 80, 80)
  doc.text(`#${invoice.invoiceNumber}`, pageWidth - margin, 37, { align: 'right' })
  doc.text(formatDate(safeDate(invoice.createdAt)), pageWidth - margin, 43, { align: 'right' })

  doc.setFontSize(8)
  doc.setTextColor(120, 120, 120)
  doc.text('BILL TO', margin, 55)
  doc.setFontSize(11)
  doc.setTextColor(0, 0, 0)
  doc.setFont('helvetica', 'bold')
  doc.text(invoice.customerName, margin, 62)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(80, 80, 80)
  doc.text(invoice.customerPhone, margin, 68)

  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text(invoice.status.toUpperCase(), pageWidth - margin, 55, { align: 'right' })

  autoTable(doc, {
    startY: 80,
    head: [['#', 'Item', 'Type', 'Qty', 'Unit Price', 'Amount']],
    body: invoice.items.map((item, i) => [
      i + 1,
      item.name,
      item.type === 'rental' ? `Rental (${item.rentalDays}d)` : 'Stitching',
      item.quantity,
      formatCurrency(item.unitPrice),
      formatCurrency(item.amount),
    ]),
    headStyles: { fillColor: [26, 26, 26], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 9, textColor: [50, 50, 50] },
    alternateRowStyles: { fillColor: [248, 248, 248] },
    columnStyles: { 0: { cellWidth: 10, halign: 'center' }, 4: { halign: 'right' }, 5: { halign: 'right' } },
    margin: { left: margin, right: margin },
  })

  const finalY = (doc as any).lastAutoTable.finalY + 10

  doc.setFontSize(9)
  doc.setTextColor(80, 80, 80)
  const totalsX = pageWidth - margin - 60
  doc.text('Subtotal', totalsX, finalY)
  doc.text(formatCurrency(invoice.subtotal), pageWidth - margin, finalY, { align: 'right' })

  if (invoice.discount > 0) {
    doc.text('Discount', totalsX, finalY + 6)
    doc.text(`-${formatCurrency(invoice.discount)}`, pageWidth - margin, finalY + 6, { align: 'right' })
  }

  doc.setLineWidth(0.3)
  doc.setDrawColor(200, 200, 200)
  doc.line(totalsX, finalY + 16, pageWidth - margin, finalY + 16)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(0, 0, 0)
  doc.text('TOTAL', totalsX, finalY + 23)
  doc.text(formatCurrency(invoice.total), pageWidth - margin, finalY + 23, { align: 'right' })

  let afterTotalsY = finalY + 23
  if ((invoice.amountPaid ?? 0) > 0) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(22, 163, 74) // emerald-600
    doc.text('Amount Paid', totalsX, afterTotalsY + 8)
    doc.text(formatCurrency(invoice.amountPaid!), pageWidth - margin, afterTotalsY + 8, { align: 'right' })
    const balance = Math.max(0, invoice.total - invoice.amountPaid!)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(0, 0, 0)
    doc.text('BALANCE DUE', totalsX, afterTotalsY + 16)
    doc.text(formatCurrency(balance), pageWidth - margin, afterTotalsY + 16, { align: 'right' })
    afterTotalsY += 16
  }

  if (invoice.notes) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(120, 120, 120)
    doc.text('Notes:', margin, afterTotalsY + 12)
    doc.setTextColor(80, 80, 80)
    doc.text(invoice.notes, margin, afterTotalsY + 18)
  }

  const footerY = doc.internal.pageSize.getHeight() - 15
  doc.setLineWidth(0.3)
  doc.setDrawColor(220, 220, 220)
  doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5)
  doc.setFontSize(7)
  doc.setTextColor(150, 150, 150)
  doc.text(`${shop.name} | ${shop.tagline}`, margin, footerY)
  doc.text('Thank you for your business.', pageWidth - margin, footerY, { align: 'right' })

  doc.save(`${invoice.invoiceNumber}.pdf`)
}
