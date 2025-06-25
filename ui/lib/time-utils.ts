// Time utilities for the conference app

const MOCK_TIME_KEY = 'ethcluj-mock-time';

/**
 * Clear any mocked time and return to using the system time
 */
export function clearMockedTime(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(MOCK_TIME_KEY);
  }
}

/**
 * Get the current time, either from URL parameter, localStorage, or system time
 * URL parameter format: DDMM-HHmm (e.g., 0906-1430 for June 9, 14:30)
 */
export function getCurrentTime(): Date {
  if (typeof window !== 'undefined') {
    // Check for time parameter in URL
    const urlParams = new URLSearchParams(window.location.search);
    const timeParam = urlParams.get('time');
    
    // Handle special 'clear' parameter to reset to system time
    if (timeParam === 'clear') {
      localStorage.removeItem(MOCK_TIME_KEY);
      return new Date();
    }
    
    // If time parameter exists in URL, parse it and store in localStorage
    if (timeParam && /^\d{4}-\d{4}$/.test(timeParam)) {
      try {
        const mockDate = parseMockTimeParam(timeParam);
        // Store the time parameter in localStorage for persistence
        localStorage.setItem(MOCK_TIME_KEY, timeParam);
        return mockDate;
      } catch (error) {
        console.error('Error parsing time parameter:', error);
      }
    }
    
    // If no URL parameter but we have a stored time, use that
    const storedTimeParam = localStorage.getItem(MOCK_TIME_KEY);
    if (storedTimeParam && /^\d{4}-\d{4}$/.test(storedTimeParam)) {
      try {
        return parseMockTimeParam(storedTimeParam);
      } catch (error) {
        console.error('Error parsing stored time parameter:', error);
        // Clear invalid stored time
        localStorage.removeItem(MOCK_TIME_KEY);
      }
    }
  }
  
  // Default to current system time
  return new Date();
}

/**
 * Parse a mock time parameter in DDMM-HHmm format
 */
function parseMockTimeParam(timeParam: string): Date {
  const [datePart, timePart] = timeParam.split('-');
  const day = parseInt(datePart.substring(0, 2));
  const month = parseInt(datePart.substring(2, 4)) - 1; // JS months are 0-indexed
  const hour = parseInt(timePart.substring(0, 2));
  const minute = parseInt(timePart.substring(2, 4));
  
  const currentYear = new Date().getFullYear();
  return new Date(currentYear, month, day, hour, minute);
}

/**
 * Check if a session is currently active based on its start and end times
 * A session is considered active if the current time is after or equal to the start time
 * AND before (but not equal to) the end time
 */
export function isSessionActive(session: { startTime: Date; endTime: Date }): boolean {
  const now = getCurrentTime();
  return now >= session.startTime && now < session.endTime;
}

/**
 * Check if a session is in the past
 */
export function isSessionPast(session: { endTime: Date }): boolean {
  const now = getCurrentTime();
  return now > session.endTime;
}

/**
 * Check if a session is in the future
 */
export function isSessionFuture(session: { startTime: Date }): boolean {
  const now = getCurrentTime();
  return now < session.startTime;
}

/**
 * Check if QnA is available for a session
 * QnA is available 5 minutes before the session starts, during the session, and 5 minutes after it ends
 */
export function isQnAAvailable(session: { startTime: Date; endTime: Date }): boolean {
  // const now = getCurrentTime();
  // const fiveMinutesMs = 5 * 60 * 1000; // 5 minutes in milliseconds
  
  // // Available 5 minutes before session starts
  // const qnaStartTime = new Date(session.startTime.getTime() - fiveMinutesMs);
  
  // // Available until 5 minutes after session ends
  // const qnaEndTime = new Date(session.endTime.getTime() + fiveMinutesMs);
  
  // return now >= qnaStartTime && now <= qnaEndTime;
  return true;
}

/**
 * Get a human-readable status for a session based on its timing
 * @returns An object with the status text and whether the session is active
 */
export function getSessionTimeStatus(session: { startTime: Date; endTime: Date }): { text: string; isActive: boolean } {
  const now = getCurrentTime();
  
  // If session is active
  if (isSessionActive(session)) {
    return { text: "Happening now", isActive: true };
  }
  
  // If session is in the past
  if (isSessionPast(session)) {
    return { text: `Ended ${formatTimeDifference(session.endTime, now)} ago`, isActive: false };
  }
  
  // If session is in the future
  return { text: `Starts in ${formatTimeDifference(now, session.startTime)}`, isActive: false };
}

/**
 * Format the time difference between two dates in a human-readable format
 */
function formatTimeDifference(earlier: Date, later: Date): string {
  const diffMs = later.getTime() - earlier.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  // If we have days, show days + hours
  if (diffDays > 0) {
    const remainingHours = diffHours % 24;
    if (remainingHours === 0) {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''}`;
    }
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ${remainingHours} hour${remainingHours !== 1 ? 's' : ''}`;
  }
  
  // If we have hours, show hours + minutes
  if (diffHours > 0) {
    const remainingMins = diffMins % 60;
    if (remainingMins === 0) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''}`;
    }
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ${remainingMins} minute${remainingMins !== 1 ? 's' : ''}`;
  }
  
  // Otherwise just minutes
  return `${diffMins} minute${diffMins !== 1 ? 's' : ''}`;
}

/**
 * Check if a date is today
 */
export function isToday(date: Date): boolean {
  const now = getCurrentTime();
  return date.getDate() === now.getDate() && 
         date.getMonth() === now.getMonth() && 
         date.getFullYear() === now.getFullYear();
}

/**
 * Get the current conference day based on the date
 * @param days Array of conference day Date objects
 * @returns The current conference day Date object or null if not a conference day
 */
export function getCurrentConferenceDay(days?: Date[]): Date | null {
  const now = getCurrentTime();
  
  // If days are provided, use them, otherwise import from data.ts
  // We can't import directly due to circular dependency
  const conferenceDays = days || [
    new Date(2025, 5, 26), // June 26, 2025
    new Date(2025, 5, 27), // June 27, 2025
    new Date(2025, 5, 28)  // June 28, 2025
  ];
  
  // Find the conference day that matches today
  return conferenceDays.find(day => isToday(day)) || null;
}
