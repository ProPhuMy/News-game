/** @vitest-environment jsdom */
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { deriveInspectionReport } from '../../src/client/ui/mapper.ts';
import { InspectionReport } from '../../src/client/ui/components/InspectionReport';
import { InvestigateScreen } from '../../src/client/ui/screens/InvestigateScreen';
import { WriteScreen } from '../../src/client/ui/screens/WriteScreen';
import type { PrivateSnapshot, PublicSnapshot } from '../../src/shared/snapshots.ts';

type Priv = Pick<PrivateSnapshot, 'investigations' | 'evidence'>;
type Pub = Pick<PublicSnapshot, 'round' | 'headlines' | 'papers'>;

const pub = (round: number): Pub => ({
  round,
  headlines: [{ id: 'h1', seatId: 2, round: 1, location: 'bank', claim: 'scandal', text: 'Bank <b>vault</b> empty!', exposed: false }] as unknown as Pub['headlines'],
  papers: [{ seatId: 2, paperName: 'The Daily Gasp' }] as unknown as Pub['papers'],
});
const bakeryCheck = (round: number): Priv => ({
  investigations: [{ round, target: { kind: 'location', location: 'bakery' }, outcome: 'evidence' }],
  evidence: [{ round, location: 'bakery', claim: 'health_scare', text: 'Mouse droppings by the flour bins.' }],
});

describe('deriveInspectionReport', () => {
  it('reports the checked place, its true claim and the evidence text for the current round', () => {
    expect(deriveInspectionReport(bakeryCheck(2), pub(2))).toEqual({
      kind: 'evidence', location: 'bakery', claim: 'health_scare', text: 'Mouse droppings by the flour bins.',
    });
  });

  it('never shows an older round as current', () => {
    expect(deriveInspectionReport(bakeryCheck(1), pub(2))).toEqual({ kind: 'none' });
  });

  it('reports a rival check as proof or nothing, never as a location truth', () => {
    const rival = (outcome: 'proof' | 'nothing'): Priv => ({
      investigations: [{ round: 2, target: { kind: 'headline', headlineId: 'h1' }, outcome }], evidence: [],
    });
    expect(deriveInspectionReport(rival('proof'), pub(2))).toEqual({ kind: 'proof', paperName: 'The Daily Gasp', headlineText: 'Bank <b>vault</b> empty!' });
    expect(deriveInspectionReport(rival('nothing'), pub(2))).toEqual({ kind: 'nothing', paperName: 'The Daily Gasp', headlineText: 'Bank <b>vault</b> empty!' });
  });

  it('invents nothing when this round has no investigation', () => {
    expect(deriveInspectionReport({ investigations: [], evidence: [] }, pub(2))).toEqual({ kind: 'none' });
  });
});

describe('InspectionReport card', () => {
  afterEach(cleanup);

  it('labels the result as certain and renders untrusted text literally', () => {
    const { container } = render(<InspectionReport report={{ kind: 'proof', paperName: 'The Daily Gasp', headlineText: 'Bank <b>vault</b> empty!' }} />);
    expect(screen.getByRole('heading', { name: 'Your inspection result' })).toBeDefined();
    expect(container.textContent).toContain('Bank <b>vault</b> empty!');
    expect(container.querySelector('b')).toBeNull();
  });
});

const investigateProps = {
  tipText: 'A van idled behind the bakery.', round: 2, rivalHeadlines: [],
  onInvestigateLocation: vi.fn(), onInvestigateRival: vi.fn(), onSkip: vi.fn(),
};

describe('Investigate after acting', () => {
  afterEach(cleanup);

  it('shows the result at once, keeps the tip, and waits for the other editors instead of a report', () => {
    render(<InvestigateScreen {...investigateProps} hasLocked report={{ kind: 'evidence', location: 'bakery', claim: 'health_scare', text: 'Mouse droppings by the flour bins.' }} />);
    expect(screen.getByText('Mouse droppings by the flour bins.')).toBeDefined();
    expect(screen.getByText(/Bakery/)).toBeDefined();
    expect(screen.getByText(/Health Scare/)).toBeDefined();
    expect(screen.getByText('A van idled behind the bakery.')).toBeDefined();
    expect(screen.queryByText(/Waiting for report/)).toBeNull();
    expect(screen.getByText(/Waiting for the other editors/)).toBeDefined();
  });

  it('says a skip was a skip, with no evidence', () => {
    const { container } = render(<InvestigateScreen {...investigateProps} hasLocked report={{ kind: 'none' }} />);
    expect(container.textContent).toContain('You skipped checking this round.');
    expect(container.querySelector('.inspection-report')).toBeNull();
  });

  it('shows no result before acting', () => {
    const { container } = render(<InvestigateScreen {...investigateProps} hasLocked={false} report={null} />);
    expect(container.querySelector('.inspection-report')).toBeNull();
  });
});

const writeProps = {
  hasLocked: false, proofCards: [], onLockHeadline: vi.fn(), onSkipWrite: vi.fn(),
  tipText: 'A van idled behind the bakery.',
  evidenceCards: [{ id: 'ev-2-0', round: 2, location: 'bakery', claimType: 'health_scare', description: 'Mouse droppings by the flour bins.' }],
  report: { kind: 'evidence', location: 'bakery', claim: 'health_scare', text: 'Mouse droppings by the flour bins.' } as const,
};

describe('Write with a result', () => {
  afterEach(cleanup);

  it('shows the result and the tip before any selection, with how to attach it', () => {
    const { container } = render(<WriteScreen {...writeProps} />);
    expect(container.querySelector('.inspection-report')!.textContent).toContain('Mouse droppings by the flour bins.');
    expect(screen.getByText('A van idled behind the bakery.')).toBeDefined();
    expect(container.textContent).toContain('pick Bakery and Health Scare');
    expect(screen.queryByRole('checkbox')).toBeNull();
  });

  it('keeps the attach box matching-only: location alone is not enough', () => {
    render(<WriteScreen {...writeProps} />);
    fireEvent.click(screen.getByRole('button', { name: 'Bakery' }));
    expect(screen.queryByRole('checkbox')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Danger' }));
    expect(screen.queryByRole('checkbox')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Health Scare' }));
    expect(screen.getByRole('checkbox')).toBeDefined();
  });

  it('keeps typed text and choices across a same-round update', () => {
    const { rerender } = render(<WriteScreen {...writeProps} />);
    fireEvent.click(screen.getByRole('button', { name: 'Bakery' }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Mice at the bakery!' } });
    rerender(<WriteScreen {...writeProps} report={{ ...writeProps.report }} />);
    expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('Mice at the bakery!');
  });
});
