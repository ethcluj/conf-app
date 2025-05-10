"use client"

import { Home, Star, Bell } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

export function BottomNavigation() {
  const pathname = usePathname()

  const tabs = [
    {
      name: "Home",
      href: "/",
      icon: Home,
    },
    {
      name: "Favourites",
      href: "/favourites",
      icon: Star,
    },
    {
      name: "Notifications",
      href: "/notifications",
      icon: Bell,
    },
  ]

  return (
    <div className="fixed bottom-0 left-0 right-0 z-10 bg-[#161b22] border-t border-gray-800">
      <div className="container mx-auto max-w-md px-4">
        <div className="flex w-full">
          {tabs.map((tab) => {
            const isActive = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href)

            return (
              <Link
                key={tab.name}
                href={tab.href}
                className={cn(
                  "flex flex-col items-center justify-center py-3 w-1/3 text-center",
                  isActive ? "text-red-600" : "text-gray-400",
                )}
              >
                <tab.icon className="h-6 w-6 mb-1" />
                <span className="text-xs">{tab.name}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}

