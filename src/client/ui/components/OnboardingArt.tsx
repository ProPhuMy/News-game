import React, { useId } from 'react';
import type { PresentationPalette } from '../../visuals/palette.ts';

// Onboarding mini-comic (approved 2026-10-26): hand-drawn, text-free, palette colors only.
// Captions live in content (rule cards); these drawings are decorative.
export type OnboardingStep = 1 | 2 | 3;

const css = (n: number) => `#${n.toString(16).padStart(6, '0')}`;

interface Colors {
  ink: string; panel: string; border: string; red: string; blue: string; green: string; gold: string; grey: string;
  sky: string; road: string; plaza: string; brick: string; roof: string; wood: string; glow: string; skin: string;
}
function colorsOf(p: PresentationPalette): Colors {
  return {
    ink: p.ui.ink, panel: p.ui.panel, border: p.ui.border,
    red: p.paper.red.css, blue: p.paper.blue.css, green: p.paper.green.css, gold: p.paper.gold.css, grey: p.unsubscribed.css,
    sky: css(p.town.sky), road: css(p.town.road), plaza: css(p.town.plaza), brick: css(p.town.brick),
    roof: css(p.town.roof), wood: css(p.town.wood), glow: css(p.town.lampGlow), skin: p.illustration.skin,
  };
}

type Face = 'smile' | 'wow' | 'sly' | 'angry' | 'happy';
type Arm = 'down' | 'up' | 'out';
interface ChibiProps { c: Colors; x: number; y: number; cap: string; shirt: string; face: Face; s?: number; armL?: Arm; armR?: Arm; flip?: boolean }

const line = (c: Colors) => ({ stroke: c.ink, strokeWidth: 2.5, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const });

