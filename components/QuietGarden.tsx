'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

// ── Types ──────────────────────────────────────────────────────
type PlantType = 'fern' | 'daisy' | 'succulent' | 'mint' | 'lavender' | 'chamomile' | 'moonflower' | 'bonsai' | 'wisteria' | 'cherry';
type Stage = 0 | 1 | 2 | 3;

interface Pot {
  id: number;
  plant: PlantType | null;
  stage: Stage;
  timer: number;
  watered: boolean;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  type: 'drop' | 'spark';
  life: number;
  color: string;
  size: number;
}

interface Toast {
  id: number;
  msg: string;
}

// ── Constants ──────────────────────────────────────────────────
const STAGE_SECS = 15;
const WATER_BOOST = 3;
const SAVE_KEY = 'quiet_garden_v2';
const STARTER_SEEDS: PlantType[] = ['fern', 'daisy', 'succulent', 'mint'];

const ALL_SEEDS: { type: PlantType; label: string; color: string }[] = [
  { type: 'fern',       label: 'Fern',          color: '#6aab6a' },
  { type: 'daisy',      label: 'Daisy',          color: '#e8c85a' },
  { type: 'succulent',  label: 'Succulent',      color: '#7bd47c' },
  { type: 'mint',       label: 'Mint',           color: '#5cbf85' },
  { type: 'lavender',   label: 'Lavender',       color: '#b59fd3' },
  { type: 'chamomile',  label: 'Chamomile',      color: '#f5d78e' },
  { type: 'moonflower', label: 'Moonflower',     color: '#c9c0f0' },
  { type: 'bonsai',     label: 'Bonsai',         color: '#9a7a66' },
  { type: 'wisteria',   label: 'Wisteria',       color: '#c384d4' },
  { type: 'cherry',     label: 'Cherry Blossom', color: '#f4a0b5' },
];

const SHOP_SEEDS: { type: PlantType; price: number }[] = [
  { type: 'lavender',   price: 50  },
  { type: 'chamomile',  price: 80  },
  { type: 'moonflower', price: 150 },
  { type: 'bonsai',     price: 200 },
  { type: 'wisteria',   price: 350 },
  { type: 'cherry',     price: 500 },
];

const UNLOCK_STEPS = [
  { pts: 100,  msg: 'New pot unlocked! 🪴 Visit the shop for more seeds.' },
  { pts: 250,  msg: 'New pot unlocked! 🌿 Keep growing!' },
  { pts: 500,  msg: 'Moon-glazed pot unlocked! ✨ Check the shop.' },
  { pts: 800,  msg: 'New pot unlocked! 🌳 Your garden expands.' },
  { pts: 1200, msg: 'Ceramic pot unlocked! 🍇 Beautiful collection.' },
  { pts: 1800, msg: 'New pot unlocked! 🌸 Garden in full bloom.' },
];

function getPotCount(pts: number) {
  if (pts >= 1800) return 8;
  if (pts >= 1200) return 7;
  if (pts >= 500)  return 6;
  if (pts >= 250)  return 5;
  if (pts >= 100)  return 4;
  return 3;
}

function makePot(id: number): Pot {
  return { id, plant: null, stage: 0, timer: STAGE_SECS, watered: false };
}

// ── Plant SVGs ─────────────────────────────────────────────────

function SeedSvg({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 44 50" width="36" height="40">
      <ellipse cx="22" cy="30" rx="10" ry="13" fill={color} opacity={0.75} />
      <ellipse cx="19" cy="26" rx="4" ry="6" fill="white" opacity={0.18} />
    </svg>
  );
}

function SproutSvg({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 60 80" width="56" height="72">
      <path d="M30 76 Q30 52 30 40" stroke={color} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M30 58 Q16 50 13 38 Q22 40 30 52" fill={color} opacity={0.85} />
      <path d="M30 64 Q44 54 47 42 Q38 44 30 58" fill={color} opacity={0.7} />
    </svg>
  );
}

function GrowingSvg({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 70 100" width="66" height="94">
      <path d="M35 96 Q35 65 35 48" stroke={color} strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M35 72 Q18 62 13 48 Q24 50 35 65" fill={color} opacity={0.85} />
      <path d="M35 80 Q52 68 57 54 Q46 56 35 70" fill={color} opacity={0.75} />
      <path d="M35 56 Q22 46 20 34 Q30 36 35 50" fill={color} opacity={0.7} />
    </svg>
  );
}

function BloomFern() {
  return (
    <svg viewBox="0 0 80 110" width="80" height="108">
      <path d="M40 104 Q40 72 40 52" stroke="#5a8c5a" strokeWidth="3" fill="none" />
      {Array.from({ length: 9 }, (_, i) => {
        const y = 96 - i * 7;
        const sp = 6 + i * 1.4;
        const side = i % 2 === 0 ? -1 : 1;
        return <path key={i} d={`M40 ${y} Q${40 + side * sp} ${y - 5} ${40 + side * (sp + 7)} ${y - 11}`} stroke="#6aab6a" strokeWidth="1.8" fill="none" strokeLinecap="round" opacity={0.9} />;
      })}
      <path d="M40 76 Q20 56 10 40 Q25 44 39 70" fill="#7abd7a" opacity={0.5} />
      <path d="M40 82 Q60 60 70 44 Q55 48 41 74" fill="#6aab6a" opacity={0.45} />
    </svg>
  );
}

