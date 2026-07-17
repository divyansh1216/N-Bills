import type { Invoice } from '@/types'
import { formatCurrency } from './formatters'
import { getInvoicePDFBlob, type ShopInfo } from './pdf-utils'

export async function shareInvoice(invoice: Invoice, shop: ShopInfo): Promise<'shared' | 'downloaded'> {
  const blob = await getInvoicePDFBlob(invoice, shop)
  const fileName = `${invoice.invoiceNumber}.pdf`
  const file = new File([blob], fileName, { type: 'application/pdf' })

  const text = `Invoice ${invoice.invoiceNumber} from ${shop.name}\nAmount: ${formatCurrency(invoice.total)}\nStatus: ${invoice.status.toUpperCase()}`

  if (typeof navigator !== 'undefined' && navigator.share) {
    const shareData: ShareData & { files?: File[] } = { title: `Invoice ${invoice.invoiceNumber}`, text, files: [file] }
    const canShareFiles = !navigator.canShare || navigator.canShare({ files: [file] })

    if (canShareFiles) {
      await navigator.share(shareData)
      return 'shared'
    }

    await navigator.share({ title: `Invoice ${invoice.invoiceNumber}`, text })
    return 'shared'
  }

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)

  if (invoice.customerPhone) {
    const phone = invoice.customerPhone.replace(/\D/g, '')
    const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
    window.open(waUrl, '_blank')
  }

  return 'downloaded'
}
