"use client"

import { useRef, useState, useEffect, KeyboardEvent, ClipboardEvent } from "react"
import { Input } from "@/components/ui/input"

interface VerificationCodeInputProps {
  length?: number
  onChange: (code: string) => void
  disabled?: boolean
}

export function VerificationCodeInput({
  length = 4,
  onChange,
  disabled = false
}: VerificationCodeInputProps) {
  const [code, setCode] = useState<string[]>(Array(length).fill(""))
  const inputRefs = useRef<HTMLInputElement[]>([])
  
  // Register input refs
  useEffect(() => {
    inputRefs.current = inputRefs.current.slice(0, length)
  }, [length])
  
  // Update parent component when code changes
  useEffect(() => {
    onChange(code.join(""))
  }, [code, onChange])
  
  // Handle input change
  const handleChange = (index: number, value: string) => {
    // Only allow digits
    if (!/^\d*$/.test(value)) return
    
    // Update the code array
    const newCode = [...code]
    newCode[index] = value.slice(-1) // Only take the last character
    setCode(newCode)
    
    // Move to next input if we have a value
    if (value && index < length - 1) {
      inputRefs.current[index + 1].focus()
    }
  }
  
  // Handle key press
  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    // Move to previous input on backspace if current input is empty
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1].focus()
    }
    
    // Move to previous input on left arrow
    if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1].focus()
    }
    
    // Move to next input on right arrow
    if (e.key === "ArrowRight" && index < length - 1) {
      inputRefs.current[index + 1].focus()
    }
  }
  
  // Handle paste event
  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    
    // Get pasted content
    const pastedData = e.clipboardData.getData("text/plain").trim()
    
    // Check if it's a valid number
    if (!/^\d+$/.test(pastedData)) return
    
    // Fill in the code inputs
    const newCode = [...code]
    for (let i = 0; i < Math.min(length, pastedData.length); i++) {
      newCode[i] = pastedData[i]
    }
    
    setCode(newCode)
    
    // Focus the next empty input or the last one
    const nextEmptyIndex = newCode.findIndex(digit => !digit)
    if (nextEmptyIndex !== -1 && nextEmptyIndex < length) {
      inputRefs.current[nextEmptyIndex].focus()
    } else {
      inputRefs.current[length - 1].focus()
    }
  }
  
  return (
    <div className="flex gap-2 justify-center">
      {Array.from({ length }).map((_, index) => (
        <Input
          key={index}
          ref={(el) => {
            if (el) inputRefs.current[index] = el
          }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={code[index]}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={index === 0 ? handlePaste : undefined} // Only allow paste on first input
          className="w-12 h-12 text-center text-xl bg-[#0d1117] border-[#30363d] text-white"
          disabled={disabled}
          aria-label={`Verification code digit ${index + 1}`}
        />
      ))}
    </div>
  )
}
