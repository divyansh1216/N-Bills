'use client'

import { useState, useMemo } from 'react'
import { Plus, LayoutGrid, List, Search, Filter } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { orderBy } from 'firebase/firestore'
import Header from '@/components/layout/Header'
import InventoryCard from '@/components/inventory/InventoryCard'
import AddItemModal from '@/components/inventory/AddItemModal'
import { CardSkeleton } from '@/components/ui/skeleton'
import { useFirestoreCollection } from '@/hooks/useFirestoreCollection'
import { deleteInventoryItem } from '@/firebase/firestore'
import { CATEGORIES } from '@/lib/constants'
import { useDebounce } from '@/hooks/useDebounce'
import type { InventoryItem, ViewMode } from '@/types'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/formatters'
import { useShopSettings } from '@/contexts/ShopSettingsContext'

export default function InventoryPage() {
  const { rentalEnabled } = useShopSettings()
  const { data: items, loading } = useFirestoreCollection<InventoryItem>('inventory', [orderBy('createdAt', 'desc')])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<string>('all')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [modalOpen, setModalOpen] = useState(false)
  const [editItem, setEditItem] = useState<InventoryItem | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const debouncedSearch = useDebounce(search, 250)

  const filtered = useMemo(() => {
    return items.filter(item => {
      const matchSearch = !debouncedSearch ||
        item.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        item.category.toLowerCase().includes(debouncedSearch.toLowerCase())
      const matchCategory = category === 'all' || item.category === category
      return matchSearch && matchCategory
    })
  }, [items, debouncedSearch, category])

  function handleEdit(item: InventoryItem) {
    setEditItem(item)
    setModalOpen(true)
  }

  async function handleDelete(id: string) {
    try {
      await deleteInventoryItem(id)
      toast.success('Item deleted')
    } catch {
      toast.error('Failed to delete item')
    }
    setConfirmDelete(null)
  }

  return (
    <div>
      <Header title="Inventory" />
      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">

        {/* Top stats */}
        <div className={cn('grid gap-3', rentalEnabled ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2')}>
          {[
            { label: 'Total Items', value: items.length.toString() },
            { label: 'Categories', value: new Set(items.map(i => i.category)).size.toString() },
            ...(rentalEnabled ? [{ label: 'Rental Items', value: items.filter(i => i.isRentable).length.toString() }] : []),
          ].map(stat => (
            <div key={stat.label} className="bg-card border border-border rounded-xl p-4 luxury-shadow">
              <p className="text-xs text-muted-foreground mb-1">{stat.label}</p>
              <p className="text-xl font-bold text-foreground">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 flex items-center gap-2 bg-card border border-border rounded-xl px-3 py-2.5 luxury-shadow">
            <Search size={16} className="text-muted-foreground shrink-0" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search items..."
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
            />
          </div>

          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="px-3 py-2.5 bg-card border border-border rounded-xl text-sm text-foreground outline-none luxury-shadow"
          >
            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>

          <div className="flex gap-1 bg-card border border-border rounded-xl p-1 luxury-shadow">
            {([['grid', LayoutGrid], ['list', List]] as const).map(([mode, Icon]) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={cn(
                  'p-2 rounded-lg transition-colors',
                  viewMode === mode ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon size={16} />
              </button>
            ))}
          </div>

          <motion.button
            onClick={() => { setEditItem(null); setModalOpen(true) }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Plus size={16} />
            Add Item
          </motion.button>
        </div>

        {/* Results count */}
        <p className="text-sm text-muted-foreground">
          {loading ? 'Loading...' : `${filtered.length} item${filtered.length !== 1 ? 's' : ''}`}
        </p>

        {/* Grid view */}
        {viewMode === 'grid' && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
            {loading
              ? Array.from({ length: 8 }).map((_, i) => <CardSkeleton key={i} />)
              : filtered.map((item, i) => (
                <InventoryCard
                  key={item.id}
                  item={item}
                  onEdit={handleEdit}
                  onDelete={id => setConfirmDelete(id)}
                  delay={i * 0.04}
                />
              ))}
          </div>
        )}

        {/* List view */}
        {viewMode === 'list' && (
          <div className="bg-card border border-border rounded-2xl overflow-hidden luxury-shadow">
            <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Item</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 hidden sm:table-cell">Category</th>
                  <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">Price</th>
                  <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3 hidden md:table-cell">Type</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="border-b border-border">
                      {Array.from({ length: 6 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 bg-muted rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  filtered.map((item, i) => (
                    <motion.tr
                      key={item.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
                            {item.name.slice(0, 2).toUpperCase()}
                          </div>
                          <span className="text-sm font-medium text-foreground truncate max-w-[140px]">{item.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className="text-xs px-2 py-0.5 bg-muted rounded-md text-muted-foreground capitalize">{item.category}</span>
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-medium text-foreground">
                        {formatCurrency(item.isRentable ? (item.rentalPrice || 0) : item.price)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-muted-foreground hidden md:table-cell">
                        {item.isRentable ? 'Rental' : 'Stitching'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => handleEdit(item)} className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors">
                            <motion.span whileHover={{ scale: 1.1 }} className="block">
                              ✏️
                            </motion.span>
                          </button>
                          <button onClick={() => setConfirmDelete(item.id)} className="p-1.5 text-muted-foreground hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors text-xs">
                            🗑️
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>

            {!loading && filtered.length === 0 && (
              <div className="text-center py-12 text-muted-foreground text-sm">
                No items found. Add your first item!
              </div>
            )}
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <AddItemModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditItem(null) }}
        editItem={editItem}
      />

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
              <h3 className="text-base font-semibold text-foreground mb-2">Delete Item?</h3>
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
