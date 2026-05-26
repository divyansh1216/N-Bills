import type { CustomerMeasurement } from '@/types'
import { GARMENT_LABELS, GARMENT_FIELDS } from './measurement-config'

function safeDate(val: any): string {
  if (!val) return new Date().toISOString()
  if (typeof val === 'string') return val
  if (val?.seconds) return new Date(val.seconds * 1000).toISOString()
  return new Date().toISOString()
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
}

export async function generateMeasurementPDF(
  measurement: CustomerMeasurement,
  shopName: string
): Promise<void> {
  const jspdf = await import('jspdf')
  const jsPDF = (jspdf as any).default?.jsPDF || (jspdf as any).jsPDF
  const autoTableMod = await import('jspdf-autotable')
  const autoTable = (autoTableMod as any).default || autoTableMod

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 20

  // Header
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.setTextColor(0, 0, 0)
  doc.text(shopName, margin, 28)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(60, 60, 60)
  doc.text('MEASUREMENT CARD', pageWidth - margin, 28, { align: 'right' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(120, 120, 120)
  doc.text(GARMENT_LABELS[measurement.garmentType].toUpperCase(), pageWidth - margin, 35, { align: 'right' })

  doc.setDrawColor(0, 0, 0)
  doc.setLineWidth(0.5)
  doc.line(margin, 40, pageWidth - margin, 40)

  // Meta
  doc.setFontSize(8)
  doc.setTextColor(120, 120, 120)
  doc.text('CUSTOMER', margin, 50)
  doc.text('LABEL', pageWidth / 2, 50)
  doc.text('DATE', pageWidth - margin - 40, 50)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0)
  doc.text(measurement.customerName, margin, 57)
  doc.text(measurement.label, pageWidth / 2, 57)
  doc.text(fmtDate(safeDate(measurement.createdAt)), pageWidth - margin - 40, 57)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(120, 120, 120)
  doc.text(`Unit: ${measurement.unit === 'in' ? 'Inches' : 'Centimetres'}`, margin, 63)

  if (measurement.updatedAt) {
    doc.text(`Updated: ${fmtDate(safeDate(measurement.updatedAt))}`, pageWidth - margin - 40, 63)
  }

  doc.setLineWidth(0.3)
  doc.setDrawColor(220, 220, 220)
  doc.line(margin, 67, pageWidth - margin, 67)

  // Measurements table
  const fields = GARMENT_FIELDS[measurement.garmentType]
  const m = measurement.measurements
  const rows: [string, string][] = fields
    .filter(f => {
      const val = m[f.key]
      return val !== undefined && val !== null && val !== ''
    })
    .map(f => {
      const val = m[f.key]
      const display = f.type === 'number' ? `${val} ${measurement.unit === 'in' ? '"' : 'cm'}` : String(val)
      return [f.label, display]
    })

  autoTable(doc, {
    startY: 72,
    head: [['Measurement', 'Value']],
    body: rows,
    headStyles: {
      fillColor: [26, 26, 26],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: { fontSize: 10, textColor: [30, 30, 30] },
    alternateRowStyles: { fillColor: [248, 248, 248] },
    columnStyles: {
      0: { cellWidth: 80, fontStyle: 'bold' },
      1: { cellWidth: 60, halign: 'right' },
    },
    margin: { left: margin, right: margin },
    tableWidth: pageWidth - margin * 2,
  })

  let afterY = (doc as any).lastAutoTable.finalY + 10

  // Notes
  if (m.notes) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(80, 80, 80)
    doc.text('SPECIAL STITCHING NOTES', margin, afterY)
    doc.setLineWidth(0.3)
    doc.setDrawColor(200, 200, 200)
    doc.line(margin, afterY + 3, pageWidth - margin, afterY + 3)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(40, 40, 40)
    const splitNotes = doc.splitTextToSize(m.notes, pageWidth - margin * 2)
    doc.text(splitNotes, margin, afterY + 10)
    afterY += 10 + splitNotes.length * 5 + 6
  }

  // Neck shape
  if (m.neckShape) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(100, 100, 100)
    doc.text(`Neck Shape: ${m.neckShape}`, margin, afterY)
    afterY += 7
  }

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 15
  doc.setLineWidth(0.3)
  doc.setDrawColor(220, 220, 220)
  doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5)
  doc.setFontSize(7)
  doc.setTextColor(150, 150, 150)
  doc.text(shopName, margin, footerY)
  doc.text('Measurement Card — Confidential', pageWidth - margin, footerY, { align: 'right' })

  const filename = `${measurement.customerName.replace(/\s+/g, '_')}_${GARMENT_LABELS[measurement.garmentType]}_${measurement.label.replace(/\s+/g, '_')}.pdf`
  doc.save(filename)
}
