"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Interface for BeforeInstallPromptEvent
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

export function PwaInstaller() {
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installInstructions, setInstallInstructions] = useState<string>("");

  // Detect if app is already installed and set up installation guide
  useEffect(() => {
    console.log("PWA Installer component mounted");
    
    // Check if app is in standalone mode (already installed)
    const isInStandaloneMode = () =>
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone ||
      document.referrer.includes("android-app://");

    if (isInStandaloneMode()) {
      console.log("App is already installed in standalone mode");
      setIsInstalled(true);
      return;
    }

    // Register service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("Service Worker registered with scope:", registration.scope);
        })
        .catch((error) => {
          console.error("Service Worker registration failed:", error);
        });
    } else {
      console.log("Service Worker not supported in this browser");
    }

    // Check if we should show the install guide
    const hasSeenGuide = localStorage.getItem("pwaInstallDismissed");
    console.log("PWA install guide dismissed status:", hasSeenGuide);
    
    if (!hasSeenGuide) {
      console.log("User has not dismissed the install guide yet, showing it");
      setShowInstallGuide(true);
      
      // Set platform-specific instructions
      if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
        setInstallInstructions(
          "Tap the share button and then 'Add to Home Screen'"
        );
      } else if (/Android/.test(navigator.userAgent)) {
        setInstallInstructions(
          "Tap the menu button and then 'Add to Home Screen' or 'Install App'"
        );
      } else {
        setInstallInstructions(
          "Click the install button in your browser's address bar"
        );
      }
    } else {
      console.log("User has already seen the install guide");
    }

    // Detect install prompt
    window.addEventListener("beforeinstallprompt", (e) => {
      console.log("Received beforeinstallprompt event");
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later
      setDeferredPrompt(e);
    });

    // Handle app installed event
    window.addEventListener("appinstalled", () => {
      setIsInstalled(true);
      setShowInstallGuide(false);
      console.log("PWA was installed");
    });
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      return;
    }
    
    // Show the install prompt
    await deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const choiceResult = await deferredPrompt.userChoice;
    
    if (choiceResult.outcome === "accepted") {
      console.log("User accepted the install prompt");
    } else {
      console.log("User dismissed the install prompt");
    }
    
    // Clear the saved prompt as it can't be used again
    setDeferredPrompt(null);
  };

  const dismissGuide = () => {
    setShowInstallGuide(false);
    localStorage.setItem("pwaInstallDismissed", "true");
    console.log("PWA install guide dismissed and saved to localStorage");
  };

  if (!showInstallGuide || isInstalled) {
    return null;
  }

  return (
    <div className="fixed bottom-20 left-0 right-0 z-50 px-4 py-2">
      <Card className="p-4 bg-gray-800 border-gray-700 shadow-lg">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-semibold">Install ETHCluj App</h3>
          <button 
            onClick={dismissGuide} 
            className="text-gray-400 hover:text-white"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
        
        <p className="text-sm text-gray-300 mb-3">
          Install this app on your device for quick access to the conference schedule and information, even offline!
        </p>
        
        <div className="text-sm text-gray-300 mb-4">
          <strong>How to install:</strong>
          <p>{installInstructions}</p>
        </div>
        
        {deferredPrompt && (
          <Button 
            onClick={handleInstallClick} 
            className="w-full bg-red-600 hover:bg-red-700"
          >
            Install Now
          </Button>
        )}
      </Card>
    </div>
  );
}
