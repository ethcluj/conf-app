"use client"

import { ArrowLeft, Globe, Twitter, Linkedin, Github } from "lucide-react"
import { SVGProps } from "react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { StaticHeader } from "@/components/static-header"
import { useSpeakers, type Speaker } from "@/hooks/use-speakers"

// X Logo Component
const XLogo = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M4 4l11.733 16h4.267l-11.733 -16z" />
    <path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772" />
  </svg>
)

export default function SpeakerDetails() {
  // Get the speaker name from the URL
  const params = useParams()
  const searchParams = useSearchParams()
  const speakerName = params.name as string
  const decodedName = decodeURIComponent(speakerName)
  
  // Get the session ID from the query parameter to navigate back
  const sessionId = searchParams.get('sessionId')
  
  const [speaker, setSpeaker] = useState<Speaker | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  
  // Get speakers data from API
  const { speakers: apiSpeakers, isLoading: speakersLoading } = useSpeakers()
  
  useEffect(() => {
    if (!speakersLoading && apiSpeakers && apiSpeakers.length > 0) {
      // Find the speaker by name
      const foundSpeaker = apiSpeakers.find(
        s => s.name.toLowerCase() === decodedName.toLowerCase()
      )
      
      if (foundSpeaker) {
        setSpeaker(foundSpeaker)
      }
      
      setIsLoading(false)
    }
  }, [decodedName, apiSpeakers, speakersLoading])
  
  // Function to determine social platform and return appropriate icon
  const getSocialIcon = (url: string) => {
    const lowerUrl = url.toLowerCase()
    if (lowerUrl.includes('twitter.com') || lowerUrl.includes('x.com')) {
      return (
        <div className="flex items-center gap-1">
          <XLogo className="h-5 w-5" />

        </div>
      )
    } else if (lowerUrl.includes('linkedin.com')) {
      return <Linkedin className="h-5 w-5" />
    } else if (lowerUrl.includes('github.com')) {
      return <Github className="h-5 w-5" />
    } else {
      return <Globe className="h-5 w-5" />
    }
  }

  // Function to get social platform name
  const getSocialPlatformName = (url: string) => {
    const lowerUrl = url.toLowerCase()
    if (lowerUrl.includes('twitter.com') || lowerUrl.includes('x.com')) {
      return 'X / Twitter'
    } else if (lowerUrl.includes('linkedin.com')) {
      return 'LinkedIn'
    } else if (lowerUrl.includes('github.com')) {
      return 'GitHub'
    } else {
      return 'Website'
    }
  }
  
  if (isLoading || speakersLoading) {
    return (
      <div className="min-h-screen bg-[#0d1117] text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-600"></div>
      </div>
    )
  }
  
  if (!speaker) {
    return (
      <div className="min-h-screen bg-[#0d1117] text-white flex items-center justify-center">
        <p>Speaker not found</p>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-[#0d1117] text-white pb-20">
      <StaticHeader>
        <div className="container mx-auto max-w-md px-4 py-4">
          <div className="flex flex-col">
            <div className="flex items-center">
              <Link href={sessionId ? `/session/${sessionId}` : "/"} className="mr-4">
                <ArrowLeft className="h-6 w-6" />
              </Link>
              <div>
                <h1 className="text-lg font-bold">Speaker</h1>
                <div className="flex items-center">
                  <p className="text-sm text-gray-400">Profile</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </StaticHeader>
      
      <div className="container mx-auto max-w-md px-4 pb-6">
        {/* Content with padding to account for fixed header */}
        <div className="pt-20">
          {/* Speaker Profile Header */}
          <div className="mb-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold leading-tight">{speaker.name}</h2>
              {speaker.social && (
                <a 
                  href={speaker.social} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-red-400 hover:text-red-300 transition-colors"
                >
                  {getSocialIcon(speaker.social)}
                </a>
              )}
            </div>
            {speaker.org && (
              <p className="text-sm text-gray-400 mt-1">{speaker.org}</p>
            )}
          </div>
          
          <div className="mb-8 flex justify-center">
            <Avatar className="h-32 w-32 border-2 border-red-500">
              <AvatarImage src={speaker.photo} alt={speaker.name} speakerName={speaker.name} />
              <AvatarFallback className="text-3xl">{speaker.name.charAt(0)}</AvatarFallback>
            </Avatar>
          </div>
          
          {/* Social Link section removed - now displayed next to speaker name */}
          
          {/* Speaker Bio */}
          {speaker.bio && (
            <div className="mb-8">
              <h3 className="mb-3 text-xl font-semibold">Bio</h3>
              <div className="text-sm leading-relaxed text-gray-300">
                {speaker.bio.split('\n').map((paragraph, index) => (
                  <p key={index} className="mb-2">{paragraph}</p>
                ))}
              </div>
            </div>
          )}
          
          {/* Back to Session Button */}
          {sessionId && (
            <div className="mb-8">
              <Link href={`/session/${sessionId}`}>
                <Button className="w-full bg-red-600 hover:bg-red-700 py-6 font-medium text-white">
                  Back to Session
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
