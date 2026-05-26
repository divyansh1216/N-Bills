import { NOTO_SANS_REGULAR_B64, NOTO_SANS_BOLD_B64 } from './pdf-fonts'

// Font family name used across the PDFs. jsPDF's built-in Helvetica cannot
// render the Indian Rupee sign (₹), so we embed a subset of Noto Sans and use
// it everywhere instead. Call registerPdfFont(doc) right after creating the doc.
export const PDF_FONT = 'NotoSans'

export function registerPdfFont(doc: any): void {
  doc.addFileToVFS('NotoSans-Regular.ttf', NOTO_SANS_REGULAR_B64)
  doc.addFont('NotoSans-Regular.ttf', PDF_FONT, 'normal')
  doc.addFileToVFS('NotoSans-Bold.ttf', NOTO_SANS_BOLD_B64)
  doc.addFont('NotoSans-Bold.ttf', PDF_FONT, 'bold')
  doc.setFont(PDF_FONT, 'normal')
}