function BloomDaisy() {
  return (
    <svg viewBox="0 0 90 120" width="88" height="118">
      <path d="M45 114 Q45 82 45 66" stroke="#8a7a5a" strokeWidth="2.5" fill="none" />
      <path d="M45 88 Q30 76 25 62 Q36 64 45 80" fill="#9ab56a" opacity={0.8} />
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2;
        const px = 45 + Math.cos(a) * 22, py = 48 + Math.sin(a) * 22;
        return <ellipse key={i} cx={px} cy={py} rx="9" ry="13" fill="#f0e88a" opacity={0.88} transform={`rotate(${(i / 8) * 360 + 90},${px},${py})`} />;
      })}
      <circle cx="45" cy="48" r="12" fill="#e8b84a" />
      <circle cx="45" cy="48" r="7" fill="#f5c85a" />
    </svg>
  );
}

function BloomSucculent() {
  const layers = [
    { n: 6, r: 20, rx: 6, ry: 10, c: '#7ad47a' },
    { n: 6, r: 13, rx: 5, ry: 8,  c: '#8ae88a' },
    { n: 5, r: 7,  rx: 4, ry: 7,  c: '#a4f0a4' },
  ];
  return (
    <svg viewBox="0 0 80 90" width="78" height="88">
      {layers.map((l, li) =>
        Array.from({ length: l.n }, (_, i) => {
          const a = (i / l.n) * Math.PI * 2 + li * 0.26;
          const px = 40 + Math.cos(a) * l.r, py = 50 + Math.sin(a) * l.r;
          return <ellipse key={`${li}-${i}`} cx={px} cy={py} rx={l.rx} ry={l.ry} fill={l.c} opacity={0.9} transform={`rotate(${(a * 180) / Math.PI + 90},${px},${py})`} />;
        })
      )}
      <circle cx="40" cy="50" r="6" fill="#c4f0c4" />
    </svg>
  );
}

function BloomMint() {
  return (
    <svg viewBox="0 0 70 100" width="68" height="98">
      <path d="M35 96 Q35 66 35 52" stroke="#4a9a6a" strokeWidth="2.5" fill="none" />
      {[72, 80, 64, 56, 74].map((y, i) => (
        <ellipse key={i} cx={35 + (i % 2 === 0 ? -13 : 13)} cy={y} rx="14" ry="10" fill="#5cbf85" opacity={0.82} transform={`rotate(${i % 2 === 0 ? -20 : 20},${35 + (i % 2 === 0 ? -13 : 13)},${y})`} />
      ))}
      {[0, 60, 120, 180, 240, 300].map((a, i) => {
        const r = (a * Math.PI) / 180;
        return <circle key={i} cx={35 + Math.cos(r) * 8} cy={40 + Math.sin(r) * 8} r="3" fill="#b59fd3" opacity={0.9} />;
      })}
      <circle cx="35" cy="40" r="3.5" fill="#d4c0f0" />
    </svg>
  );
}

function BloomLavender() {
  return (
    <svg viewBox="0 0 70 120" width="68" height="118">
      <path d="M35 112 Q35 76 35 62" stroke="#7a6a90" strokeWidth="2.5" fill="none" />
      <path d="M35 78 Q24 62 21 46" stroke="#8a7aa0" strokeWidth="2" fill="none" />
      <path d="M35 78 Q46 62 49 46" stroke="#8a7aa0" strokeWidth="2" fill="none" />
      {[46, 52, 58, 64, 70].map((y, i) => (
        <ellipse key={`l${i}`} cx={21 + (i - 2) * 0.5} cy={y} rx="4" ry="6" fill="#b59fd3" opacity={0.85} />
      ))}
      {[46, 52, 58, 64, 70].map((y, i) => (
        <ellipse key={`r${i}`} cx={49 - (i - 2) * 0.5} cy={y} rx="4" ry="6" fill="#c8b0e8" opacity={0.85} />
      ))}
      {[44, 50, 56, 62, 68, 74].map((y, i) => (
        <ellipse key={`m${i}`} cx={35} cy={y} rx="5" ry="7" fill="#a890cc" opacity={0.88} />
      ))}
    </svg>
  );
}

function BloomChamomile() {
  return (
    <svg viewBox="0 0 90 120" width="88" height="118">
      <path d="M45 114 Q45 84 45 70" stroke="#8a7a5a" strokeWidth="2.5" fill="none" />
      <path d="M45 90 Q30 80 26 67 Q37 69 45 83" fill="#9ab56a" opacity={0.8} />
      {Array.from({ length: 14 }, (_, i) => {
        const a = (i / 14) * Math.PI * 2;
        const px = 45 + Math.cos(a) * 24, py = 54 + Math.sin(a) * 24;
        return <ellipse key={i} cx={px} cy={py} rx="6" ry="15" fill="white" opacity={0.88} transform={`rotate(${(i / 14) * 360 + 90},${px},${py})`} />;
      })}
      <circle cx="45" cy="54" r="12" fill="#f5c844" />
      <circle cx="45" cy="54" r="8" fill="#f8d860" />
    </svg>
  );
}

function BloomMoonflower() {
  return (
    <svg viewBox="0 0 90 120" width="88" height="118">
      <path d="M45 114 Q45 82 45 67" stroke="#7a70a0" strokeWidth="2.5" fill="none" />
      {Array.from({ length: 6 }, (_, i) => {
        const a = (i / 6) * Math.PI * 2;
        const px = 45 + Math.cos(a) * 26, py = 52 + Math.sin(a) * 26;
        return <ellipse key={i} cx={px} cy={py} rx="12" ry="20" fill="#d8d0f8" opacity={0.86} transform={`rotate(${(i / 6) * 360 + 90},${px},${py})`} />;
      })}
      <circle cx="45" cy="52" r="10" fill="#ede8ff" />
      <circle cx="45" cy="52" r="5" fill="white" opacity={0.9} />
      <circle cx="45" cy="52" r="20" fill="none" stroke="#c9c0f0" strokeWidth="1" opacity={0.35} />
    </svg>
  );
}

