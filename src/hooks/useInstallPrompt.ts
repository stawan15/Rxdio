import { useEffect, useState } from 'react'

type InstallEvent = Event & { prompt: () => Promise<void> }

export function useInstallPrompt() {
  const [event, setEvent] = useState<InstallEvent | null>(null)

  useEffect(() => {
    const onPrompt = (e: Event) => { e.preventDefault(); setEvent(e as InstallEvent) }
    const onInstalled = () => setEvent(null)
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const standalone = window.matchMedia('(display-mode: standalone)').matches || ('standalone' in navigator && navigator.standalone === true)
  const iosSafari = /iphone|ipad|ipod/i.test(navigator.userAgent) && !standalone

  return {
    canInstall: event !== null,
    /** iOS has no install prompt — show manual instructions instead */
    showIosHint: iosSafari,
    install: async () => { await event?.prompt(); setEvent(null) },
  }
}
