"use client"

import { useState, useRef, useEffect } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { conferenceDays } from "@/lib/data"
import { isToday } from "@/lib/time-utils"

interface DateSelectorProps {
  selectedDate: Date
  onDateChange: (date: Date) => void
}

export function DateSelector({ selectedDate, onDateChange }: DateSelectorProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [showLeftScroll, setShowLeftScroll] = useState(false)
  const [showRightScroll, setShowRightScroll] = useState(true)

  // Check if scrolling is needed
  useEffect(() => {
    const checkScroll = () => {
      if (!scrollRef.current) return

      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current
      setShowLeftScroll(scrollLeft > 0)
      setShowRightScroll(scrollLeft + clientWidth < scrollWidth - 10)
    }

    checkScroll()

    const currentRef = scrollRef.current
    if (currentRef) {
      currentRef.addEventListener("scroll", checkScroll)
      return () => currentRef.removeEventListener("scroll", checkScroll)
    }
  }, [])

  // State to track current day (for client-side rendering)
  const [currentDays, setCurrentDays] = useState<number[]>([])
  
  // Update current day after component mounts (client-side only)
  useEffect(() => {
    // Check which days are "today" based on client-side time
    const todayIndices = conferenceDays
      .map((day, index) => isToday(day) ? index : -1)
      .filter(index => index !== -1)
    
    setCurrentDays(todayIndices)
  }, []) // Empty dependency array ensures this runs once after mount

  // Scroll to selected date
  useEffect(() => {
    if (!scrollRef.current) return

    const selectedIndex = conferenceDays.findIndex((day) => day.toDateString() === selectedDate.toDateString())

    if (selectedIndex >= 0) {
      const dateElements = scrollRef.current.querySelectorAll(".date-item")
      if (dateElements[selectedIndex]) {
        dateElements[selectedIndex].scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "center",
        })
      }
    }
  }, [selectedDate])

  const handleScroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return

    const scrollAmount = 150
    const newScrollLeft =
      direction === "left" ? scrollRef.current.scrollLeft - scrollAmount : scrollRef.current.scrollLeft + scrollAmount

    scrollRef.current.scrollTo({
      left: newScrollLeft,
      behavior: "smooth",
    })
  }

  const goToToday = () => {
    const today = conferenceDays.find((day) => isToday(day))
    if (today) {
      onDateChange(today)
    } else {
      // If today is not in conference days, go to first day
      onDateChange(conferenceDays[0])
    }
  }

  return (
    <div className="relative w-full">
      {showLeftScroll && (
        <button
          onClick={() => handleScroll("left")}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-gradient-to-r from-[#0d1117] to-transparent pr-4 pl-1 h-full flex items-center"
        >
          <ChevronLeft className="h-5 w-5 text-gray-400" />
        </button>
      )}

      <div
        ref={scrollRef}
        className="flex overflow-x-auto scrollbar-hide space-x-4 py-1 w-full justify-start -ml-4 pl-4"
      >
        {conferenceDays.map((day, index) => {
          // Hardcoded date labels
          const dateLabel = index === 0 ? "Jun 26" : index === 1 ? "Jun 27" : "Jun 28"
          const isCurrentDay = currentDays.includes(index) // Use client-side state instead of direct function call
          const isSelected = day.toDateString() === selectedDate.toDateString()

          return (
            <button
              key={index}
              onClick={() => onDateChange(day)}
              className={cn(
                "date-item w-[70px] px-2 py-1 rounded-lg text-xs font-medium transition-colors flex items-center justify-center",
                isSelected ? "bg-red-600 text-white" : "bg-[#161b22] text-gray-300 hover:bg-[#1c2330]",
                // Removed the border styling
              )}
            >
              <span className="whitespace-nowrap">{dateLabel}</span>
              {/* Only show the current day indicator on the client side after hydration */}
              {isCurrentDay && (
                <span
                  className={cn("ml-1.5 inline-block h-2 w-2 rounded-full animate-pulse", isSelected ? "bg-white" : "bg-red-600")}
                ></span>
              )}
            </button>
          )
        })}

      </div>

      {showRightScroll && (
        <button
          onClick={() => handleScroll("right")}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-gradient-to-l from-[#0d1117] to-transparent pl-4 pr-1 h-full flex items-center"
        >
          <ChevronRight className="h-5 w-5 text-gray-400" />
        </button>
      )}
    </div>
  )
}

