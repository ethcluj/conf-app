"use client"

import { useState, useEffect } from "react"
import { ArrowUp } from "lucide-react"

interface JumpToNowProps {
  onJump: () => void
}

export function JumpToNow({ onJump }: JumpToNowProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      // Show button when user has scrolled down a bit
      setVisible(window.scrollY > 300)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  if (!visible) return null

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  return (
    <button
      onClick={scrollToTop}
      className="fixed left-1/2 transform -translate-x-1/2 bottom-24 z-30 bg-red-600 text-white rounded-full p-3 shadow-lg flex items-center justify-center"
      aria-label="Scroll to top"
    >
      <ArrowUp className="h-5 w-5" />
    </button>
  )
}

