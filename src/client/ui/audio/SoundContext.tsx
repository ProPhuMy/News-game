import React, { createContext, useContext, useState, useCallback } from 'react';

export type SoundCue = 'paper_slap' | 'gasp' | 'murmur' | 'poof' | 'click';

export interface SoundContextValue {
  isMuted: boolean;
  toggleMute: () => void;
  playSound: (cue: SoundCue) => void;
}

const SoundContext = createContext<SoundContextValue | null>(null);

const SOUND_PATHS: Record<SoundCue, string> = {
  paper_slap: '/sounds/paper_slap.mp3',
  gasp: '/sounds/gasp.mp3',
  murmur: '/sounds/murmur.mp3',
  poof: '/sounds/poof.mp3',
  click: '/sounds/click.mp3',
};

export const SoundProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    return typeof window !== 'undefined' && localStorage.getItem('news_town_muted') === 'true';
  });

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('news_town_muted', String(next));
      }
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
