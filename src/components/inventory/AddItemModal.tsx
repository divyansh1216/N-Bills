'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Loader2, Image as ImageIcon } from 'lucide-react'
import { toast } from 'sonner'
import { addInventoryItem, updateInventoryItem } from '@/firebase/firestore'
import { uploadInventoryImage } from '@/lib/cloudinary'
import { CATEGORIES } from '@/lib/constants'
import type { InventoryItem } from '@/types'
import { cn } from '@/lib/utils'
import { useShopSettings } from '@/contexts/ShopSettingsContext'

interface AddItemModalProps {
  open: boolean
  onClose: () => void
  editItem?: InventoryItem | null
}

const EMPTY_FORM = {
  name: '',
  category: 'lehenga' as InventoryItem['category'],
  price: '',
  rentalPrice: '',
  deposit: '',
  description: '',
  isRentable: false,
}

export default function AddItemModal({ open, onClose, editItem }: AddItemModalProps) {
  const { rentalEnabled } = useShopSettings()
  const [form, setForm] = useState(
    editItem
      ? {
          name: editItem.name,
          category: editItem.category,
          price: String(editItem.price),
          rentalPrice: editItem.rentalPrice ? String(editItem.rentalPrice) : '',
          deposit: editItem.deposit ? String(editItem.deposit) : '',
          description: editItem.description || '',
          isRentable: editItem.isRentable,
        }
      : EMPTY_FORM
  )
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>(editItem?.imageUrl || '')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [loading, setLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      if (editItem) {
        setForm({
          name: editItem.name,
          category: editItem.category,
          price: String(editItem.price),
          rentalPrice: editItem.rentalPrice ? String(editItem.rentalPrice) : '',
          deposit: editItem.deposit ? String(editItem.deposit) : '',
          description: editItem.description || '',
          isRentable: editItem.isRentable,
        })
        setImagePreview(editItem.imageUrl || '')
      } else {
        setForm(EMPTY_FORM)
        setImagePreview('')
      }
      setImageFile(null)
      setUploadProgress(0)
    }
  }, [open, editItem])

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const itemData = {
        name: form.name.trim(),
        category: form.category,
        price: form.isRentable ? 0 : Number(form.price),
        rentalPrice: form.isRentable && form.rentalPrice ? Number(form.rentalPrice) : undefined,
        deposit: form.deposit ? Number(form.deposit) : undefined,
        stock: 1,
        available: 1,
        description: form.description.trim(),
        isRentable: form.isRentable,
        tags: [],
        imageUrl: editItem?.imageUrl || '',
      }

      if (editItem) {
        let imageUrl = editItem.imageUrl || ''
        if (imageFile) {
          try {
            imageUrl = await uploadInventoryImage(imageFile, editItem.id, setUploadProgress)
          } catch (uploadErr: any) {
            console.error('Image upload error:', uploadErr)
            toast.error(uploadErr?.message || 'Image upload failed — item saved without image')
          }
        }
        await updateInventoryItem(editItem.id, { ...itemData, imageUrl, available: editItem.available })
        toast.success('Item updated successfully')
      } else {
        const docRef = await addInventoryItem({ ...itemData, imageUrl: '' })
        if (imageFile) {
          try {
            const imageUrl = await uploadInventoryImage(imageFile, docRef.id, setUploadProgress)
            await updateInventoryItem(docRef.id, { imageUrl })
          } catch (uploadErr: any) {
            console.error('Image upload error:', uploadErr)
            toast.error(uploadErr?.message || 'Image upload failed — item saved without image')
          }
        }
        toast.success('Item added successfully')
      }
      onClose()
    } catch (err: any) {
      console.error('Save item error:', err)
      toast.error(err?.message || 'Failed to save item')
    } finally {
      setLoading(false)
      setUploadProgress(0)
    }
  }

  const inputClass = 'w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all'

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="relative bg-card border border-border rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto luxury-shadow-lg scrollbar-thin"
          >
            {/* Header with rental toggle top-left */}
            <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-card z-10">
              <div className="flex items-center gap-3">
                {rentalEnabled && (
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <div
                      onClick={() => setForm(f => ({ ...f, isRentable: !f.isRentable }))}
                      className={cn(
                        'w-9 h-5 rounded-full transition-colors relative shrink-0',
                        form.isRentable ? 'bg-foreground' : 'bg-muted'
                      )}
                    >
                      <div className={cn(
                        'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform',
                        form.isRentable ? 'translate-x-4' : 'translate-x-0.5'
                      )} />
                    </div>
                    <span className="text-sm font-medium text-foreground">Rental Outfit</span>
                  </label>
                )}
              </div>
              <div className="flex items-center gap-3">
                <h2 className="text-base font-semibold text-foreground">
                  {editItem ? 'Edit Item' : 'Add New Item'}
                </h2>
                <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
                  <X size={20} />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Image upload */}
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Product Image</label>
                <div
                  onClick={() => fileRef.current?.click()}
                  className={cn(
                    'h-36 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-foreground/30 transition-colors',
                    imagePreview ? 'p-0 overflow-hidden' : 'gap-2'
                  )}
                >
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" className="h-full w-full object-cover rounded-xl" />
                  ) : (
                    <>
                      <ImageIcon size={24} className="text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Click to upload image</p>
                    </>
                  )}
                </div>
                <input ref={fileRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-foreground rounded-full"
                      animate={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                )}
              </div>

              {/* Name */}
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Item Name *</label>
                <input
                  required
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Bridal Lehenga Set"
                  className={inputClass}
                />
              </div>

              {/* Category */}
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Category *</label>
                <select
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value as InventoryItem['category'] }))}
                  className={inputClass}
                >
                  {CATEGORIES.filter(c => c.value !== 'all').map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              {/* Price — stitching always shown; rental price only when rental enabled and toggled on */}
              <div className={cn('grid gap-3', rentalEnabled && form.isRentable ? 'grid-cols-1' : 'grid-cols-2')}>
                {(!rentalEnabled || !form.isRentable) && (
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Stitching Price (₹) *</label>
                    <input
                      required={!rentalEnabled || !form.isRentable}
                      type="number"
                      value={form.price}
                      onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                      placeholder="2500"
                      min={0}
                      className={inputClass}
                    />
                  </div>
                )}
                {rentalEnabled && form.isRentable && (
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Rental Price (₹) *</label>
                    <input
                      required={rentalEnabled && form.isRentable}
                      type="number"
                      value={form.rentalPrice}
                      onChange={e => setForm(f => ({ ...f, rentalPrice: e.target.value }))}
                      placeholder="1500"
                      min={0}
                      className={inputClass}
                    />
                  </div>
                )}
              </div>

              {/* Deposit — only for rental */}
              {rentalEnabled && form.isRentable && (
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Deposit (₹)</label>
                  <input
                    type="number"
                    value={form.deposit}
                    onChange={e => setForm(f => ({ ...f, deposit: e.target.value }))}
                    placeholder="5000"
                    min={0}
                    className={inputClass}
                  />
                </div>
              )}

              {/* Description */}
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Brief description..."
                  rows={2}
                  className={cn(inputClass, 'resize-none')}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 border border-border rounded-xl text-sm font-medium text-foreground hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-60"
                >
                  {loading && <Loader2 size={15} className="animate-spin" />}
                  {editItem ? 'Update Item' : 'Add Item'}
                </motion.button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
