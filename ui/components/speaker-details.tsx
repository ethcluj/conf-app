"use client"

import { useState } from "react"
import { X, Globe, Twitter, Linkedin, Github } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { type Speaker } from "@/hooks/use-speakers"

interface SpeakerDetailsProps {
  speaker: Speaker | null
  isOpen: boolean
  onClose: () => void
}

export function SpeakerDetails({ speaker, isOpen, onClose }: SpeakerDetailsProps) {
  if (!speaker) return null

  // Function to determine social platform and return appropriate icon
  const getSocialIcon = (url: string) => {
    const lowerUrl = url.toLowerCase()
    if (lowerUrl.includes('twitter.com') || lowerUrl.includes('x.com')) {
      return <Twitter className="h-5 w-5" />
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
      return 'Twitter'
    } else if (lowerUrl.includes('linkedin.com')) {
      return 'LinkedIn'
    } else if (lowerUrl.includes('github.com')) {
      return 'GitHub'
    } else {
      return 'Website'
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] bg-[#161b22] border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-white">Speaker Profile</DialogTitle>
          <Button 
            variant="ghost" 
            className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100" 
            onClick={onClose}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Button>
        </DialogHeader>
        
        <div className="flex flex-col items-center space-y-4 py-4">
          <Avatar className="h-32 w-32 border-2 border-red-500">
            <AvatarImage src={speaker.photo} alt={speaker.name} speakerName={speaker.name} />
            <AvatarFallback className="text-3xl">{speaker.name.charAt(0)}</AvatarFallback>
          </Avatar>
          
          <div className="text-center">
            <h2 className="text-2xl font-bold">{speaker.name}</h2>
            {speaker.org && (
              <p className="text-lg text-gray-400">{speaker.org}</p>
            )}
          </div>
        </div>
        
        {speaker.bio && (
          <div className="mt-4">
            <h3 className="text-lg font-semibold mb-2">Bio</h3>
            <p className="text-gray-300 whitespace-pre-wrap">{speaker.bio}</p>
          </div>
        )}
        
        {speaker.social && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-2">Connect</h3>
            <a 
              href={speaker.social} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-red-400 hover:text-red-300 transition-colors"
            >
              {getSocialIcon(speaker.social)}
              <span>{getSocialPlatformName(speaker.social)}</span>
            </a>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
