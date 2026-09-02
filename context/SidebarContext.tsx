'use client'

import React, { createContext, useContext, useState } from 'react'

interface SidebarContextValue {
  isMobileOpen: boolean
  toggleMobileSidebar: () => void
  closeMobileSidebar: () => void
}

const SidebarContext = createContext<SidebarContextValue | undefined>(undefined)

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  return (
    <SidebarContext.Provider
      value={{
        isMobileOpen,
        toggleMobileSidebar: () => setIsMobileOpen((v) => !v),
        closeMobileSidebar: () => setIsMobileOpen(false),
      }}
    >
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  const ctx = useContext(SidebarContext)
  if (!ctx) throw new Error('useSidebar must be used within SidebarProvider')
  return ctx
}
