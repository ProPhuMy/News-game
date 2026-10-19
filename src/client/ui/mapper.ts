import type {
  PublicSnapshot,
  PrivateSnapshot,
  PaperPublic,
  HeadlinePublic,
  Exposure,
  FinalResult,
  TruthRecord,
} from '../../shared/snapshots.ts';
import type { PaperView } from './hud/SidePanel.tsx';
import type { FrontPageView } from './components/FrontPageCard.tsx';
import type { FinalScoreRow } from './components/ScoreboardTable.tsx';
import type { ExposureEvent } from './components/ExposureBanner.tsx';
import type { ProofCard } from './screens/WriteScreen.tsx';
import type { EvidenceCard } from './components/EvidenceSelector.tsx';
import type { Behavior, Color } from '../../shared/ids.ts';
import { LOCATION_NAMES } from '../../shared/ids.ts';

export const ERROR_MESSAGES: Record<string, string> = {
  ROOM_NOT_FOUND: 'Room not found. Check the room code and try again.',
  ROOM_FULL: 'This town already has 4 active newspapers.',
  COLOR_TAKEN: 'That ink color was already chosen by another editor.',
  MATCH_IN_PROGRESS: 'This match has already begun.',
  SERVER_FULL: 'Server is currently at capacity. Please try again soon.',
  RATE_LIMITED: 'Too many requests. Please wait a moment.',
  NOT_HOST: 'Only the host can start the match.',
  FILTERED: "Our lawyers won't print that — try again.",
  STALE_PHASE: 'The phase has already moved on.',
  ALREADY_ACTED: 'You have already locked in your action for this phase.',
  BAD_TARGET: 'Invalid target selected.',
  BAD_TEXT: 'Headline text is too long or empty.',
  EVIDENCE_MISMATCH: "That evidence does not match your story's location and claim.",
  NO_PROOF: 'No verified proof exists to expose that headline.',
  NOT_ALLOWED: 'Action not allowed at this time.',
  MALFORMED: 'Invalid request.',
  BAD_TOKEN: 'Session expired. Please join again.',
};

/** Before a match, FILTERED can only mean a rejected player or newspaper name. */
const NAME_FILTERED_MESSAGE = 'That name contains blocked language. Please choose another.';

export function formatErrorMessage(error: string | null, context: 'setup' | 'match' = 'match'): string | null {
  if (!error) return null;
  if (error === 'FILTERED' && context === 'setup') return NAME_FILTERED_MESSAGE;
  return ERROR_MESSAGES[error] ?? error;
}

export function paperPublicToView(p: PaperPublic, serverNowMs: number): PaperView {
  const isLocked = p.lockedVisibleAtMs !== null && serverNowMs >= p.lockedVisibleAtMs;
  return {
    seatId: p.seatId,
    paperName: p.paperName,
    playerName: p.displayName,
    color: p.color,
    readers: p.readers,
    totalReaders: p.totalReaders,
    trust: p.trust,
    score: p.score,
    isBot: p.controller === 'bot',
    isCaretaker: p.controller === 'caretaker',
    hasLocked: isLocked,
  };
}

export function headlineToFrontPageView(
  h: HeadlinePublic,
  papers: PaperPublic[],
  exposures: Exposure[]
): FrontPageView {
  const paper = papers.find((p) => p.seatId === h.seatId);
  const exposure = exposures.find((e) => e.headlineId === h.id);
  return {
    id: h.id,
    seatId: h.seatId,
    paperName: paper?.paperName ?? `Paper ${h.seatId}`,
    color: paper?.color ?? 'grey',
    headlineText: h.text,
    hasEvidence: h.evidence,
    isExposed: h.exposed,
    exposureReason: exposure?.explanation,
  };
}

export function deriveFrontPages(pub: PublicSnapshot): FrontPageView[] {
  // Use current reveal exposures only
  const currentExposures =
    pub.reactionPlan?.exposures ?? pub.exposures.filter((e) => e.round === pub.round);

  return pub.papers.map((paper) => {
    const headline = pub.headlines.find(
      (h) => h.seatId === paper.seatId && h.round === pub.round
    );
    if (!headline) {
      return {
        id: `empty-r${pub.round}-s${paper.seatId}`,
        seatId: paper.seatId,
        paperName: paper.paperName,
        color: paper.color,
        headlineText: '[No headline published this round]',
        hasEvidence: false,
        isExposed: false,
      };
    }
    return headlineToFrontPageView(headline, pub.papers, currentExposures);
  });
}

export function deriveProofCards(
  proofs: PrivateSnapshot['proofs'],
  pub: PublicSnapshot
): ProofCard[] {
  return proofs.map((p) => {
    const headline = pub.headlines.find((h) => h.id === p.headlineId);
    const paper = headline ? pub.papers.find((paper) => paper.seatId === headline.seatId) : null;
    return {
      id: p.headlineId,
      targetPaperName: paper?.paperName ?? `Paper ${headline?.seatId ?? '?'}`,
      headlineText: headline?.text ?? `Headline ${p.headlineId}`,
      location: headline?.location ?? 'town_hall',
      claimType: headline?.claim ?? 'expose',
    };
  });
}

