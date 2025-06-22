"use client"

import { useState } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import * as QnaApi from "@/lib/qna-api"
import { ApiError } from "@/lib/qna-api"
import { VerificationCodeInput } from "@/components/verification-code-input"

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
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  
  if (!isOpen) return null
  
  const handleSendCode = async () => {
    if (!email || !email.includes('@')) return
    
    setIsSubmitting(true)
    setErrorMessage(null)
    
    try {
      // Send verification code via email
      await QnaApi.sendVerificationCode(email)
      
      setIsVerifying(true)
      setHasSentCode(true)
    } catch (error) {
      console.error('Error sending verification code:', error)
      setErrorMessage('Failed to send verification code. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }
  
  const handleVerify = async () => {
    if (!verificationCode || verificationCode.length !== 4) return
    
    setIsSubmitting(true)
    setErrorMessage(null)
    
    try {
      // Verify the code and authenticate the user
      const user = await QnaApi.verifyEmailCode(email, verificationCode)
      await onAuthenticate(email)
      onClose()
    } catch (error) {
      console.error('Error verifying code:', error)
      
      // Extract error message from response if available
      let message = 'Invalid verification code. Please try again.'
      
      if (error instanceof ApiError) {
        // Use our structured API error message
        message = error.message
        
        // If max attempts reached, reset to email entry state after showing the message
        if (message.includes('Maximum verification attempts reached') || 
            error.data?.error?.includes('Maximum verification attempts reached')) {
          setTimeout(() => {
            setIsVerifying(false)
            setVerificationCode('')
          }, 3000)
        }
        
        // If attempts remaining info is available
        if (message.includes('attempts remaining')) {
          // Already formatted nicely by the backend
        }
      } else if (error instanceof Error) {
        // Use standard error message
        message = error.message
      }
      
      setErrorMessage(message)
      setIsSubmitting(false)
    }
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
            {errorMessage && (
              <Alert className="mb-4 bg-red-900/20 border-red-900 text-red-300">
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}
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
                className="w-full bg-red-600 hover:bg-red-700 text-white"
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
            {errorMessage && (
              <Alert className="mb-4 bg-red-900/20 border-red-900 text-red-300">
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code" className="text-sm text-gray-300">Verification Code</Label>
                <VerificationCodeInput
                  length={4}
                  onChange={setVerificationCode}
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
                  className="bg-red-600 hover:bg-red-700 text-white"
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
