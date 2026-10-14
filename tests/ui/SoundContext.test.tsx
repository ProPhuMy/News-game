/** @vitest-environment jsdom */
import React from 'react';
import { describe, it, expect } from 'vitest';
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
});
