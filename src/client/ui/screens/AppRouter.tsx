import React, { useState, useSyncExternalStore } from 'react';
import type { ClientStore } from '../../net/index.ts';
import { store as defaultStore } from '../../net/index.ts';
import { HomeScreen } from './HomeScreen.tsx';
import { JoinScreen } from './JoinScreen.tsx';
import { LobbyScreen } from './LobbyScreen.tsx';
import { IntroScreen } from './IntroScreen.tsx';
import { InvestigateScreen } from './InvestigateScreen.tsx';
import { WriteScreen } from './WriteScreen.tsx';
import { RevealScreen } from './RevealScreen.tsx';
import { FinalEditionScreen } from './FinalEditionScreen.tsx';
import { ServerRestartScreen } from './ServerRestartScreen.tsx';
import { ConnectionOverlay } from './ConnectionOverlay.tsx';
import { WebGLFallbackScreen } from './WebGLFallbackScreen.tsx';
import { HUD } from '../hud/HUD.tsx';
import { SoundProvider } from '../audio/SoundContext.tsx';
import {
  paperPublicToView,
  deriveFrontPages,
  deriveProofCards,
  deriveEvidenceCards,
  deriveExposures,
  deriveRecapText,
  finalToScoreRows,
} from '../mapper.ts';

export interface AppRouterProps {
  store?: ClientStore;
}

