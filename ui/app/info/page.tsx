"use client"

import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ExternalLink, Wifi } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

export default function InfoPage() {
  return (
    <div className="container mx-auto max-w-md px-4 pb-24 pt-8">
      <h1 className="text-2xl font-bold mb-6">Conference Information</h1>
      
      {/* Welcome */}
      <Card className="p-4 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span role="img" aria-label="wave" className="text-2xl">👋</span>
          <h2 className="text-xl font-semibold">Welcome!</h2>
        </div>
        <p className="text-gray-300">Have a great experience and take the opportunity to connect with others.</p>
      </Card>
      
      {/* Venue Access */}
      <Card className="p-4 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span role="img" aria-label="building" className="text-2xl">🏢</span>
          <h2 className="text-xl font-semibold">Venue Access Times</h2>
        </div>
        <ul className="space-y-2 text-gray-300">
          <li><span className="font-medium">Thursday:</span> 1:00 PM - 6:00 PM</li>
          <li><span className="font-medium">Friday:</span> 10:00 AM - 6:00 PM</li>
          <li><span className="font-medium">Saturday:</span> 10:00 AM - 5:00 PM</li>
        </ul>
      </Card>
      
      {/* Rules */}
      <Card className="p-4 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span role="img" aria-label="rules" className="text-2xl">📜</span>
          <h2 className="text-xl font-semibold">Rules</h2>
        </div>
        <ul className="list-disc pl-5 space-y-2 text-gray-300">
          <li>Wear your wristband at all times.</li>
          <li>If you do not want to be filmed or photographed, ask for a privacy lanyard (red) at the check-in desk.</li>
          <li>Please respect others' desire for privacy.</li>
        </ul>
      </Card>
      
      {/* WiFi */}
      <Card className="p-4 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span role="img" aria-label="wifi" className="text-2xl">🛜</span>
          <h2 className="text-xl font-semibold">WiFi</h2>
        </div>
        <div className="bg-gray-800 p-3 rounded-md">
          <p className="text-gray-300"><span className="font-medium">Network:</span> ETHCluj</p>
          <p className="text-gray-300"><span className="font-medium">Password:</span> welcome2025</p>
        </div>
      </Card>
      
      {/* Stages */}
      <Card className="p-4 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span role="img" aria-label="stage" className="text-2xl">🎤</span>
          <h2 className="text-xl font-semibold">Stages</h2>
        </div>
        <p className="text-gray-300 mb-2">We have four stages:</p>
        <ul className="list-disc pl-5 space-y-1 text-gray-300">
          <li>Main Stage (3rd floor)</li>
          <li>Business Room (3rd floor)</li>
          <li>Workshop Room (3rd floor)</li>
          <li>Tech Stage (1st floor)</li>
        </ul>
      </Card>
      
      {/* Tracks */}
      <Card className="p-4 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span role="img" aria-label="tracks" className="text-2xl">🛤️</span>
          <h2 className="text-xl font-semibold">Tracks</h2>
        </div>
        <ul className="list-disc pl-5 space-y-1 text-gray-300">
          <li>Builders Onboarding</li>
          <li>Ethereum Roadmap</li>
          <li>AI and Ethereum</li>
          <li>Business on Ethereum</li>
          <li>Usability and Adoption</li>
          <li>Privacy</li>
          <li>Decentralized Finance</li>
          <li>Philosophy & Community</li>
        </ul>
      </Card>
      
      {/* Difficulty Levels */}
      <Card className="p-4 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span role="img" aria-label="difficulty" className="text-2xl">🎯</span>
          <h2 className="text-xl font-semibold">Difficulty Levels</h2>
        </div>
        <div className="space-y-3 mt-3">
          <div>
            <span className="rounded-full bg-green-600 px-4 py-1 text-sm font-medium">For Everyone</span>
            <p className="mt-1 text-sm text-gray-300">Accessible and engaging for all levels</p>
          </div>
          <div>
            <span className="rounded-full bg-blue-600 px-4 py-1 text-sm font-medium">Beginner</span>
            <p className="mt-1 text-sm text-gray-300">New here</p>
          </div>
          <div>
            <span className="rounded-full bg-orange-500 px-4 py-1 text-sm font-medium">Intermediate</span>
            <p className="mt-1 text-sm text-gray-300">Have a good understanding of the topics</p>
          </div>
          <div>
            <span className="rounded-full bg-red-600 px-4 py-1 text-sm font-medium">Advanced</span>
            <p className="mt-1 text-sm text-gray-300">Says it all - for the advanced</p>
          </div>
        </div>
      </Card>
      
      {/* Session Formats */}
      <Card className="p-4 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span role="img" aria-label="session formats" className="text-2xl">🎙️</span>
          <h2 className="text-xl font-semibold">Session Formats</h2>
        </div>
        <ul className="space-y-2 text-gray-300">
          <li><span className="font-medium">Keynotes:</span> 20min + 5min Q&A</li>
          <li><span className="font-medium">Panels:</span> 45min + 10min Q&A</li>
          <li><span className="font-medium">Workshops:</span> 50min</li>
        </ul>
      </Card>
      
      {/* QnA */}
      <Card className="p-4 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span role="img" aria-label="questions" className="text-2xl">❓</span>
          <h2 className="text-xl font-semibold">Q&A</h2>
        </div>
        <p className="text-gray-300 mb-2">We encourage you to speak out and ask questions.</p>
        <ul className="list-disc pl-5 space-y-2 text-gray-300">
          <li>Use the App to ask questions - scan the QR code at the stage or join Q&A from the session screen (scroll to the bottom).</li>
          <li>We are recognizing attendees who ask the most engaging questions. Good questions receive points. Check the leaderboard tab.</li>
          <li>Questions can be asked verbally too - raise your hand and someone will pass you the microphone.</li>
        </ul>
      </Card>
      
      {/* Food */}
      <Card className="p-4 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span role="img" aria-label="food" className="text-2xl">🍽️</span>
          <h2 className="text-xl font-semibold">Food & Refreshments</h2>
        </div>
        <p className="text-gray-300 mb-2"><span className="font-medium">Lunch:</span> Friday and Saturday at 1:00 PM. Have your food voucher with you.</p>
        <p className="text-gray-300">Coffee and refreshments will be available throughout the event.</p>
      </Card>
      
      {/* External Links */}
      <Card className="p-4 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span role="img" aria-label="links" className="text-2xl">🔗</span>
          <h2 className="text-xl font-semibold">Links</h2>
        </div>
        <div className="space-y-3">
          <Link href="https://lu.ma/ETHCluj2025" target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-2 bg-gray-800 rounded-md">
            <span className="text-gray-300">Side Events</span>
            <ExternalLink className="h-4 w-4 text-gray-400" />
          </Link>
          
          <Link href="https://lu.ma/cop3p4nx" target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-2 bg-gray-800 rounded-md">
            <span className="text-gray-300">Closing Party</span>
            <ExternalLink className="h-4 w-4 text-gray-400" />
          </Link>
          
          <Link href="https://docs.google.com/document/d/e/2PACX-1vRBlE2cXQ77ekZGNU7KnsxPkRHTgiLzTICGFt_j110kg9wexeaWe-a9T1KTdq3byS0qEp03ay0TQL-I/pub" target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-2 bg-gray-800 rounded-md">
            <span className="text-gray-300">Code of Conduct</span>
            <ExternalLink className="h-4 w-4 text-gray-400" />
          </Link>
          
          <Link href="https://docs.google.com/document/d/e/2PACX-1vTAHCUvqKt-U-jMM5EBQZ04mx_uX7Cu72ZIyGzKIRZeSoJTCrXT-JBrEs12rnU339nUDDjnEbooibAK/pub" target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-2 bg-gray-800 rounded-md">
            <span className="text-gray-300">Privacy Policy</span>
            <ExternalLink className="h-4 w-4 text-gray-400" />
          </Link>
        </div>
      </Card>
    </div>
  )
}
