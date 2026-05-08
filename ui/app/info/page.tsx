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
        <p className="text-gray-300">Have a great experience and take the opportunity to connect with others!</p>
      </Card>
      
      {/* Venue */}
      <Card className="p-4 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span role="img" aria-label="building" className="text-2xl">🏢</span>
          <h2 className="text-xl font-semibold">Venue</h2>
        </div>
        
        {/* Location */}
        <div className="mb-4">
          <h3 className="text-base font-medium mb-2">Location</h3>
          <Link 
            href="https://maps.app.goo.gl/J4QcgyZubF2dDZjWA" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="flex items-center text-gray-300 hover:text-white transition-colors">
            <span className="mr-1">Cluj Arena, 
              Aleea Stadionului 2, 400375 Cluj-Napoca</span>
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
        
        {/* Access Times */}
        <div>
          <h3 className="text-base font-medium mb-2">Access Times</h3>
          <ul className="space-y-2 text-gray-300">
            <li><span className="font-medium">Wednesday, May 13:</span> 10:00 AM - 7:00 PM</li>
            <li><span className="font-medium">Thursday, May 14:</span> 10:00 AM - 9:00 PM</li>
          </ul>
        </div>
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
          <p className="text-gray-300"><span className="font-medium">Password:</span> welcome2026</p>
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
          <li>Main Stage (2nd floor)</li>
          <li>Workshop Room (3rd floor)</li>
          <li>Tech Stage (3rd floor)</li>
          <li>Business Stage (4th floor)</li>
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
          <li><span className="font-medium">Keynotes:</span> 30 minutes</li>
          <li><span className="font-medium">Panels:</span> 60 minutes</li>
          <li><span className="font-medium">Workshops:</span> 60 minutes</li>
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
          <li>Questions can be asked verbally - raise your hand and someone will pass you the microphone.</li>
        </ul>
      </Card>
      
      {/* Food */}
      <Card className="p-4 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span role="img" aria-label="food" className="text-2xl">🍽️</span>
          <h2 className="text-xl font-semibold">Food & Refreshments (3rd floor)</h2>
        </div>
        <p className="text-gray-300 mb-2"><span className="font-medium">Food Court:</span>
         Lunch will be served every day between ~12:15 - 2:15 PM. <br/>We have packed a variety of food, with something for every taste and a chance to take a break, relax, and enjoy.</p>
        <p className="text-gray-300"><span className="font-medium">Refreshments Bar:</span> Swing by anytime for a refreshing drink- water, juices, and soft beverages are here to keep you feeling good and energized throughout the day.</p>
        <p className="text-gray-300"><span className="font-medium">Matcha Cart:</span> Take a moment to slow down with a carefully prepared matcha latte or tea - something a little different to help you reset and recharge - brought to you by our partners: matcha.xyz powered by 0x</p>
        <p className="text-gray-300"><span className="font-medium">Chill & Lounge terrace:</span> Step outside, take a breath, and slow things down for a moment. This is your space to unwind, have a quiet chat, or simply enjoy the fresh air between sessions.</p>
        
        <p className="text-gray-300">Coffee and refreshments will be available throughout the event.</p>
      </Card>
      
      {/* External Links */}
      <Card className="p-4 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span role="img" aria-label="links" className="text-2xl">🔗</span>
          <h2 className="text-xl font-semibold">Links</h2>
        </div>
        <div className="space-y-3">
          <Link href="https://lu.ma/ETHCluj2026" target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-2 bg-gray-800 rounded-md">
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