function Chibi({ c, x, y, cap, shirt, face, s = 1, armL = 'down', armR = 'down', flip = false }: ChibiProps) {
  const L = line(c);
  const arm = (side: -1 | 1, pose: Arm) => {
    const d = pose === 'up' ? `M${side * 13} 32 L${side * 22} 14` : pose === 'out' ? `M${side * 13} 34 L${side * 27} 34` : `M${side * 13} 34 L${side * 18} 50`;
    return <path d={d} {...L} />;
  };
  const faces: Record<Face, React.ReactNode> = {
    smile: <><circle cx={-8} cy={-2} r={2.6} fill={c.ink} /><circle cx={8} cy={-2} r={2.6} fill={c.ink} /><path d="M-6 7 Q0 12 6 7" fill="none" {...L} /></>,
    wow: <><circle cx={-8} cy={-3} r={3.2} fill={c.ink} /><circle cx={8} cy={-3} r={3.2} fill={c.ink} /><ellipse cx={0} cy={9} rx={3.2} ry={4} fill={c.ink} /></>,
    sly: <><path d="M-12 -2 L-4 -3" {...L} /><path d="M4 -3 L12 -2" {...L} /><path d="M-6 6 Q2 11 8 5" fill="none" {...L} /></>,
    angry: <><path d="M-12 -7 L-4 -3" {...L} /><path d="M12 -7 L4 -3" {...L} /><circle cx={-8} cy={0} r={2.4} fill={c.ink} /><circle cx={8} cy={0} r={2.4} fill={c.ink} /><path d="M-6 10 Q0 6 6 10" fill="none" {...L} /></>,
    happy: <><path d="M-11 -2 Q-8 -6 -5 -2" fill="none" {...L} /><path d="M5 -2 Q8 -6 11 -2" fill="none" {...L} /><path d="M-7 5 Q0 13 7 5 Z" fill={c.ink} /></>,
  };
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`}>
      <ellipse cx={0} cy={78} rx={22} ry={5} fill={c.ink} opacity={0.18} />
      <rect x={-9} y={56} width={7} height={20} rx={3} fill={c.ink} />
      <rect x={2} y={56} width={7} height={20} rx={3} fill={c.ink} />
      <rect x={-15} y={26} width={30} height={34} rx={8} fill={shirt} {...L} />
      {arm(-1, armL)}{arm(1, armR)}
      <rect x={-22} y={-26} width={44} height={44} rx={14} fill={c.skin} {...L} />
      {faces[face]}
      <path d="M-23 -14 Q-22 -32 0 -32 Q22 -32 23 -14 Z" fill={cap} {...L} />
      <path d="M8 -15 L32 -13 Q32 -9 23 -9 L8 -10" fill={cap} {...L} />
    </g>
  );
}

function Bakery({ c, x, y }: { c: Colors; x: number; y: number }) {
  const L = line(c);
  return (
    <g>
      <rect x={x} y={y + 40} width={128} height={100} fill={c.panel} {...L} />
      <path d={`M${x - 8} ${y + 42} L${x + 64} ${y} L${x + 136} ${y + 42} Z`} fill={c.roof} {...L} />
      <circle cx={x + 52} cy={y + 28} r={9} fill="none" stroke={c.gold} strokeWidth={5} />
      <circle cx={x + 76} cy={y + 28} r={9} fill="none" stroke={c.gold} strokeWidth={5} />
      {Array.from({ length: 8 }, (_, i) => <rect key={i} x={x + i * 16} y={y + 52} width={16} height={20} fill={i % 2 === 0 ? c.red : c.panel} />)}
      <rect x={x} y={y + 52} width={128} height={20} fill="none" {...L} />
      <path d={`M${x} ${y + 72} ${'q8 8 16 0 '.repeat(8)}`} fill="none" {...L} />
      <rect x={x + 14} y={y + 86} width={30} height={54} fill={c.wood} {...L} />
      <rect x={x + 60} y={y + 86} width={54} height={34} fill={c.glow} {...L} />
    </g>
  );
}

function Office({ c, x, y }: { c: Colors; x: number; y: number }) {
  const L = line(c);
  return (
    <g>
      <rect x={x + 16} y={y - 14} width={12} height={30} fill={c.brick} {...L} />
      <rect x={x + 86} y={y - 14} width={12} height={30} fill={c.brick} {...L} />
      <path d={`M${x + 4} ${y + 12} q4 -14 10 -22 q4 8 0 22`} fill={c.border} opacity={0.8} />
      <rect x={x} y={y + 10} width={116} height={120} fill={c.wood} {...L} />
      <rect x={x - 6} y={y} width={128} height={16} fill={c.roof} {...L} />
      <rect x={x + 10} y={y + 26} width={96} height={18} fill={c.red} {...L} />
      <rect x={x + 44} y={y + 70} width={28} height={60} fill={c.panel} {...L} />
    </g>
  );
}

function Badge({ c, x, y, fill, mark }: { c: Colors; x: number; y: number; fill: string; mark: 'check' | 'cross' }) {
  const d = mark === 'check' ? 'M-7 1 L-2 6 L8 -5' : 'M-6 -6 L6 6 M6 -6 L-6 6';
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r={16} fill={fill} {...line(c)} />
      <path d={d} fill="none" stroke={c.panel} strokeWidth={4.5} strokeLinecap="round" strokeLinejoin="round" />
    </g>
  );
}

function Emote({ c, x, y, children }: { c: Colors; x: number; y: number; children: React.ReactNode }) {
  return <g transform={`translate(${x} ${y})`}><circle r={13} fill={c.panel} {...line(c)} />{children}</g>;
}

function Front({ c, x, y, rot, w, h, mast }: { c: Colors; x: number; y: number; rot: number; w: number; h: number; mast: string }) {
  const L = line(c);
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      <rect width={w} height={h} rx={3} fill={c.panel} {...L} />
      <rect x={7} y={8} width={w - 14} height={13} fill={mast} />
      <rect x={7} y={28} width={w - 14} height={7} fill={c.ink} />
      <rect x={7} y={40} width={w * 0.6} height={7} fill={c.ink} />
    </g>
  );
}

function Investigate({ c }: { c: Colors }) {
  const L = line(c);
  return (
    <>
      <rect x={0} y={160} width={320} height={60} fill={c.road} />
      <Bakery c={c} x={170} y={34} />
      <Chibi c={c} x={108} y={92} cap={c.red} shirt={c.blue} face="wow" armR="out" />
      <g transform="translate(150 118) rotate(-20)">
        <circle r={17} fill={c.panel} fillOpacity={0.55} {...L} />
        <rect x={-4} y={16} width={8} height={26} rx={3} fill={c.wood} {...L} />
      </g>
      <g transform="translate(36 28) rotate(-6)">
        <rect width={58} height={40} rx={4} fill={c.panel} {...L} />
        <rect x={8} y={10} width={40} height={5} fill={c.ink} />
        <rect x={8} y={20} width={30} height={4} fill={c.border} />
        <rect x={8} y={28} width={36} height={4} fill={c.border} />
      </g>
      <path d="M98 54 q-6 -4 -10 -12" fill="none" {...L} />
      <Badge c={c} x={132} y={22} fill={c.gold} mark="check" />
    </>
  );
}

function Write({ c }: { c: Colors }) {
  const L = line(c);
  return (
    <>
      <rect x={0} y={168} width={320} height={52} fill={c.road} />
      <Office c={c} x={16} y={40} />
      <Chibi c={c} x={178} y={96} cap={c.red} shirt={c.green} face="sly" armR="out" />
      <g transform="translate(212 74) rotate(6)">
        <rect width={76} height={94} rx={3} fill={c.panel} {...L} />
        <rect x={7} y={8} width={62} height={13} fill={c.red} />
        <rect x={7} y={28} width={62} height={7} fill={c.ink} />
        <rect x={7} y={40} width={46} height={7} fill={c.ink} />
        {[55, 63, 71].map((yy) => <rect key={yy} x={7} y={yy} width={27} height={4} fill={c.border} />)}
        <rect x={41} y={55} width={28} height={28} fill={c.border} {...L} />
      </g>
      <Badge c={c} x={156} y={30} fill={c.green} mark="check" />
      <Badge c={c} x={200} y={30} fill={c.red} mark="cross" />
      <path d="M162 48 q4 10 8 16 M196 48 q-4 10 -8 16" fill="none" stroke={c.ink} strokeWidth={2} strokeDasharray="3 4" />
    </>
  );
}

function Reveal({ c }: { c: Colors }) {
  const L = line(c);
  const heart = <path d="M0 6 C-12 -2 -6 -12 0 -5 C6 -12 12 -2 0 6 Z" fill={c.red} />;
  return (
    <>
      <rect x={0} y={156} width={320} height={64} fill={c.plaza} />
      <line x1={160} y1={14} x2={160} y2={206} stroke={c.ink} strokeWidth={2} strokeDasharray="5 6" opacity={0.45} />
      <Chibi c={c} x={52} y={96} cap={c.red} shirt={c.gold} face="happy" armR="up" s={0.8} />
      <g transform="translate(60 62) rotate(10)">
        <rect width={34} height={26} rx={2} fill={c.panel} {...L} />
        <rect x={4} y={4} width={26} height={6} fill={c.red} />
      </g>
      <Chibi c={c} x={116} y={106} cap={c.red} shirt={c.blue} face="happy" s={0.7} />
      <Emote c={c} x={30} y={40}>{heart}</Emote>
      <Emote c={c} x={124} y={52}>{heart}</Emote>
      <g>
        <Front c={c} x={184} y={40} rot={-8} w={56} h={66} mast={c.blue} />
        <path d="M192 88 L232 50 M192 50 L232 88" transform="rotate(-8 212 69)" stroke={c.red} strokeWidth={7} strokeLinecap="round" opacity={0.9} />
      </g>
      <Chibi c={c} x={270} y={108} cap={c.grey} shirt={c.green} face="angry" armL="up" s={0.7} flip />
      <g transform="translate(276 16)">
        <rect x={-2} y={38} width={5} height={44} fill={c.wood} {...L} />
        <rect x={-22} y={8} width={46} height={32} rx={2} fill={c.panel} {...L} />
        <path d="M-10 16 L12 32 M12 16 L-10 32" stroke={c.red} strokeWidth={5} strokeLinecap="round" />
      </g>
      <Emote c={c} x={236} y={110}>
        <path d="M-6 -6 q4 3 0 6 M6 -6 q-4 3 0 6 M-6 6 q4 -3 0 -6" fill="none" stroke={c.red} strokeWidth={3} />
      </Emote>
    </>
  );
}

const SCENES: Record<OnboardingStep, React.FC<{ c: Colors }>> = { 1: Investigate, 2: Write, 3: Reveal };

/** One mini-comic panel. Decorative: the step caption carries the meaning. */
export const StepArt: React.FC<{ step: OnboardingStep; palette: PresentationPalette; className?: string }> = ({ step, palette, className }) => {
  const c = colorsOf(palette);
  const clip = useId();
  const Scene = SCENES[step];
  return (
    <svg viewBox="0 0 320 220" aria-hidden="true" focusable="false" className={className}>
      <defs><clipPath id={clip}><rect width={320} height={220} rx={14} /></clipPath></defs>
      <g clipPath={`url(#${clip})`}>
        <rect width={320} height={220} fill={c.sky} />
        <Scene c={c} />
      </g>
      <rect x={1.5} y={1.5} width={317} height={217} rx={13} fill="none" stroke={c.ink} strokeWidth={3} />
    </svg>
  );
};