export function deriveEvidenceCards(
  evidence: PrivateSnapshot['evidence'],
  round: number
): EvidenceCard[] {
  return evidence
    .filter((e) => e.round === round)
    .map((e, idx) => ({
      id: `ev-${round}-${idx}`,
      round: e.round,
      location: e.location,
      claimType: e.claim,
      description: e.text,
    }));
}

export function deriveExposures(
  exposures: Exposure[],
  papers: PaperPublic[],
  round?: number
): ExposureEvent[] {
  const filtered = round !== undefined ? exposures.filter((e) => e.round === round) : exposures;
  return filtered.map((e) => {
    const paper = papers.find((p) => p.seatId === e.seatId);
    return {
      paperName: paper?.paperName ?? `Paper ${e.seatId}`,
      reason: e.explanation,
    };
  });
}

const BEHAVIOR_VERBS: Record<Behavior, string> = {
  routine: 'went about their day at',
  flee: 'fled in panic from',
  boycott: 'boycotted',
  protest: 'rallied in protest at',
  queue: 'lined up outside',
  curious: 'gathered curiously around',
  relax: 'relaxed peacefully at',
  angry_mob: 'marched furiously on',
};

export function deriveRecapText(
  reactionPlan: PublicSnapshot['reactionPlan'],
  papers: PaperPublic[]
): string {
  if (!reactionPlan?.recap) {
    return 'Citizens are reacting to the latest publications.';
  }
  const { recap } = reactionPlan;
  if (!recap.location) {
    return 'Citizens went about their day.';
  }
  const locName = LOCATION_NAMES[recap.location] ?? recap.location;
  const verb =
    recap.behavior && BEHAVIOR_VERBS[recap.behavior]
      ? BEHAVIOR_VERBS[recap.behavior]
      : 'reacted at';

  const gainingPaper =
    recap.gainSeatId !== null ? papers.find((p) => p.seatId === recap.gainSeatId)?.paperName : null;

  if (gainingPaper && recap.gained > 0) {
    return `${recap.reactors} citizens ${verb} the ${locName}; ${recap.gained} citizens switched to ${gainingPaper}.`;
  }
  if (gainingPaper) {
    return `${recap.reactors} citizens ${verb} the ${locName} for ${gainingPaper}.`;
  }
  return `${recap.reactors} citizens ${verb} the ${locName}.`;
}

export function finalToScoreRows(
  final: FinalResult | null,
  papers: PaperPublic[]
): FinalScoreRow[] {
  if (!final) return [];
  return papers.map((p) => {
    const record = final.records.find((r) => r.seatId === p.seatId);
    const truthRecord = record
      ? `${record.liesTold} lies told, ${record.liesCaught} caught, ${record.liesEscaped} got away`
      : 'No record';
    return {
      seatId: p.seatId,
      paperName: p.paperName,
      playerName: p.displayName,
      color: p.color,
      totalReaders: p.totalReaders,
      finalTrust: p.trust,
      finalScore: p.score,
      truthRecord,
      isWinner: final.winners.includes(p.seatId),
    };
  });
}

export interface TruthRecordView {
  paperName: string;
  color: Color;
  liesTold: number;
  liesCaught: number;
  liesEscaped: number;
}

export function deriveTruthRecords(
  records: TruthRecord[] | undefined,
  papers: PaperPublic[]
): TruthRecordView[] {
  if (!records) return [];
  return records.map((r) => {
    const paper = papers.find((p) => p.seatId === r.seatId);
    return {
      paperName: paper?.paperName ?? `Paper ${r.seatId}`,
      color: paper?.color ?? 'red',
      liesTold: r.liesTold,
      liesCaught: r.liesCaught,
      liesEscaped: r.liesEscaped,
    };
  });
}

export function deriveFinalExposures(
  final: FinalResult | null,
  papers: PaperPublic[]
): ExposureEvent[] {
  if (!final) return [];
  return deriveExposures(final.exposures, papers);
}

export interface FinalHeadlineSummary {
  id: string;
  round: number;
  paperName: string;
  text: string;
  truth: 'true' | 'lie' | 'unknown';
  exposed: boolean;
}

export function deriveFinalHeadlines(
  headlines: HeadlinePublic[],
  papers: PaperPublic[]
): FinalHeadlineSummary[] {
  return headlines.map((h) => {
    const paper = papers.find((p) => p.seatId === h.seatId);
    return {
      id: h.id,
      round: h.round,
      paperName: paper?.paperName ?? `Paper ${h.seatId}`,
      text: h.text,
      truth: h.truth,
      exposed: h.exposed,
    };
  });
}

