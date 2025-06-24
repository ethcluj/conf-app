"use client"

import * as React from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"

import { cn } from "@/lib/utils"

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
      className
    )}
    {...props}
  />
))
Avatar.displayName = AvatarPrimitive.Root.displayName

interface AvatarImageProps extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image> {
  speakerName?: string;
}

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  AvatarImageProps
>(({ className, speakerName, ...props }, ref) => {
  // List of speakers that should have center-focused images instead of top-focused
  const CENTER_FOCUSED_SPEAKERS = [
    "George Loukovitis",
    "Anders Holmbjerg Kristiansen",
    "Luis",
    "Joao Alves",
    "Liana Toderean",
    "Robert Benedek",
    "Bogdan Arsene",
    "Alex Gazdac",
    // "Alena Yudina",
    "Maria Yudina"
  ];
  
  // Determine image positioning based on speaker name
  const useCenter = speakerName ? 
    CENTER_FOCUSED_SPEAKERS.some(name => 
      name.toLowerCase() === speakerName.toLowerCase()
    ) : false;
  
  return (
    <AvatarPrimitive.Image
      ref={ref}
      className={cn("h-full w-full", className)}
      style={{ 
        objectFit: "cover", 
        objectPosition: useCenter ? "center" : "top" 
      }}
      {...props}
    />
  );
})
AvatarImage.displayName = AvatarPrimitive.Image.displayName

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      "flex h-full w-full items-center justify-center rounded-full bg-muted",
      className
    )}
    {...props}
  />
))
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName

export { Avatar, AvatarImage, AvatarFallback }
