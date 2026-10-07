import 'server-only';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';

export const OG_SIZE = { width: 1200, height: 630 };

// Brand colours are written out here: preview images are rendered outside the page's CSS.
const C = {
  bg: '#f7f6f2',
  ink: '#16181d',
  muted: '#5c6070',
  blue: '#0057b7',
  blueSoft: '#e6eef8',
  yellow: '#ffd500',
  yellowSoft: '#fff5c2',
  yellowInk: '#5c4a00',
  line: '#e6e3dc',
  white: '#ffffff',
};

const fontDir = join(process.cwd(), 'src/fonts/og');
const fonts = Promise.all([
  readFile(join(fontDir, 'FixelDisplay-Bold.ttf')),
  readFile(join(fontDir, 'FixelText-Medium.ttf')),
]);

interface Card {
  eyebrow: string;
  title: string;
  lines: string[];
  footer: string;
  brand: string;
}

function Car() {
  return (
    <svg width="330" height="121" viewBox="0 0 300 110" fill="none">
      <path d="M262 52 L300 40 L300 74 Z" fill={C.yellow} fillOpacity="0.45" />
      <path d="M6 44h30M0 58h28M10 72h22" stroke={C.line} strokeWidth="3" strokeLinecap="round" />
      <path
        d="M44 82 V66 Q44 56 56 54 L92 50 L122 30 Q128 26 138 26 H190 Q200 26 208 32 L234 52 L262 56 Q274 58 274 70 V82 H252 A22 22 0 0 0 208 82 H120 A22 22 0 0 0 76 82 Z"
        fill={C.white}
        stroke={C.blue}
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      <path d="M100 50 L126 34 H160 V50 Z" fill={C.blueSoft} stroke={C.blue} strokeWidth="2.5" />
      <path
        d="M170 34 H196 Q201 34 205 38 L218 50 H170 Z"
        fill={C.blueSoft}
        stroke={C.blue}
        strokeWidth="2.5"
      />
      <path d="M262 58 h8 a3 3 0 0 1 3 3 v4 h-11 Z" fill={C.yellow} />
      <circle cx="98" cy="84" r="17" fill={C.white} stroke={C.ink} strokeWidth="4" />
      <circle cx="98" cy="84" r="6" fill={C.yellow} />
      <circle cx="230" cy="84" r="17" fill={C.white} stroke={C.ink} strokeWidth="4" />
      <circle cx="230" cy="84" r="6" fill={C.yellow} />
    </svg>
  );
}

// One card design for every shared link: request pages, the home page and the seller page.
export async function ogCard({ eyebrow, title, lines, footer, brand }: Card) {
  const [bold, medium] = await fonts;
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '56px 64px 0',
        background: C.bg,
        fontFamily: 'Fixel',
        color: C.ink,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <svg width="60" height="60" viewBox="0 0 64 64">
          <rect width="64" height="64" rx="16" fill={C.blue} />
          <circle cx="29.3" cy="29.3" r="16" fill="none" stroke="#F59E0B" strokeWidth="5" />
          <path d="M42.3 42.3l10 10" stroke="#F59E0B" strokeWidth="6.4" strokeLinecap="round" />
          <circle cx="28" cy="28" r="16" fill={C.blue} stroke={C.yellow} strokeWidth="5" />
          <path d="M41 41l10 10" stroke={C.yellow} strokeWidth="6.4" strokeLinecap="round" />
          <g transform="translate(0 -0.6)">
            <rect x="19.2" y="33.4" width="3.8" height="3.8" rx="1.2" fill="#0A2C5E" />
            <rect x="33" y="33.4" width="3.8" height="3.8" rx="1.2" fill="#0A2C5E" />
            <path
              d="M23.8 20.4h8.4a1.6 1.6 0 0 1 1.5 1l2.2 5.2h1.3a1.6 1.6 0 0 1 1.6 1.6v5.2a1.6 1.6 0 0 1-1.6 1.6H19a1.6 1.6 0 0 1-1.6-1.6v-5.2a1.6 1.6 0 0 1 1.6-1.6h1.3l2.2-5.2a1.6 1.6 0 0 1 1.5-1z"
              fill={C.white}
            />
            <rect x="15.8" y="25.2" width="2.6" height="1.7" rx="0.7" fill={C.white} />
            <rect x="37.6" y="25.2" width="2.6" height="1.7" rx="0.7" fill={C.white} />
            <path
              d="M24.6 22.1h6.8l1.9 4.5H22.7z"
              fill={C.blue}
              stroke={C.blue}
              strokeWidth="0.8"
              strokeLinejoin="round"
            />
            <rect x="19.2" y="28.3" width="4" height="2.1" rx="1" fill={C.yellow} />
            <rect x="32.8" y="28.3" width="4" height="2.1" rx="1" fill={C.yellow} />
            <rect x="24.8" y="28.6" width="6.4" height="1.6" rx="0.8" fill={C.blue} />
            <path d="M21.5 32.6h13" stroke={C.blue} strokeWidth="0.9" strokeLinecap="round" />
          </g>
        </svg>
        <div style={{ fontSize: 34, fontWeight: 700 }}>{brand}</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div
          style={{
            display: 'flex',
            alignSelf: 'flex-start',
            padding: '8px 18px',
            borderRadius: 999,
            background: C.yellowSoft,
            color: C.yellowInk,
            fontSize: 26,
            fontWeight: 500,
          }}
        >
          {eyebrow}
        </div>
        <div style={{ fontSize: 76, fontWeight: 700, lineHeight: 1.05, maxWidth: 1000 }}>
          {title}
        </div>
        {lines.map((line) => (
          <div key={line} style={{ fontSize: 32, fontWeight: 500, color: C.muted }}>
            {line}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 28, fontWeight: 500, color: C.blue, paddingBottom: 26 }}>
            {footer}
          </div>
          <Car />
        </div>
        <div style={{ display: 'flex', height: 4, background: C.line }} />
        <div style={{ display: 'flex', gap: 22, height: 26, paddingTop: 10 }}>
          {Array.from({ length: 24 }, (_, i) => (
            <div key={i} style={{ width: 28, height: 6, borderRadius: 3, background: C.yellow }} />
          ))}
        </div>
      </div>
    </div>,
    {
      ...OG_SIZE,
      fonts: [
        { name: 'Fixel', data: bold, weight: 700, style: 'normal' },
        { name: 'Fixel', data: medium, weight: 500, style: 'normal' },
      ],
    },
  );
}
