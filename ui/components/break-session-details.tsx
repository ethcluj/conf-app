"use client"

import { Clock, MapPin } from "lucide-react"
import { type Session, formatSessionDateTime, getFullStageName } from "@/lib/data"

interface BreakSessionDetailsProps {
  session: Session
}

export function BreakSessionDetails({ session }: BreakSessionDetailsProps) {
  // Get the appropriate message based on the session title
  const getBreakMessage = (title: string): { message: string; icon: string } => {
    const normalizedTitle = title.toLowerCase().trim()
    
    if (normalizedTitle.includes("doors open")) {
      return {
        message: "Welcome to ETHCluj 2025! Registration is now open. Please collect your wristband, badge and food voucher at the check-in desk on the ground floor.",
        icon: "🚪"
      }
    } else if (normalizedTitle.includes("coffee")) {
      return {
        message: "gm. Let's start with a break! Coffee and refreshments are available in the sponsors area on the ground floor.",
        icon: "☕"
      }
    } else if (normalizedTitle.includes("lunch")) {
      return {
        message: "Time to eat something. Head to the cafeteria on the first floor. Don't forget your food voucher!",
        icon: "🍽️"
      }
    } else if (normalizedTitle.includes("break")) {
      return {
        message: "Take a short break. Refreshments are available in the main hall.",
        icon: "⏱️"
      }
    } else {
      return {
        message: "@Cluj Arena - VIP Lounge!",
        icon: "✨"
      }
    }
  }

  const { message, icon } = getBreakMessage(session.title)

  // Get the location for this break session
  const location = getFullStageName(session.stage, session.title);

  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="text-6xl mb-6">{icon}</div>
      <p className="text-lg max-w-md mx-auto text-gray-300 mb-4">{message}</p>
      
      <div className="flex items-center justify-center mt-2 bg-[#1d2430] px-4 py-2 rounded-full">
        <MapPin className="h-5 w-5 mr-2 text-red-500" />
        <div className="text-sm font-medium">{location}</div>
      </div>
    </div>
  )
}
