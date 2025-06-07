"use client"

import { Clock } from "lucide-react"
import { type Session, formatSessionDateTime } from "@/lib/data"

interface BreakSessionDetailsProps {
  session: Session
}

export function BreakSessionDetails({ session }: BreakSessionDetailsProps) {
  // Get the appropriate message based on the session title
  const getBreakMessage = (title: string): { message: string; icon: string } => {
    const normalizedTitle = title.toLowerCase().trim()
    
    if (normalizedTitle.includes("doors open")) {
      return {
        message: "Welcome to ETHCluj 2025! Registration is now open. Please collect your badge and welcome pack at the registration desk.",
        icon: "🚪"
      }
    } else if (normalizedTitle.includes("coffee")) {
      return {
        message: "Good morning. Let's start with a break! Coffee and refreshments are available in the main hall.",
        icon: "☕"
      }
    } else if (normalizedTitle.includes("lunch")) {
      return {
        message: "Time to eat something. Go to the cafeteria. Don't forget your food voucher!",
        icon: "🍽️"
      }
    } else if (normalizedTitle.includes("break")) {
      return {
        message: "Take a short break. Refreshments are available in the main hall.",
        icon: "⏱️"
      }
    } else {
      return {
        message: "Break time. Enjoy!",
        icon: "✨"
      }
    }
  }

  const { message, icon } = getBreakMessage(session.title)

  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="text-6xl mb-6">{icon}</div>
      <p className="text-lg max-w-md mx-auto text-gray-300">{message}</p>
    </div>
  )
}
