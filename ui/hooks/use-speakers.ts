import { useState, useEffect } from 'react';

export interface Speaker {
  name: string;
  org: string;
  social: string;
  photo: string;
  visible: boolean;
  bio: string;
}

export function useSpeakers() {
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSpeakers = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        let apiUrl = '/api/speakers';
        // Handle development environment
        if (typeof window !== 'undefined') {
          const isDev = process.env.NODE_ENV === 'development';
          const isLocalhost = window.location.hostname === 'localhost';
          if (isDev && isLocalhost) {
            apiUrl = 'http://localhost:3001/speakers';
          }
        }
        
        const response = await fetch(apiUrl, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch speakers: ${response.status}`);
        }
        
        const responseData = await response.json();
        
        // Handle both wrapped response format and direct array format
        if (responseData && typeof responseData === 'object' && 'success' in responseData && 'data' in responseData) {
          // Standard API response format with {success: true, data: [...]} structure
          setSpeakers(Array.isArray(responseData.data) ? responseData.data : []);
        } else if (Array.isArray(responseData)) {
          // Direct array response (fallback for backward compatibility)
          setSpeakers(responseData);
        } else {
          console.error("Unexpected API response format for speakers:", responseData);
          setSpeakers([]);
        }
      } catch (err) {
        console.error('Error fetching speakers:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch speakers');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSpeakers();
  }, []);

  const getSpeakerByName = (name: string): Speaker | undefined => {
    return speakers.find(speaker => speaker.name === name);
  };

  return {
    speakers,
    isLoading,
    error,
    getSpeakerByName
  };
}
