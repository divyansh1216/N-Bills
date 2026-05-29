'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import Sidebar from './Sidebar'

interface HeaderProps {
  title: string
}

export default function Header({ title }: HeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { theme, setTheme } = useTheme()

  return (
    <>
      <header className="sticky top-0 z-20 flex items-center gap-4 h-14 px-4 bg-background/95 backdrop-blur-sm border-b border-border">
        {/* Mobile menu */}
        <button
          onClick={() => setMobileOpen(true)}
          className="lg:hidden text-muted-foreground hover:text-foreground transition-colors p-1"
        >
          <Menu size={20} />
        </button>

        {/* Title */}
        <h2 className="text-base font-semibold text-foreground flex-1 truncate">{title}</h2>

        {/* Theme toggle */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="text-muted-foreground hover:text-foreground transition-colors p-2 rounded-lg hover:bg-muted"
        >
          {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </button>
      </header>

      {/* Mobile sidebar drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-30 bg-black/60 lg:hidden"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 350, damping: 40 }}
              className="fixed left-0 top-0 bottom-0 z-40 w-64 lg:hidden"
            >
              <Sidebar mobile onClose={() => setMobileOpen(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