function BloomBonsai() {
  return (
    <svg viewBox="0 0 100 120" width="98" height="118">
      <path d="M50 116 Q48 96 46 80 Q50 70 54 80 Q52 96 50 116" fill="#8b6e5a" />
      <path d="M47 90 Q30 76 20 65" stroke="#9a7a66" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M53 86 Q70 72 80 62" stroke="#9a7a66" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M48 76 Q34 62 26 52" stroke="#9a7a66" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M52 73 Q66 60 74 50" stroke="#9a7a66" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {([[20,58,16],[80,55,14],[26,46,15],[74,44,13],[50,40,18],[35,35,13],[65,33,12]] as [number,number,number][]).map(([cx,cy,r],i) => (
        <ellipse key={i} cx={cx} cy={cy} rx={r*1.2} ry={r*0.9} fill={i%2===0?'#5a8c5a':'#6a9c6a'} opacity={0.88} />
      ))}
    </svg>
  );
}

function BloomWisteria() {
  return (
    <svg viewBox="0 0 90 130" width="88" height="128">
      <path d="M45 122 Q45 92 45 77" stroke="#7a6090" strokeWidth="2.5" fill="none" />
      <path d="M20 74 Q45 67 70 74" stroke="#8a6a7a" strokeWidth="2" fill="none" />
      {[-22,-11,0,11,22].map((dx, col) => {
        const sy = 62 + Math.abs(dx) * 0.3;
        const rows = 6 + Math.max(0, 4 - Math.round(Math.abs(dx)/8));
        return (
          <g key={col}>
            {Array.from({ length: rows }, (_, row) => (
              <ellipse key={row} cx={45+dx+(row%2)*3-1.5} cy={sy+row*8} rx="6" ry="5"
                fill={row%2===0?'#c384d4':'#b070c0'} opacity={0.85} />
            ))}
          </g>
        );
      })}
    </svg>
  );
}

function BloomCherry() {
  const blossoms = [[30,35],[50,28],[68,38],[22,52],[45,48],[70,52],[35,65],[58,62],[28,72],[62,75]] as [number,number][];
  return (
    <svg viewBox="0 0 95 130" width="93" height="128">
      <path d="M48 122 Q46 102 44 84 Q48 74 52 84 Q50 102 48 122" fill="#8b5e5a" />
      <path d="M45 92 Q28 74 18 57" stroke="#9a6866" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M50 87 Q68 70 78 54" stroke="#9a6866" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M46 82 Q38 64 32 50" stroke="#8a5e5e" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M50 80 Q58 62 66 48" stroke="#8a5e5e" strokeWidth="2" fill="none" strokeLinecap="round" />
      {blossoms.map(([cx,cy],bi) => (
        <g key={bi}>
          {[0,72,144,216,288].map((a) => {
            const r = (a*Math.PI)/180;
            return <ellipse key={a} cx={cx+Math.cos(r)*7} cy={cy+Math.sin(r)*7} rx="5" ry="7"
              fill={bi%3===0?'#f4a0b5':bi%3===1?'#f8c0cf':'#ffd0de'} opacity={0.88}
              transform={`rotate(${a+90},${cx+Math.cos(r)*7},${cy+Math.sin(r)*7})`} />;
          })}
          <circle cx={cx} cy={cy} r="3.5" fill="#f8e0e8" />
        </g>
      ))}
    </svg>
  );
}

function PlantIllustration({ type, stage }: { type: PlantType; stage: Stage }) {
  const info = ALL_SEEDS.find(s => s.type === type)!;
  if (stage === 0) return <SeedSvg color={info.color} />;
  if (stage === 1) return <SproutSvg color={info.color} />;
  if (stage === 2) return <GrowingSvg color={info.color} />;
  switch (type) {
    case 'fern':       return <BloomFern />;
    case 'daisy':      return <BloomDaisy />;
    case 'succulent':  return <BloomSucculent />;
    case 'mint':       return <BloomMint />;
    case 'lavender':   return <BloomLavender />;
    case 'chamomile':  return <BloomChamomile />;
    case 'moonflower': return <BloomMoonflower />;
    case 'bonsai':     return <BloomBonsai />;
    case 'wisteria':   return <BloomWisteria />;
    case 'cherry':     return <BloomCherry />;
    default:           return <BloomDaisy />;
  }
}

// ── Pot SVG ────────────────────────────────────────────────────

