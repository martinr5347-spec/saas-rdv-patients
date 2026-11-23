'use client'

import React, { createContext, useCallback, useContext, useRef, useState } from 'react'

// Les 7 pages de navigation + 'paciente_detalle' (fiche patient, atteignable depuis "Pacientes"
// mais pas elle-meme un item de nav) -- meme liste que VALID_PAGE_IDS de
// app/api/users/me/onboarding/route.ts, a garder synchronisee si un id est ajoute/retire.
export type OnboardingPageId =
  | 'inicio'
  | 'pacientes'
  | 'citas'
  // Non listee dans le prompt d'origine (qui ne decrivait que 8 ids alors que la fiche d'un RDV a
  // son propre contenu de tour distinct de "citas") -- ajoutee pour que cette page ait, comme les
  // autres, son propre etat "vu" independant.
  | 'cita_detalle'
  | 'ingresos'
  | 'analisis'
  | 'disponibilidad'
  | 'configuracion'
  | 'paciente_detalle'

export type OnboardingTourTarget = 'sidebar' | OnboardingPageId

interface OnboardingState {
  sidebarSeen: boolean
  pagesSeen: OnboardingPageId[]
  disabled: boolean
}

interface TourRequest {
  target: OnboardingTourTarget
  nonce: number
}

interface OnboardingTourContextValue {
  state: OnboardingState
  tourRequest: TourRequest | null
  // Rejeu manuel depuis le menu "?" du Header -- force le declenchement peu importe
  // onboarding_pages_seen/onboarding_disabled (cf. prompt : "Cliquer une entree de tour la
  // redeclenche immediatement").
  requestTour: (target: OnboardingTourTarget) => void
  consumeTourRequest: (target: OnboardingTourTarget) => void
  markSidebarSeen: () => void
  markPageSeen: (page: OnboardingPageId) => void
  setDisabled: (disabled: boolean) => void
}

const OnboardingTourContext = createContext<OnboardingTourContextValue | undefined>(undefined)

function persist(patch: { sidebarSeen?: true; pageSeen?: OnboardingPageId; disabled?: boolean }) {
  fetch('/api/users/me/onboarding', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  }).catch(() => {})
}

export function OnboardingTourProvider({
  initialState,
  children,
}: {
  initialState: OnboardingState
  children: React.ReactNode
}) {
  const [state, setState] = useState(initialState)
  const [tourRequest, setTourRequest] = useState<TourRequest | null>(null)
  const nonceRef = useRef(0)

  const requestTour = useCallback((target: OnboardingTourTarget) => {
    nonceRef.current += 1
    setTourRequest({ target, nonce: nonceRef.current })
  }, [])

  // N'efface la requete en attente que si elle cible bien le tour qui vient de la consommer --
  // evite qu'un second <PageTour> monte au meme moment (jamais le cas aujourd'hui, mais sans risque)
  // n'efface une requete qui ne lui etait pas destinee.
  const consumeTourRequest = useCallback((target: OnboardingTourTarget) => {
    setTourRequest((current) => (current?.target === target ? null : current))
  }, [])

  const markSidebarSeen = useCallback(() => {
    setState((s) => {
      if (s.sidebarSeen) return s
      persist({ sidebarSeen: true })
      return { ...s, sidebarSeen: true }
    })
  }, [])

  const markPageSeen = useCallback((page: OnboardingPageId) => {
    setState((s) => {
      if (s.pagesSeen.includes(page)) return s
      persist({ pageSeen: page })
      return { ...s, pagesSeen: [...s.pagesSeen, page] }
    })
  }, [])

  const setDisabled = useCallback((disabled: boolean) => {
    setState((s) => ({ ...s, disabled }))
    persist({ disabled })
  }, [])

  return (
    <OnboardingTourContext.Provider
      value={{ state, tourRequest, requestTour, consumeTourRequest, markSidebarSeen, markPageSeen, setDisabled }}
    >
      {children}
    </OnboardingTourContext.Provider>
  )
}

export function useOnboardingTour() {
  const ctx = useContext(OnboardingTourContext)
  if (!ctx) throw new Error('useOnboardingTour must be used within OnboardingTourProvider')
  return ctx
}
