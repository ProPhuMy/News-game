/** @vitest-environment jsdom */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { SoundProvider, useSound } from '../../src/client/ui/audio/SoundContext';

describe('SoundContext', () => {
  it('manages mute state and handles sound cues without crashing', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SoundProvider>{children}</SoundProvider>
    );
    const { result } = renderHook(() => useSound(), { wrapper });

    expect(result.current.isMuted).toBe(false);

    act(() => {
      result.current.toggleMute();
    });
    expect(result.current.isMuted).toBe(true);

    // Triggering cue while muted should not throw
    expect(() => {
      act(() => {
        result.current.playSound('paper_slap');
      });
    }).not.toThrow();
  });

  it('survives localStorage denial without crashing', () => {
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Access denied');
    });
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Access denied');
    });

    try {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <SoundProvider>{children}</SoundProvider>
      );
      const { result } = renderHook(() => useSound(), { wrapper });
      expect(result.current.isMuted).toBe(false);

      act(() => {
        result.current.toggleMute();
      });
      expect(result.current.isMuted).toBe(true);
    } finally {
      getItemSpy.mockRestore();
      setItemSpy.mockRestore();
    }
  });
});
