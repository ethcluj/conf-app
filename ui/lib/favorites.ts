// Favorites management for ETHCluj Conference app
import { Session } from './data';

const FAVORITES_STORAGE_KEY = 'ethcluj-favorites';

/**
 * Get all favorite session IDs from local storage
 */
export function getFavoriteIds(): string[] {
  if (typeof window === 'undefined') {
    return [];
  }
  
  try {
    const storedFavorites = localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (!storedFavorites) {
      return [];
    }
    
    return JSON.parse(storedFavorites);
  } catch (error) {
    console.error('Error reading favorites from local storage:', error);
    return [];
  }
}

/**
 * Save favorite session IDs to local storage
 */
export function saveFavoriteIds(favoriteIds: string[]): void {
  if (typeof window === 'undefined') {
    return;
  }
  
  try {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favoriteIds));
  } catch (error) {
    console.error('Error saving favorites to local storage:', error);
  }
}

/**
 * Add a session to favorites
 */
export function addFavorite(sessionId: string): void {
  const favorites = getFavoriteIds();
  if (!favorites.includes(sessionId)) {
    favorites.push(sessionId);
    saveFavoriteIds(favorites);
  }
}

/**
 * Remove a session from favorites
 */
export function removeFavorite(sessionId: string): void {
  const favorites = getFavoriteIds();
  const updatedFavorites = favorites.filter(id => id !== sessionId);
  saveFavoriteIds(updatedFavorites);
}

/**
 * Toggle a session's favorite status
 */
export function toggleFavorite(sessionId: string): boolean {
  const favorites = getFavoriteIds();
  const isFavorite = favorites.includes(sessionId);
  
  if (isFavorite) {
    removeFavorite(sessionId);
    return false;
  } else {
    addFavorite(sessionId);
    return true;
  }
}

/**
 * Check if a session is a favorite
 */
export function isFavorite(sessionId: string): boolean {
  const favorites = getFavoriteIds();
  return favorites.includes(sessionId);
}

/**
 * Apply favorite status to a list of sessions
 */
export function applyFavoritesToSessions(sessions: Session[]): Session[] {
  const favoriteIds = getFavoriteIds();
  
  return sessions.map(session => ({
    ...session,
    isFavorite: favoriteIds.includes(session.id)
  }));
}