function PotSvg({ idx, glowing }: { idx: number; glowing: boolean }) {
  const styles = [
    { body: '#c4714a', rim: '#d4855e', soil: '#5a3d2a', shadow: '#a05a3a' },
    { body: '#be6a45', rim: '#ce7e59', soil: '#523825', shadow: '#9a5435' },
    { body: '#b86040', rim: '#c87454', soil: '#4a3020', shadow: '#904e30' },
    { body: '#6a8fc4', rim: '#7aa3d8', soil: '#3a4a2a', shadow: '#4a6fa0' },
    { body: '#7aaa88', rim: '#90c09e', soil: '#3a4a2a', shadow: '#5a8a68' },
    { body: '#9888cc', rim: '#b0a0e0', soil: '#2a2a4a', shadow: '#7868aa' },
    { body: '#c4a47a', rim: '#d8bc92', soil: '#3a2a1a', shadow: '#a08460' },
    { body: '#88c4d8', rim: '#a0d8ec', soil: '#1a2a3a', shadow: '#68a4b8' },
  ];
  const s = styles[Math.min(idx, 7)];
  const isMoon = idx === 5;
  const isCrystal = idx === 7;
  const filterId = `potGlow${idx}`;

  return (
    <svg viewBox="0 0 80 68" width="80" height="68">
      <defs>
        {glowing && (
          <filter id={filterId} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        )}
        {isMoon && (
          <linearGradient id="mg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#c8b8ee" />
            <stop offset="50%" stopColor="#9888cc" />
            <stop offset="100%" stopColor="#b8a8de" />
          </linearGradient>
        )}
        {isCrystal && (
          <linearGradient id="cg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a8d8ec" />
            <stop offset="50%" stopColor="#88c4d8" />
            <stop offset="100%" stopColor="#c8e8f4" />
          </linearGradient>
        )}
      </defs>
      <path
        d="M17 22 L11 63 Q40 68 69 63 L63 22 Z"
        fill={isMoon ? 'url(#mg)' : isCrystal ? 'url(#cg)' : s.body}
        filter={glowing ? `url(#${filterId})` : undefined}
      />
      <path d="M21 26 L17 56 Q23 58 27 56 L29 26 Z" fill="white" opacity={0.09} />
      <path d="M59 26 L63 58 Q57 60 53 58 L51 26 Z" fill="black" opacity={0.07} />
      <ellipse cx="40" cy="22" rx="23" ry="6" fill={s.rim} />
      <ellipse cx="40" cy="22" rx="19" ry="4" fill={s.soil} opacity={0.9} />
      <ellipse cx="40" cy="63" rx="23" ry="3.5" fill={s.shadow} />
      {isMoon && ([[28,38],[48,32],[35,50],[55,46],[25,55]] as [number,number][]).map(([x,y],i) => (
        <circle key={i} cx={x} cy={y} r="2" fill="white" opacity={0.18} />
      ))}
      {isCrystal && (
        <>
          <path d="M30 28 L38 63" stroke="white" strokeWidth="0.8" opacity={0.18} />
          <path d="M50 28 L42 63" stroke="white" strokeWidth="0.8" opacity={0.18} />
        </>
      )}
      {idx === 6 && (
        <path d="M14 42 Q40 46 66 42" stroke="#e8d4b0" strokeWidth="1.5" fill="none" opacity={0.55} />
      )}
    </svg>
  );
}

// ── Watering Can SVG ───────────────────────────────────────────

function CanSvg({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 48 48" width="28" height="28">
      <defs>
        {active && (
          <filter id="canGlow">
            <feGaussianBlur stdDeviation="2" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        )}
      </defs>
      <path d="M8 20 L10 38 Q24 42 38 38 L40 20 Z" fill={active ? '#88c4d8' : '#6a9aae'} filter={active ? 'url(#canGlow)' : undefined} />
      <path d="M37 24 Q44 18 46 14 Q44 12 42 14 L38 22" fill={active ? '#7ab4c8' : '#5a8a9e'} />
      <path d="M10 22 Q4 20 4 28 Q4 36 12 34" stroke={active ? '#a0d4e8' : '#6a9aae'} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <ellipse cx="46" cy="13" rx="3" ry="2" fill={active ? '#b0e4f8' : '#88b8cc'} />
      {active && [[44,18],[46,20],[42,22]].map(([x,y],i) => (
        <circle key={i} cx={x} cy={y} r="1.2" fill="#88c4d8" opacity={0.7 - i * 0.15} />
      ))}
    </svg>
  );
}

// ── Pot Slot ───────────────────────────────────────────────────

