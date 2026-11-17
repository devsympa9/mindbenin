"use client"

import { useEffect } from "react"

/** Enregistre le service worker : permet d'afficher une page hors-ligne claire. */
export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined)
    }

    if (document.readyState === "complete") {
      register()
      return
    }

    window.addEventListener("load", register)
    return () => window.removeEventListener("load", register)
  }, [])

  return null
}