export const AppRouter: React.FC<AppRouterProps> = ({ store = defaultStore }) => {
  const state = useSyncExternalStore(store.subscribe, store.getState);
  const [joinTarget, setJoinTarget] = useState<{ mode: 'solo' | 'create' | 'join'; code?: string } | null>(null);

  const [isWebGLAvailable] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    try {
      const canvas = document.createElement('canvas');
      return !!(
        window.WebGLRenderingContext &&
        (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
      );
    } catch {
      return false;
    }
  });

  const { room, session, publicSnapshot, privateSnapshot, connection, pending, error, serverOffsetMs } = state;
  const isPending = pending.length > 0;

  // Handle server match termination / restart
  if (error === 'The presses stopped — this match ended') {
    return (
      <SoundProvider>
        <ServerRestartScreen onReturnHome={() => store.reset()} />
      </SoundProvider>
    );
  }

  // Pre-join: Home and Join Profile Screens
  const renderSetupFlow = () => {
    if (joinTarget) {
      return (
        <JoinScreen
          pending={isPending}
          error={error}
          onBack={() => setJoinTarget(null)}
          onSubmit={(p) => {
            const profilePayload = {
              displayName: p.playerName,
              paperName: p.paperName,
              color: p.color,
            };
            if (joinTarget.mode === 'solo') {
              store.actions.playSolo(profilePayload);
            } else if (joinTarget.mode === 'create') {
              store.actions.createRoom(profilePayload);
            } else if (joinTarget.mode === 'join' && joinTarget.code) {
              store.actions.joinRoom({ ...profilePayload, code: joinTarget.code });
            }
          }}
        />
      );
    }

    return (
      <HomeScreen
        pending={isPending}
        error={error}
        onPlaySolo={() => setJoinTarget({ mode: 'solo' })}
        onCreateRoom={() => setJoinTarget({ mode: 'create' })}
        onJoinCode={(code) => setJoinTarget({ mode: 'join', code })}
      />
    );
  };

  // Lobby Screen
  const renderLobbyFlow = () => {
    if (!room || !session) return null;
    const isHost = room.hostSeatId === session.seatId;
    const seats = room.seats.map((s) => ({
      seatId: s.seatId,
      playerName: s.displayName,
      paperName: s.paperName,
      color: s.color,
      isBot: s.occupant === 'ai',
    }));

    return (
      <LobbyScreen
        roomCode={room.code}
        isHost={isHost}
        seats={seats}
        pending={isPending}
        error={error}
        onStartMatch={() => store.actions.startMatch()}
        onLeaveRoom={() => store.reset()}
      />
    );
  };

  // In-Match Phase Screens
  const renderMatchFlow = () => {
    if (!publicSnapshot || !privateSnapshot) {
      return (
        <div className="screen-container loading-screen" data-testid="match-loading">
          <div className="loading-card">
            <h2>Awaiting Town Edition...</h2>
            <p>Syncing match presses with the newsroom...</p>
          </div>
        </div>
      );
    }

    const serverNowMs = Date.now() + serverOffsetMs;
    const papers = publicSnapshot.papers.map((p) => paperPublicToView(p, serverNowMs));
    const frontPages = deriveFrontPages(publicSnapshot);
    const proofCards = deriveProofCards(privateSnapshot.proofs, publicSnapshot);
    const evidenceCards = deriveEvidenceCards(privateSnapshot.evidence, publicSnapshot.round);
    const exposures = deriveExposures(publicSnapshot.exposures, publicSnapshot.papers);
    const recap = deriveRecapText(publicSnapshot.reactionPlan, publicSnapshot.papers);
    const scoreRows = finalToScoreRows(publicSnapshot.final, publicSnapshot.papers);

    const rivalHeadlines = publicSnapshot.headlines
      .filter((h) => h.seatId !== session?.seatId)
      .map((h) => {
        const p = publicSnapshot.papers.find((paper) => paper.seatId === h.seatId);
        return {
          id: h.id,
          paperName: p?.paperName ?? 'Rival',
          round: h.round,
          text: h.text,
        };
      });

    const bubbles =
      publicSnapshot.reactionPlan?.citizens
        .map((c) => c.bubble)
        .filter((b): b is string => typeof b === 'string' && b.length > 0) ?? [];

    return (
      <HUD
        round={publicSnapshot.round}
        phase={publicSnapshot.phase}
        deadlineMs={publicSnapshot.deadlineMs}
        serverTimeOffset={serverOffsetMs}
        papers={papers}
      >
        {publicSnapshot.phase === 'intro' && (
          <IntroScreen
            deadlineMs={publicSnapshot.deadlineMs}
            serverTimeOffset={serverOffsetMs}
            onSkipIntro={() => store.actions.skipIntro()}
          />
        )}

        {publicSnapshot.phase === 'investigate' && (
          <InvestigateScreen
            tipText={privateSnapshot.tip?.text ?? 'No active tip for this round.'}
            round={publicSnapshot.round}
            hasLocked={privateSnapshot.acted}
            rivalHeadlines={rivalHeadlines}
            pending={isPending}
            serverError={error}
            onInvestigateLocation={(location) =>
              store.actions.investigate({ target: { kind: 'location', location } })
            }
            onInvestigateRival={(headlineId) =>
              store.actions.investigate({ target: { kind: 'headline', headlineId } })
            }
            onSkip={() => store.actions.skipInvestigate()}
          />
        )}

        {publicSnapshot.phase === 'write' && (
          <WriteScreen
            hasLocked={privateSnapshot.acted}
            lockedHeadline={privateSnapshot.lockedHeadline}
            evidenceCards={evidenceCards}
            proofCards={proofCards}
            serverError={error}
            onLockHeadline={(payload) => store.actions.lockHeadline(payload)}
            onSkipWrite={() => store.actions.skipWrite()}
          />
        )}

        {publicSnapshot.phase === 'reveal' && (
          <RevealScreen
            frontPages={frontPages}
            exposures={exposures}
            recap={recap}
            bubbles={bubbles}
          />
        )}

        {(publicSnapshot.phase === 'final' || publicSnapshot.phase === 'ended') && (
          <FinalEditionScreen
            scoreboard={scoreRows}
            onPlayAgain={() => store.reset()}
          />
        )}
      </HUD>
    );
  };

  const isMatchActive =
    publicSnapshot !== null ||
    (room !== null && (room.status === 'playing' || room.status === 'finished'));

  return (
    <SoundProvider>
      <div className="app-layout" data-testid="app-layout">
        {!isWebGLAvailable && <WebGLFallbackScreen />}

        {connection !== 'connected' && (
          <ConnectionOverlay
            status={connection === 'connecting' && session ? 'reconnecting' : connection}
            onRetry={() => {
              if (session) {
                store.actions.reconnect(session.code);
              } else {
                store.setConnection('connected');
              }
            }}
          />
        )}

        {!room || !session
          ? renderSetupFlow()
          : !isMatchActive && room.status === 'lobby'
          ? renderLobbyFlow()
          : renderMatchFlow()}
      </div>
    </SoundProvider>
  );
};
