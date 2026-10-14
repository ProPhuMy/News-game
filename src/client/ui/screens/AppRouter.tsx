import React, { useState } from 'react';
import type { Phase, Color } from '../../../shared/ids';
import { HomeScreen } from './HomeScreen';
import { JoinScreen } from './JoinScreen';
import { LobbyScreen } from './LobbyScreen';
import { IntroScreen } from './IntroScreen';
import { InvestigateScreen } from './InvestigateScreen';
import { WriteScreen } from './WriteScreen';
import { RevealScreen } from './RevealScreen';
import { FinalEditionScreen } from './FinalEditionScreen';
import { ServerRestartScreen } from './ServerRestartScreen';
import { ConnectionOverlay } from './ConnectionOverlay';
import { WebGLFallbackScreen } from './WebGLFallbackScreen';
import { HUD } from '../hud/HUD';
import type { PaperView } from '../hud/SidePanel';
import { SoundProvider } from '../audio/SoundContext';

export type AppView =
  | 'home'
  | 'join'
  | 'lobby'
  | 'intro'
  | 'investigate'
  | 'write'
  | 'reveal'
  | 'final'
  | 'restart';

export const AppRouter: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>('home');
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'reconnecting' | 'disconnected'>('connecting');
  const [roomCode, setRoomCode] = useState<string>('');
  const [round, setRound] = useState<number>(1);
  const [isWebGLAvailable] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    try {
      const canvas = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
    } catch {
      return false;
    }
  });

  const [papers] = useState<PaperView[]>([
    { seatId: 0, playerName: 'Editor', paperName: 'Daily Gasp', color: 'red', readers: 0, trust: 50, score: 0, isBot: false, isCaretaker: false, hasLocked: false },
    { seatId: 1, playerName: 'Bot Gazette', paperName: 'Morning Ledger', color: 'blue', readers: 0, trust: 50, score: 0, isBot: true, isCaretaker: false, hasLocked: false },
    { seatId: 2, playerName: 'Bot Wildcard', paperName: 'Rumor Mill', color: 'green', readers: 0, trust: 50, score: 0, isBot: true, isCaretaker: false, hasLocked: false },
    { seatId: 3, playerName: 'Bot Tribune', paperName: 'The Clarion', color: 'gold', readers: 0, trust: 50, score: 0, isBot: true, isCaretaker: false, hasLocked: false },
  ]);

  const isMatchPhase = ['intro', 'investigate', 'write', 'reveal', 'final'].includes(currentView);

  return (
    <SoundProvider>
      <div className="app-layout" data-testid="app-layout">
        {!isWebGLAvailable && <WebGLFallbackScreen />}
        <ConnectionOverlay
          status={connectionStatus}
          onRetry={() => setConnectionStatus('connecting')}
        />

        {currentView === 'home' && (
          <HomeScreen
            onPlaySolo={() => setCurrentView('join')}
            onCreateRoom={() => setCurrentView('join')}
            onJoinCode={(code) => {
              setRoomCode(code);
              setCurrentView('join');
            }}
          />
        )}

        {currentView === 'join' && (
          <JoinScreen
            onSubmit={() => setCurrentView('lobby')}
            takenColors={['blue', 'green', 'gold'] as Color[]}
          />
        )}

        {currentView === 'lobby' && (
          <LobbyScreen
            roomCode={roomCode || 'SOLO1'}
            isHost={true}
            seats={[
              { seatId: 0, playerName: 'Editor', paperName: 'Daily Gasp', color: 'red', isBot: false },
              { seatId: 1, playerName: null, paperName: null, color: null, isBot: true },
              { seatId: 2, playerName: null, paperName: null, color: null, isBot: true },
              { seatId: 3, playerName: null, paperName: null, color: null, isBot: true },
            ]}
            onStartMatch={() => setCurrentView('intro')}
          />
        )}

        {isMatchPhase && (
          <HUD
            round={round}
            phase={currentView as Phase}
            deadlineMs={Date.now() + 30000}
            serverTimeOffset={0}
            papers={papers}
          >
            {currentView === 'intro' && (
              <IntroScreen
                deadlineMs={Date.now() + 20000}
                serverTimeOffset={0}
                onSkipIntro={() => setCurrentView('investigate')}
              />
            )}

            {currentView === 'investigate' && (
              <InvestigateScreen
                tipText="A delivery truck was spotted near the bakery at 3 AM."
                round={round}
                hasLocked={false}
                rivalHeadlines={[]}
                onInvestigateLocation={() => setCurrentView('write')}
                onInvestigateRival={() => setCurrentView('write')}
                onSkip={() => setCurrentView('write')}
              />
            )}

            {currentView === 'write' && (
              <WriteScreen
                hasLocked={false}
                evidenceCards={[]}
                proofCards={[]}
                onLockHeadline={() => setCurrentView('reveal')}
                onSkipWrite={() => setCurrentView('reveal')}
              />
            )}

            {currentView === 'reveal' && (
              <RevealScreen
                frontPages={[
                  { seatId: 0, paperName: 'Daily Gasp', color: 'red', headlineText: 'Town Bakery Has Secret Recipe', hasEvidence: false, isExposed: false },
                  { seatId: 1, paperName: 'Morning Ledger', color: 'blue', headlineText: 'Town Hall Audited', hasEvidence: true, isExposed: false },
                ]}
                exposures={[]}
                recap="12 citizens visited the bakery; Daily Gasp gained 3 readers."
                bubbles={['Incredible news!']}
              />
            )}

            {currentView === 'final' && (
              <FinalEditionScreen
                scoreboard={[
                  { seatId: 0, paperName: 'Daily Gasp', playerName: 'Editor', color: 'red', totalReaders: 45, finalTrust: 80, finalScore: 72, truthRecord: '1 lie told, 0 caught, 1 got away', isWinner: true },
                ]}
                onPlayAgain={() => {
                  setRound(1);
                  setCurrentView('home');
                }}
              />
            )}
          </HUD>
        )}

        {currentView === 'restart' && (
          <ServerRestartScreen onReturnHome={() => setCurrentView('home')} />
        )}
      </div>
    </SoundProvider>
  );
};
