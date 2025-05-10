import { Bell } from "lucide-react"
import { ScrollHideHeader } from "@/components/scroll-hide-header"

export default function NotificationsPage() {
  return (
    <div className="min-h-screen bg-[#0d1117] text-white pb-20">
      <ScrollHideHeader>
        <div className="container mx-auto max-w-md px-4 py-6">
          <header className="mb-6">
            <h1 className="text-2xl font-bold">Notifications</h1>
          </header>
        </div>
      </ScrollHideHeader>

      <div className="container mx-auto max-w-md px-4">
        <div className="pt-24">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Bell className="h-16 w-16 text-gray-600 mb-4" />
            <h3 className="text-xl font-medium mb-2">No notifications for now</h3>
            <p className="text-gray-400">Check back later for updates</p>
          </div>
        </div>
      </div>
    </div>
  )
}

