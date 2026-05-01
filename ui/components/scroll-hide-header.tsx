"use client"

import { useState, useEffect, type ReactNode } from "react"
import { cn } from "@/lib/utils"

interface ScrollHideHeaderProps {
  children: ReactNode
  className?: string
}

export function ScrollHideHeader({ children, className }: ScrollHideHeaderProps) {
  const [isVisible, setIsVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const handleScroll = () => {
      const currentScrollY = window.scrollY

      // Show header when scrolling up or at the top
      if (currentScrollY <= 10 || currentScrollY < lastScrollY) {
        setIsVisible(true)
      }
      // Hide header when scrolling down and not at the top
      else if (currentScrollY > lastScrollY && currentScrollY > 10) {
        setIsVisible(false)
      }

      setLastScrollY(currentScrollY)
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [lastScrollY])

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 z-20 bg-[#0d1117] transition-transform duration-300 ease-in-out",
        mounted && (isVisible ? "transform-none" : "-translate-y-full"),
        className,
      )}
    >
      {children}
    </div>
  )
}

