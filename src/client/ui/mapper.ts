import type {
  PublicSnapshot,
  PrivateSnapshot,
  PaperPublic,
  HeadlinePublic,
  Exposure,
  FinalResult,
} from '../../shared/snapshots.ts';
import type { PaperView } from './hud/SidePanel.tsx';
import type { FrontPageView } from './components/FrontPageCard.tsx';
import type { FinalScoreRow } from './components/ScoreboardTable.tsx';
import type { ExposureEvent } from './components/ExposureBanner.tsx';
import type { ProofCard } from './screens/WriteScreen.tsx';
import type { EvidenceCard } from './components/EvidenceSelector.tsx';
import { LOCATION_NAMES } from '../../shared/ids.ts';

export function paperPublicToView(p: PaperPublic, serverNowMs: number): PaperView {
  const isLocked = p.lockedVisibleAtMs !== null && serverNowMs >= p.lockedVisibleAtMs;
  return {
    seatId: p.seatId,
    paperName: p.paperName,
    playerName: p.displayName,
    color: p.color,
    readers: p.readers,
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
  const activeHeadlines = pub.headlines.filter(
    (h) => h.round === pub.round || pub.exposures.some((e) => e.headlineId === h.id)
  );
  const headlinesToDisplay = activeHeadlines.length > 0 ? activeHeadlines : pub.headlines;
  return headlinesToDisplay.map((h) => headlineToFrontPageView(h, pub.papers, pub.exposures));
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

export function deriveExposures(exposures: Exposure[], papers: PaperPublic[]): ExposureEvent[] {
  return exposures.map((e) => {
    const paper = papers.find((p) => p.seatId === e.seatId);
    return {
      paperName: paper?.paperName ?? `Paper ${e.seatId}`,
      reason: e.explanation,
    };
  });
}

export function deriveRecapText(
  reactionPlan: PublicSnapshot['reactionPlan'],
  papers: PaperPublic[]
): string {
  if (!reactionPlan?.recap) {
    return 'Citizens are reacting to the latest publications.';
  }
  const { recap } = reactionPlan;
  const locName = recap.location ? LOCATION_NAMES[recap.location] ?? recap.location : 'Town Square';
  const gainingPaper =
    recap.gainSeatId !== null ? papers.find((p) => p.seatId === recap.gainSeatId)?.paperName : null;

  if (gainingPaper && recap.gained > 0) {
    return `${recap.reactors} citizens rushed the ${locName}; ${recap.gained} citizens switched to ${gainingPaper}.`;
  }
  if (gainingPaper) {
    return `${recap.reactors} citizens rushed the ${locName} for ${gainingPaper}.`;
  }
  return `${recap.reactors} citizens reacted at the ${locName}.`;
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
