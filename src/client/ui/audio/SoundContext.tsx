import React, { createContext, useContext, useState, useCallback } from 'react';

export type SoundCue = 'paper_slap' | 'gasp' | 'murmur' | 'poof' | 'paperSlap';

export interface SoundContextValue {
  isMuted: boolean;
  toggleMute: () => void;
  playSound: (cue: SoundCue) => void;
}

const SoundContext = createContext<SoundContextValue | null>(null);

const SOUND_PATHS: Record<SoundCue, string> = {
  paper_slap: '/sounds/paper-slap.mp3',
  paperSlap: '/sounds/paper-slap.mp3',
  gasp: '/sounds/gasp.mp3',
  murmur: '/sounds/crowd-murmur.mp3',
  poof: '/sounds/poof.mp3',
};

function getInitialMute(): boolean {
  try {
    if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
      return localStorage.getItem('news_town_muted') === 'true';
    }
  } catch {
    // Storage access denied (e.g. incognito or restricted iframe)
  }
  return false;
}

function persistMute(muted: boolean): void {
  try {
    if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
      localStorage.setItem('news_town_muted', String(muted));
    }
  } catch {
    // Storage access denied
  }
}

export const SoundProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isMuted, setIsMuted] = useState<boolean>(getInitialMute);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      persistMute(next);
      return next;
    });
  }, []);

  const playSound = useCallback((cue: SoundCue) => {
    if (isMuted || typeof window === 'undefined') return;
    try {
      if (typeof Audio !== 'undefined') {
        const audio = new Audio(SOUND_PATHS[cue]);
        audio.volume = 0.6;
        audio.play().catch(() => {
          // Autoplay policy fallback
        });
      }
    } catch {
      // Audio element creation error fallback
    }
  }, [isMuted]);

  return (
    <SoundContext.Provider value={{ isMuted, toggleMute, playSound }}>
      {children}
    </SoundContext.Provider>
  );
};

export const useSound = (): SoundContextValue => {
  const ctx = useContext(SoundContext);
  if (!ctx) {
    return {
      isMuted: true,
      toggleMute: () => {},
      playSound: () => {},
    };
  }
  return ctx;
};
