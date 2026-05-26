'use client'

import { motion } from 'framer-motion'
import { Edit2, Trash2, Tag } from 'lucide-react'
import type { InventoryItem } from '@/types'
import { formatCurrency } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import Image from 'next/image'

interface InventoryCardProps {
  item: InventoryItem
  onEdit: (item: InventoryItem) => void
  onDelete: (id: string) => void
  delay?: number
}

export default function InventoryCard({ item, onEdit, onDelete, delay = 0 }: InventoryCardProps) {

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="group bg-card border border-border rounded-2xl overflow-hidden luxury-shadow hover:luxury-shadow-lg transition-all duration-300 hover:-translate-y-0.5"
    >
      {/* Image / placeholder */}
      <div className="relative h-44 bg-muted overflow-hidden">
        {item.imageUrl ? (
          <Image
            src={item.imageUrl}
            alt={item.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="w-16 h-16 rounded-2xl bg-background/50 flex items-center justify-center">
              <span className="text-2xl font-bold text-muted-foreground">
                {item.name.slice(0, 2).toUpperCase()}
              </span>
            </div>
          </div>
        )}

        {/* Hover actions overlay */}
        <div className="absolute inset-0 glass-dark opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3">
          <button
            onClick={() => onEdit(item)}
            className="w-9 h-9 rounded-xl bg-white/20 hover:bg-white/30 transition-colors flex items-center justify-center text-white"
          >
            <Edit2 size={15} />
          </button>
          <button
            onClick={() => onDelete(item.id)}
            className="w-9 h-9 rounded-xl bg-red-500/20 hover:bg-red-500/40 transition-colors flex items-center justify-center text-red-300"
          >
            <Trash2 size={15} />
          </button>
        </div>

        {/* Category badge */}
        <span className="absolute top-3 left-3 text-xs font-medium bg-black/60 text-white/90 backdrop-blur-sm px-2.5 py-1 rounded-lg capitalize">
          {item.category}
        </span>

      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-foreground text-sm mb-1 truncate">{item.name}</h3>

        <div className="flex items-center justify-between mb-3">
          <span className="text-base font-bold text-foreground">{formatCurrency(item.price)}</span>
          {item.isRentable && item.rentalPrice && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Tag size={11} />
              Rental: {formatCurrency(item.rentalPrice)}
            </span>
          )}
        </div>

        {/* Tags */}
        <div className="flex gap-1 mt-3 flex-wrap">
          <span className="text-xs px-2 py-0.5 rounded-md bg-muted text-muted-foreground">Stitching</span>
          {item.isRentable && (
            <span className="text-xs px-2 py-0.5 rounded-md bg-muted text-muted-foreground">Rental</span>
          )}
        </div>
      </div>
    </motion.div>
  )
}
