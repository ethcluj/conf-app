"use client"

import { useState } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  onAuthenticate: (email: string) => void
}

export function QnaAuthModal({ isOpen, onClose, onAuthenticate }: AuthModalProps) {
  const [email, setEmail] = useState("")
  const [isVerifying, setIsVerifying] = useState(false)
  const [verificationCode, setVerificationCode] = useState("")
  const [hasSentCode, setHasSentCode] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  if (!isOpen) return null
  
  const handleSendCode = () => {
    if (!email || !email.includes('@')) return
    
    setIsSubmitting(true)
    // Mock API call
    setTimeout(() => {
      setIsSubmitting(false)
      setIsVerifying(true)
      setHasSentCode(true)
    }, 700)
  }
  
  const handleVerify = () => {
    if (!verificationCode) return
    
    setIsSubmitting(true)
    // Mock API call
    setTimeout(() => {
      onAuthenticate(email)
      setIsSubmitting(false)
      onClose()
    }, 700)
  }
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-75">
      <div className="w-full max-w-md rounded-lg bg-[#161b22] p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-white">Sign In</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {!isVerifying ? (
          <div>
            <p className="mb-4 text-sm text-gray-300">
              Enter your email to participate in Q&A. You'll receive a verification code to sign in.
            </p>
            <div className="space-y-4">
              <div>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  className="bg-[#0d1117] border-[#30363d] text-white"
                  disabled={isSubmitting}
                />
              </div>
              <Button
                onClick={handleSendCode}
                className="w-full bg-red-600 hover:bg-red-700"
                disabled={!email || !email.includes('@') || isSubmitting}
              >
                {isSubmitting ? "Sending..." : "Send Verification Code"}
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <p className="mb-4 text-sm text-gray-300">
              Enter the verification code sent to <span className="font-semibold">{email}</span>
            </p>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code" className="text-sm text-gray-300">Verification Code</Label>
                <Input
                  id="code"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="123456"
                  className="bg-[#0d1117] border-[#30363d] text-white text-center tracking-widest"
                  maxLength={6}
                  disabled={isSubmitting}
                />
              </div>
              <div className="flex justify-between">
                <Button
                  onClick={() => setIsVerifying(false)}
                  variant="outline"
                  className="border-[#30363d] text-gray-300 hover:bg-[#21262d]"
                  disabled={isSubmitting}
                >
                  Back
                </Button>
                <Button
                  onClick={handleVerify}
                  className="bg-red-600 hover:bg-red-700"
                  disabled={verificationCode.length < 4 || isSubmitting}
                >
                  {isSubmitting ? "Verifying..." : "Verify"}
                </Button>
              </div>
              <button
                type="button"
                onClick={handleSendCode}
                className="mt-2 text-sm text-red-400 hover:text-red-300 w-full text-center"
                disabled={isSubmitting || !hasSentCode}
              >
                {isSubmitting ? "Sending..." : "Resend Code"}
              </button>
            </div>
          </div>
        )}
        
        <div className="mt-4 text-xs text-gray-400">
          <p>We'll only use your email to track your questions and votes across devices.</p>
        </div>
      </div>
    </div>
  )
}
