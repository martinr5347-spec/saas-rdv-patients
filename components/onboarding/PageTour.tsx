'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { EVENTS, STATUS, type EventData, type Step } from 'react-joyride'
import { useOnboardingTour, type OnboardingTourTarget } from '@/context/OnboardingTourContext'

// Chargee uniquement cote client -- react-joyride touche window/document des le rendu, impossible
// a prerendre cote serveur (cf. prompt onboarding-tour-guide).
const Joyride = dynamic(() => import('react-joyride').then((mod) => mod.Joyride), { ssr: false })

// Composant generique monte une fois par page concernee (+ une fois dans DashboardChrome.tsx pour
// 'sidebar', seul endroit ou la sidebar est montee en permanence). Gere a la fois le declenchement
// automatique (une seule fois, jamais si onboarding_disabled) et le rejeu manuel force depuis le
// menu "?" du Header (OnboardingTourContext.requestTour), qui ignore l'etat "deja vu"/desactive.
export default function PageTour({
  target,
  steps,
  enabled = true,
}: {
  target: OnboardingTourTarget
  steps: Step[]
  enabled?: boolean
}) {
  const t = useTranslations('dashboard.onboardingTour.common')
  const { state, tourRequest, consumeTourRequest, markSidebarSeen, markPageSeen } = useOnboardingTour()
  const [run, setRun] = useState(false)

  useEffect(() => {
    if (!enabled) return
    if (tourRequest?.target === target) {
      setRun(true)
      return
    }
    if (state.disabled) return
    const alreadySeen = target === 'sidebar' ? state.sidebarSeen : state.pagesSeen.includes(target)
    if (!alreadySeen) setRun(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourRequest, enabled])

  if (!enabled || steps.length === 0) return null

  const handleEvent = (data: EventData) => {
    if (data.type !== EVENTS.TOUR_END) return
    setRun(false)
    consumeTourRequest(target)
    // "compter comme vu seulement s'il a ete reellement termine ou explicitement Saltar" (cf.
    // prompt) -- un TOUR_END pour toute autre raison (navigation, overlay, erreur de cible) ne
    // marque jamais la page/sidebar comme vue.
    if (data.status === STATUS.FINISHED || data.status === STATUS.SKIPPED) {
      if (target === 'sidebar') markSidebarSeen()
      else markPageSeen(target)
    }
  }

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      scrollToFirstStep
      locale={{
        back: t('back'),
        close: t('close'),
        last: t('last'),
        next: t('next'),
        nextWithProgress: t('nextWithProgress'),
        skip: t('skip'),
      }}
      options={{
        primaryColor: '#6926D2',
        zIndex: 9999,
        buttons: ['back', 'close', 'skip', 'primary'],
        showProgress: true,
        // Sans ca, chaque step (hors "welcome" en placement 'center') n'affiche d'abord qu'un
        // beacon cliquable avant la bulle d'explication -- jamais ce qu'on veut pour un tour
        // declenche automatiquement (cf. bug trouve en testant le tour "Pacientes").
        skipBeacon: true,
      }}
      onEvent={handleEvent}
    />
  )
}
