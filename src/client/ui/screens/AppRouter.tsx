import React, { useState, useEffect, useSyncExternalStore } from 'react';
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
import { HUD } from '../hud/HUD.tsx';
import { EditionTicker } from '../components/EditionTicker.tsx';
import { SoundProvider } from '../audio/SoundContext.tsx';
import {
  paperPublicToView,
  deriveFrontPages,
  deriveProofCards,
  deriveEvidenceCards,
  deriveExposures,
  deriveRecapText,
  finalToScoreRows,
  deriveTruthRecords,
  deriveFinalExposures,
  deriveFinalHeadlines,
  formatErrorMessage,
} from '../mapper.ts';

export interface AppRouterProps {
  store?: ClientStore;
}

export const AppRouter: React.FC<AppRouterProps> = ({ store = defaultStore }) => {
  const state = useSyncExternalStore(store.subscribe, store.getState);
  const [joinTarget, setJoinTarget] = useState<{ mode: 'solo' | 'create' | 'join'; code?: string } | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  // Connect net transport on mount
  useEffect(() => {
    const socketStore = store as Partial<{ connect: () => void }>;
    socketStore.connect?.();
  }, [store]);

  // Read /r/CODE from URL or ?room=CODE on load; reconnect if token saved, else open Join
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const pathMatch = window.location.pathname.match(/\/r\/([A-Za-z0-9]+)/);
    const queryMatch = new URLSearchParams(window.location.search).get('room');
    const rawCode = (pathMatch?.[1] || queryMatch || '').trim().toUpperCase();
    if (rawCode.length === 5) {
      let hasSavedToken = false;
      try {
        hasSavedToken = !!localStorage.getItem(`news-town:${rawCode}`);
      } catch {
        // storage access fallback
      }
      if (hasSavedToken) {
        store.actions.reconnect(rawCode);
      } else {
        setJoinTarget({ mode: 'join', code: rawCode });
      }
    }
  }, [store]);

  const { room, session, publicSnapshot, privateSnapshot, connection, pending, error, serverOffsetMs } = state;
  const isPending = pending.length > 0;
  const formattedError = formatErrorMessage(error);

  // Synchronize browser URL to /r/CODE when room session is active
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const activeCode = session?.code || room?.code;
    if (activeCode) {
      const targetPath = `/r/${activeCode.toUpperCase()}`;
      if (window.location.pathname !== targetPath) {
        window.history.replaceState({}, '', targetPath);
      }
    }
  }, [session?.code, room?.code]);

  // Periodically update local clock during write phase so bot lock badges flip reactively
  useEffect(() => {
    if (publicSnapshot?.phase === 'write') {
      const interval = setInterval(() => setNowMs(Date.now()), 500);
      return () => clearInterval(interval);
    }
  }, [publicSnapshot?.phase]);

  const handleLeaveOrReset = () => {
    const socketStore = store as Partial<{ disconnect: () => void; connect: () => void }>;
    if (typeof socketStore.disconnect === 'function') {
      socketStore.disconnect();
    } else {
      store.reset();
    }
    socketStore.connect?.();
    setJoinTarget(null);
    if (typeof window !== 'undefined' && window.location.pathname !== '/') {
      window.history.replaceState({}, '', '/');
    }
  };

  // Handle server match termination / restart
  if (error === 'The presses stopped — this match ended') {
    return (
      <SoundProvider>
        <ServerRestartScreen onReturnHome={handleLeaveOrReset} />
      </SoundProvider>
    );
  }

  // Pre-join: Home and Join Profile Screens
  const renderSetupFlow = () => {
    if (joinTarget) {
      return (
        <JoinScreen
          pending={isPending}
          error={formatErrorMessage(error, 'setup')}
          roomCode={joinTarget.mode === 'join' ? joinTarget.code : undefined}
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
        error={formattedError}
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
        error={formattedError}
        onStartMatch={() => store.actions.startMatch()}
        onLeaveRoom={handleLeaveOrReset}
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
            {formattedError && (
              <div className="screen-error-banner" role="alert" data-testid="loading-error">
                {formattedError}
              </div>
            )}
          </div>
        </div>
      );
    }

    const serverNowMs = nowMs + serverOffsetMs;
    const papers = publicSnapshot.papers.map((p) => paperPublicToView(p, serverNowMs));
    const frontPages = deriveFrontPages(publicSnapshot);
    const proofCards = deriveProofCards(privateSnapshot.proofs, publicSnapshot);
    const evidenceCards = deriveEvidenceCards(privateSnapshot.evidence, publicSnapshot.round);
    const exposures = deriveExposures(publicSnapshot.exposures, publicSnapshot.papers, publicSnapshot.round);
    const recap = deriveRecapText(publicSnapshot.reactionPlan, publicSnapshot.papers);
    const scoreRows = finalToScoreRows(publicSnapshot.final, publicSnapshot.papers);

    // Candidates for rival investigation: rival paper, from an earlier round, and not already exposed
    const rivalHeadlines = publicSnapshot.headlines
      .filter((h) => h.seatId !== session?.seatId && h.round < publicSnapshot.round && !h.exposed)
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
        ticker={publicSnapshot.phase === 'reveal' ? <EditionTicker pages={frontPages} /> : undefined}
        // Investigate and write panels show errors until the player acts; the HUD banner covers everything else.
        error={(publicSnapshot.phase === 'investigate' || publicSnapshot.phase === 'write') && !privateSnapshot.acted
          ? null : formattedError}
      >
        {publicSnapshot.phase === 'intro' && (
          <IntroScreen
            deadlineMs={publicSnapshot.deadlineMs}
            serverTimeOffset={serverOffsetMs}
            onSkipIntro={() => store.actions.skipIntro()}
            ready={privateSnapshot.acted}
          />
        )}

        {publicSnapshot.phase === 'investigate' && (
          <InvestigateScreen
            tipText={privateSnapshot.tip?.text ?? 'No active tip for this round.'}
            round={publicSnapshot.round}
            hasLocked={privateSnapshot.acted}
            rivalHeadlines={rivalHeadlines}
            pending={isPending}
            serverError={formattedError}
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
            round={publicSnapshot.round}
            hasLocked={privateSnapshot.acted}
            lockedHeadline={privateSnapshot.lockedHeadline}
            evidenceCards={evidenceCards}
            proofCards={proofCards}
            serverError={formattedError}
            pending={isPending}
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
            truthRecords={deriveTruthRecords(publicSnapshot.final?.records, publicSnapshot.papers)}
            finalExposures={deriveFinalExposures(publicSnapshot.final, publicSnapshot.papers)}
            headlines={deriveFinalHeadlines(publicSnapshot.headlines, publicSnapshot.papers)}
            onPlayAgain={handleLeaveOrReset}
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
        {connection !== 'connected' && (
          <ConnectionOverlay
            status={connection === 'connecting' && session ? 'reconnecting' : connection}
            onRetry={() => {
              const socketStore = store as Partial<{ connect: () => void }>;
              socketStore.connect?.();
              if (session) {
                store.actions.reconnect(session.code);
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