function PotSlot({
  pot, potIdx, onDrop, onClickPot,
}: {
  pot: Pot;
  potIdx: number;
  onDrop: (e: React.DragEvent) => void;
  onClickPot: (rect: DOMRect) => void;
}) {
  const slotRef      = useRef<HTMLDivElement>(null);
  const [dragOver, setDragOver]           = useState(false);
  const [waterDragOver, setWaterDragOver] = useState(false);

  const isEmpty    = !pot.plant;
  const isBloom    = pot.stage === 3 && !!pot.plant;
  const needsWater = !!pot.plant && !pot.watered;
  const progress   = (pot.plant && pot.stage < 3 && pot.watered)
    ? (STAGE_SECS - pot.timer) / STAGE_SECS : 0;
  const stageLabel = ['Seed', 'Sprout', 'Growing', 'Full Bloom'][pot.stage];
  const plantInfo  = ALL_SEEDS.find(s => s.type === pot.plant);

  function handleClick() {
    if (!slotRef.current) return;
    onClickPot(slotRef.current.getBoundingClientRect());
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    if (e.dataTransfer.types.includes('dragwater')) {
      setWaterDragOver(!!pot.plant);
      setDragOver(false);
    } else {
      setDragOver(isEmpty);
      setWaterDragOver(false);
    }
  }

  function handleDragLeave(e: React.DragEvent) {
    if (!slotRef.current?.contains(e.relatedTarget as Node)) {
      setDragOver(false);
      setWaterDragOver(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    setDragOver(false);
    setWaterDragOver(false);
    onDrop(e);
  }

  return (
    <div
      ref={slotRef}
      className="flex flex-col items-center gap-1"
      style={{ width: 96 }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Plant display */}
      <div className="relative flex items-end justify-center" style={{ height: 112, width: 96 }}>
        {pot.plant && (
          <div
            className={`absolute left-1/2 -translate-x-1/2 transition-all duration-700${isBloom ? ' garden-bloom-glow' : ''} garden-stage-enter`}
            style={{ bottom: '-24px', cursor: isBloom ? 'pointer' : 'default' }}
            onClick={handleClick}
          >
            <PlantIllustration type={pot.plant} stage={pot.stage} />
          </div>
        )}
        {isEmpty && dragOver && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ color: '#9882bd', fontSize: 22 }}>✦</div>
        )}
        {waterDragOver && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span style={{ fontSize: 24, filter: 'drop-shadow(0 0 8px rgba(136,196,216,0.8))' }}>💧</span>
          </div>
        )}
      </div>

      {/* Pot body */}
      <div
        className="relative cursor-pointer"
        style={{
          outline: waterDragOver
            ? '2px dashed rgba(136,196,216,0.6)'
            : dragOver
              ? '2px dashed rgba(152,130,189,0.55)'
              : '2px solid transparent',
          borderRadius: 10,
          transition: 'outline 0.15s',
        }}
        onClick={handleClick}
      >
        <PotSvg idx={potIdx} glowing={isBloom} />
        {needsWater && (
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-2 py-0.5 text-[9px]"
            style={{ background: 'rgba(136,196,216,0.18)', color: '#88c4d8', border: '1px solid rgba(136,196,216,0.3)' }}>
            water me
          </div>
        )}
      </div>

      {/* Progress bar */}
      {pot.plant && pot.stage < 3 && pot.watered && (
        <div className="w-full rounded-full overflow-hidden" style={{ height: 3, background: 'rgba(255,255,255,0.08)' }}>
          <div className="h-full rounded-full transition-all duration-1000"
            style={{ width: `${progress * 100}%`, background: plantInfo?.color ?? '#9882bd' }} />
        </div>
      )}

      {/* Label */}
      <div className="text-center" style={{ minHeight: 30 }}>
        {pot.plant ? (
          <>
            <p className="text-[10px] leading-tight" style={{ color: '#9b93b0' }}>{plantInfo?.label}</p>
            <p className="text-[9px] leading-tight" style={{ color: isBloom ? '#c8b0e8' : '#6b6380' }}>
              {isBloom ? 'tap to harvest ✦' : stageLabel}
            </p>
          </>
        ) : (
          <p className="text-[10px]" style={{ color: dragOver ? '#9882bd' : '#4a4560' }}>
            {dragOver ? 'drop here' : 'empty'}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Shop Modal ─────────────────────────────────────────────────

function ShopModal({
  points, displayPts, purchasedSeeds, onBuy, onClose,
}: {
  points: number;
  displayPts: number;
  purchasedSeeds: PlantType[];
  onBuy: (type: PlantType, price: number) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="rounded-3xl p-6 w-full max-w-sm mx-4"
        style={{
          background: 'linear-gradient(145deg,#1c1438 0%,#1e1840 100%)',
          border: '1px solid rgba(152,130,189,0.3)',
          boxShadow: '0 8px 48px rgba(0,0,0,0.7)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 18 }}>🛍</span>
            <h2 className="font-serif text-lg font-medium" style={{ color: '#dcd6eb' }}>Garden Shop</h2>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full text-sm transition-opacity hover:opacity-70"
            style={{ color: '#9b93b0', background: 'rgba(255,255,255,0.06)' }}
          >✕</button>
        </div>
        <p className="text-xs mb-5" style={{ color: '#6b6380' }}>
          Balance:{' '}
          <span style={{ color: '#b59fd3', fontWeight: 500 }}>{displayPts} ✦</span>
        </p>

        {/* Seed list */}
        <div className="flex flex-col gap-2">
          {SHOP_SEEDS.map(({ type, price }) => {
            const seed      = ALL_SEEDS.find(s => s.type === type)!;
            const owned     = purchasedSeeds.includes(type);
            const canAfford = points >= price;
            return (
              <div
                key={type}
                className="flex items-center gap-3 p-3 rounded-xl"
                style={{
                  background: owned ? 'rgba(106,171,106,0.06)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${owned ? 'rgba(106,171,106,0.18)' : 'rgba(255,255,255,0.07)'}`,
                }}
              >
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{
                    background: `radial-gradient(circle at 35% 35%, ${seed.color}88, ${seed.color}33)`,
                    border: `1px solid ${seed.color}44`,
                  }}
                >
                  <SeedSvg color={seed.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: '#dcd6eb' }}>{seed.label}</p>
                  <p className="text-[11px]" style={{ color: '#6b6380' }}>{price} ✦</p>
                </div>
                {owned ? (
                  <span
                    className="text-[11px] px-3 py-1 rounded-full flex-shrink-0"
                    style={{ background: 'rgba(106,171,106,0.15)', color: '#6aab6a', border: '1px solid rgba(106,171,106,0.25)' }}
                  >
                    Owned
                  </span>
                ) : (
                  <button
                    onClick={() => onBuy(type, price)}
                    disabled={!canAfford}
                    className="text-[11px] px-3 py-1 rounded-full flex-shrink-0 transition-all"
                    style={{
                      background: canAfford ? 'rgba(152,130,189,0.22)' : 'rgba(255,255,255,0.04)',
                      color: canAfford ? '#c8b0e8' : '#4a4560',
                      border: `1px solid ${canAfford ? 'rgba(152,130,189,0.4)' : 'rgba(255,255,255,0.07)'}`,
                      cursor: canAfford ? 'pointer' : 'not-allowed',
                    }}
                  >
                    Buy
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <p className="text-[10px] text-center mt-5" style={{ color: '#3d3655' }}>
          Earn points by watering and harvesting plants
        </p>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────

export default function QuietGarden() {
  const [points, setPoints]         = useState(0);
  const [peakPoints, setPeakPoints] = useState(0);
  const [displayPts, setDisplayPts] = useState(0);
  const [pots, setPots]             = useState<Pot[]>(() => [makePot(0), makePot(1), makePot(2)]);
  const [particles, setParticles]   = useState<Particle[]>([]);
  const [toasts, setToasts]         = useState<Toast[]>([]);
  const [hydrated, setHydrated]     = useState(false);
  const [purchasedSeeds, setPurchasedSeeds] = useState<PlantType[]>(STARTER_SEEDS);
  const [showShop, setShowShop]     = useState(false);
  const [rainOn, setRainOn]         = useState(false);

  // Rain drops: fixed positions/timings generated once so they don't reshuffle on re-render
  const rainDrops = useMemo(() =>
    Array.from({ length: 70 }, (_, i) => ({
      x:        (i * 14.3 + (i * i * 0.41)) % 100,
      height:   10 + (i % 6) * 7,
      duration: 0.5 + (i % 8) * 0.07,
      delay:    -((i * 0.19) % 1.4),
      opacity:  0.12 + (i % 5) * 0.055,
      width:    i % 4 === 0 ? 1 : 1.5,
    })), []);

  const dragSeed   = useRef<PlantType | null>(null);
  const particleId = useRef(0);
  const toastId    = useRef(0);
  const notified   = useRef<Set<number>>(new Set());

  const stars = useMemo(() =>
    Array.from({ length: 45 }, (_, i) => ({
      x: ((i * 137.508) % 100),
      y: ((i * 97.3) % 65),
      size: (i % 3) * 0.6 + 0.8,
      delay: (i * 0.37) % 4,
      dur: (i % 3) + 2.5,
    })), []);

  // ── Hydration ─────────────────────────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        if (typeof d.points === 'number') { setPoints(d.points); setDisplayPts(d.points); }
        if (typeof d.peakPoints === 'number') setPeakPoints(d.peakPoints);
        if (Array.isArray(d.pots))           setPots(d.pots);
        if (Array.isArray(d.notified))       notified.current = new Set(d.notified);
        if (Array.isArray(d.purchasedSeeds)) setPurchasedSeeds(d.purchasedSeeds);
      }
    } catch { /* ignore */ }
    setHydrated(true);
  }, []);

  // ── Persist ───────────────────────────────────────────────────
  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      points, peakPoints, pots, notified: [...notified.current], purchasedSeeds,
    }));
  }, [points, pots, purchasedSeeds, hydrated]);

  // ── Peak points (high-watermark so spending never removes pots) ─
  useEffect(() => {
    setPeakPoints(prev => Math.max(prev, points));
  }, [points]);

  // ── Pot count sync ────────────────────────────────────────────
  useEffect(() => {
    const needed = getPotCount(peakPoints);
    setPots(prev => {
      if (prev.length >= needed) return prev;
      return [...prev, ...Array.from({ length: needed - prev.length }, (_, i) => makePot(prev.length + i))];
    });
  }, [peakPoints]);

  // ── Unlock toasts ─────────────────────────────────────────────
  useEffect(() => {
    for (const u of UNLOCK_STEPS) {
      if (peakPoints >= u.pts && !notified.current.has(u.pts)) {
        notified.current.add(u.pts);
        const id = ++toastId.current;
        setToasts(p => [...p, { id, msg: u.msg }]);
        setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4500);
      }
    }
  }, [peakPoints]);

  // ── Animated counter ──────────────────────────────────────────
  useEffect(() => {
    if (displayPts === points) return;
    const diff = points - displayPts;
    const step = Math.max(1, Math.ceil(Math.abs(diff) / 12));
    const t = setTimeout(() => {
      setDisplayPts(p => diff > 0 ? Math.min(p + step, points) : Math.max(p - step, points));
    }, 28);
    return () => clearTimeout(t);
  }, [points, displayPts]);

  // ── Growth tick ───────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => {
      setPots(prev => prev.map(pot => {
        if (!pot.plant || !pot.watered || pot.stage >= 3) return pot;
        const t = pot.timer - 1;
        if (t <= 0) return { ...pot, stage: (pot.stage + 1) as Stage, timer: STAGE_SECS };
        return { ...pot, timer: t };
      }));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // ── Particle tick ─────────────────────────────────────────────
  useEffect(() => {
    if (particles.length === 0) return;
    const id = setInterval(() => {
      setParticles(prev =>
        prev
          .map(p => ({ ...p, life: p.life - 0.045, x: p.x + p.vx, y: p.y + p.vy, vy: p.vy + 0.12 }))
          .filter(p => p.life > 0)
      );
    }, 40);
    return () => clearInterval(id);
  }, [particles.length]);

  // ── Seed drag ─────────────────────────────────────────────────
  const onSeedDragStart = useCallback((type: PlantType, e: React.DragEvent) => {
    e.dataTransfer.setData('dragseed', type);
    dragSeed.current = type;
  }, []);

  // ── Pot drop: handles seed AND water drops ────────────────────
  const onPotDrop = useCallback((potId: number, e: React.DragEvent) => {
    e.preventDefault();
    const isWater = e.dataTransfer.types.includes('dragwater');

    if (isWater) {
      const cx = e.clientX;
      const cy = e.clientY;
      setPots(prev => prev.map(pot => {
        if (pot.id !== potId || !pot.plant || pot.stage >= 3) return pot;

        const drops: Particle[] = Array.from({ length: 10 }, () => ({
          id: ++particleId.current,
          x: cx + (Math.random() - 0.5) * 28,
          y: cy - 8,
          vx: (Math.random() - 0.5) * 2.5,
          vy: -(Math.random() * 2.8 + 0.8),
          type: 'drop' as const,
          life: 1,
          color: Math.random() > 0.5 ? '#88c8f0' : '#aadcf8',
          size: Math.random() * 4 + 3,
        }));
        setParticles(p => [...p, ...drops]);
        setPoints(p => p + 5);

        const newTimer = pot.watered ? Math.max(pot.timer - WATER_BOOST, 1) : pot.timer;
        return { ...pot, watered: true, timer: newTimer };
      }));
    } else {
      const seed = dragSeed.current;
      if (!seed) return;
      dragSeed.current = null;
      setPots(prev => prev.map(pot =>
        pot.id === potId && !pot.plant
          ? { ...pot, plant: seed, stage: 0, timer: STAGE_SECS, watered: false }
          : pot
      ));
    }
  }, []);

  // ── Click pot: harvest only ───────────────────────────────────
  const onPotClick = useCallback((potId: number, rect: DOMRect) => {
    setPots(prev => prev.map(pot => {
      if (pot.id !== potId || pot.stage !== 3 || !pot.plant) return pot;

      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height * 0.3;
      const colors = ['#f4a0b5', '#b59fd3', '#f5d78e', '#7abd7a', '#88c4d8', '#c9c0f0'];
      const sparks: Particle[] = Array.from({ length: 22 }, (_, i) => ({
        id: ++particleId.current,
        x: cx + (Math.random() - 0.5) * 10,
        y: cy - 20,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 6 - 2.5,
        type: 'spark' as const,
        life: 1,
        color: colors[i % colors.length],
        size: Math.random() * 5 + 3,
      }));
      setParticles(p => [...p, ...sparks]);
      setPoints(p => p + 50);
      return { ...pot, plant: null, stage: 0, timer: STAGE_SECS, watered: false };
    }));
  }, []);

  // ── Buy seed from shop ────────────────────────────────────────
  const buyFromShop = useCallback((type: PlantType, price: number) => {
    if (points < price) return;
    setPoints(p => p - price);
    setPurchasedSeeds(prev => prev.includes(type) ? prev : [...prev, type]);
    const seed = ALL_SEEDS.find(s => s.type === type)!;
    const id = ++toastId.current;
    setToasts(p => [...p, { id, msg: `${seed.label} seeds added to your tray! 🌱` }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500);
  }, [points]);

  const potCount     = getPotCount(peakPoints);
  const visiblePots  = pots.slice(0, potCount);
  const growingCount = visiblePots.filter(p => p.plant && p.stage < 3).length;

  return (
    <div
      className="relative w-full h-full overflow-y-auto overflow-x-hidden flex flex-col items-center"
      style={{ background: 'linear-gradient(180deg,#181228 0%,#1e1640 55%,#1a1838 100%)', minHeight: '100%' }}
    >
      {/* Stars */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {stars.map((s, i) => (
          <div key={i} className="absolute rounded-full garden-star"
            style={{
              left: `${s.x}%`, top: `${s.y}%`,
              width: s.size, height: s.size,
              background: 'white',
              animationDuration: `${s.dur}s`,
              animationDelay: `${s.delay}s`,
            }} />
        ))}
      </div>

      {/* Header */}
      <div className="relative z-10 w-full max-w-3xl px-6 pt-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-medium tracking-wide" style={{ color: '#dcd6eb' }}>
            The Quiet Garden
          </h1>
          <p className="text-xs mt-0.5" style={{ color: '#6b6380' }}>Plant · Water · Bloom</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Shop button */}
          <button
            onClick={() => setShowShop(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm transition-all duration-200 hover:opacity-80"
            style={{
              background: 'rgba(152,130,189,0.13)',
              border: '1px solid rgba(152,130,189,0.28)',
              color: '#c8b0e8',
            }}
          >
            <span>🛍</span>
            <span>Shop</span>
          </button>
          {/* Points */}
          <div className="flex items-center gap-2 px-4 py-2 rounded-2xl"
            style={{ background: 'rgba(152,130,189,0.12)', border: '1px solid rgba(152,130,189,0.2)' }}>
            <span style={{ color: '#b59fd3', fontSize: 13 }}>✦</span>
            <span className="font-serif text-xl font-medium tabular-nums" style={{ color: '#dcd6eb' }}>
              {displayPts}
            </span>
            <span className="text-xs" style={{ color: '#9b93b0' }}>pts</span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="relative z-10 w-full max-w-3xl px-6 pt-4 flex items-center gap-3 flex-wrap">
        {/* Draggable watering can */}
        <div
          draggable
          onDragStart={e => { e.dataTransfer.setData('dragwater', 'true'); }}
          onDragEnd={() => {}}
          className="flex items-center gap-2 px-4 py-2 rounded-xl select-none cursor-grab active:cursor-grabbing transition-all duration-200"
          style={{
            background: 'rgba(136,196,216,0.1)',
            border: '1px solid rgba(136,196,216,0.28)',
            color: '#88c4d8',
          }}
          title="Drag onto a pot to water it"
        >
          <CanSvg active={false} />
          <span className="text-sm">Drag to water</span>
        </div>

        <button
          onClick={() => setRainOn(r => !r)}
          className="px-3 py-2 rounded-xl text-xs transition-all duration-300"
          style={{
            background: rainOn ? 'rgba(136,196,216,0.12)' : 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: rainOn ? '#88c4d8' : '#6b6380',
          }}
          title="Ambient toggle"
        >
          {rainOn ? '🌧 Rain on' : '🌙 Ambient'}
        </button>

        <div className="flex-1" />
        {growingCount > 0 && (
          <span className="text-xs" style={{ color: '#6b6380' }}>{growingCount} growing</span>
        )}
      </div>

      {/* Garden bed */}
      <div className="relative z-10 w-full max-w-3xl px-6 pt-5 pb-4">
        <div className="relative rounded-3xl p-6"
          style={{
            background: 'rgba(255,255,255,0.022)',
            border: '1px solid rgba(255,255,255,0.055)',
            boxShadow: '0 4px 40px rgba(0,0,0,0.35)',
          }}>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 pointer-events-none"
            style={{ width: '70%', height: 20, background: 'radial-gradient(ellipse,rgba(152,130,189,0.08) 0%,transparent 70%)', filter: 'blur(10px)' }} />
          <div className="flex flex-wrap gap-5 justify-center">
            {visiblePots.map(pot => (
              <PotSlot
                key={pot.id}
                pot={pot}
                potIdx={pot.id}
                onDrop={e => onPotDrop(pot.id, e)}
                onClickPot={rect => onPotClick(pot.id, rect)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Seed tray */}
      <div className="relative z-10 w-full max-w-3xl px-6 pb-8">
        <div className="rounded-2xl p-4"
          style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <p className="text-[11px] font-medium tracking-widest uppercase mb-3 px-1" style={{ color: '#6b6380' }}>
            Seed Tray
          </p>
          <div className="flex flex-wrap gap-4">
            {ALL_SEEDS.filter(s => purchasedSeeds.includes(s.type)).map(seed => (
              <div
                key={seed.type}
                draggable
                onDragStart={e => onSeedDragStart(seed.type, e)}
                onDragEnd={() => { dragSeed.current = null; }}
                className="flex flex-col items-center gap-1 select-none cursor-grab active:cursor-grabbing group"
              >
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center transition-transform duration-200 group-hover:scale-105"
                  style={{
                    background: `radial-gradient(circle at 35% 35%, ${seed.color}88, ${seed.color}33)`,
                    border: `1px solid ${seed.color}55`,
                    boxShadow: `0 2px 10px ${seed.color}28`,
                  }}
                >
                  <SeedSvg color={seed.color} />
                </div>
                <span className="text-[10px] font-medium" style={{ color: '#9b93b0' }}>{seed.label}</span>
              </div>
            ))}
            {purchasedSeeds.length < ALL_SEEDS.length && (
              <button
                onClick={() => setShowShop(true)}
                className="flex flex-col items-center gap-1 group"
              >
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 group-hover:opacity-80"
                  style={{
                    background: 'rgba(152,130,189,0.08)',
                    border: '1px dashed rgba(152,130,189,0.3)',
                  }}
                >
                  <span style={{ fontSize: 18, color: '#9882bd' }}>+</span>
                </div>
                <span className="text-[10px]" style={{ color: '#6b6380' }}>Shop</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-center gap-6 mt-4 flex-wrap">
          <p className="text-xs" style={{ color: '#3d3655' }}>
            Drag a seed into an empty pot · Drag 💧 to water
          </p>
          <p className="text-xs" style={{ color: '#3d3655' }}>
            Water (+5 pts) · Harvest bloom (+50 pts)
          </p>
        </div>
      </div>

      {/* Shop modal */}
      {showShop && (
        <ShopModal
          points={points}
          displayPts={displayPts}
          purchasedSeeds={purchasedSeeds}
          onBuy={buyFromShop}
          onClose={() => setShowShop(false)}
        />
      )}

      {/* Particles */}
      <div className="fixed inset-0 pointer-events-none z-50">
        {particles.map(p => (
          <div key={p.id} className="absolute rounded-full"
            style={{
              left: p.x - p.size / 2,
              top: p.y - p.size / 2,
              width: p.size,
              height: p.size,
              background: p.color,
              opacity: p.life,
              transform: p.type === 'spark' ? `scale(${0.4 + p.life * 0.8})` : 'none',
              boxShadow: p.type === 'spark' ? `0 0 6px ${p.color}` : 'none',
            }} />
        ))}
      </div>

      {/* Toasts */}
      <div className="fixed top-20 right-4 z-[60] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className="px-4 py-3 rounded-2xl text-sm garden-toast"
            style={{
              background: 'rgba(28,22,46,0.96)',
              border: '1px solid rgba(152,130,189,0.3)',
              color: '#dcd6eb',
              backdropFilter: 'blur(16px)',
              boxShadow: '0 4px 24px rgba(0,0,0,0.45)',
              maxWidth: 260,
            }}>
            {t.msg}
          </div>
        ))}
      </div>

      {/* Rain overlay */}
      {rainOn && (
        <div className="fixed inset-0 pointer-events-none z-10 overflow-hidden">
          {rainDrops.map((drop, i) => (
            <div
              key={i}
              className="absolute garden-raindrop"
              style={{
                left: `${drop.x}%`,
                width: drop.width,
                height: drop.height,
                borderRadius: drop.width,
                background: `rgba(136,196,216,${drop.opacity})`,
                animationDuration: `${drop.duration}s`,
                animationDelay: `${drop.delay}s`,
              }}
            />
          ))}
        </div>
      )}

      <style>{`
        @keyframes gardenTwinkle {
          0%,100% { opacity: 0.08; }
          50%      { opacity: 0.55; }
        }
        @keyframes gardenBloom {
          0%,100% { filter: drop-shadow(0 0 4px rgba(180,160,220,0.35)); }
          50%      { filter: drop-shadow(0 0 14px rgba(180,160,220,0.75)); }
        }
        @keyframes gardenFadeUp {
          from { opacity:0; transform:translateY(10px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes gardenStageIn {
          from { opacity:0; transform:scale(0.88); }
          to   { opacity:1; transform:scale(1); }
        }
        @keyframes gardenRaindrop {
          0%   { top: -40px; }
          100% { top: 100vh; }
        }
        .garden-star {
          animation: gardenTwinkle var(--dur,3s) ease-in-out infinite;
          opacity: 0.12;
        }
        .garden-bloom-glow { animation: gardenBloom 2.6s ease-in-out infinite; }
        .garden-stage-enter { animation: gardenStageIn 0.9s ease forwards; }
        .garden-toast { animation: gardenFadeUp 0.35s ease forwards; }
        .garden-raindrop {
          position: absolute;
          top: -40px;
          animation: gardenRaindrop linear infinite;
        }
      `}</style>
    </div>
  );
}
