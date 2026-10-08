import styles from './HowItWorks.module.css';

// Small scenes for the four "how it works" steps. Colours come from theme tokens through
// the CSS module, so they follow light and dark mode; motion runs only once the section
// scrolls into view (the parent gets the `shown` class).

export function DescribeArt({ minutes }: { minutes: string }) {
  return (
    <svg viewBox="0 0 240 150" className={styles.art} aria-hidden="true" focusable="false">
      {/* The request form */}
      <rect className={styles.paper} x="34" y="22" width="120" height="112" rx="12" />
      <rect className={styles.soft} x="48" y="38" width="44" height="8" rx="4" />
      <rect className={styles.field} x="48" y="54" width="92" height="14" rx="5" />
      <rect className={styles.field} x="48" y="76" width="92" height="14" rx="5" />
      <rect className={styles.field} x="48" y="98" width="56" height="14" rx="5" />
      <g className={styles.typing}>
        <rect className={styles.ink} x="53" y="59" width="38" height="4" rx="2" />
        <rect className={styles.ink} x="53" y="81" width="52" height="4" rx="2" />
        <rect className={styles.ink} x="53" y="103" width="26" height="4" rx="2" />
      </g>
      {/* A pen finishing the last field */}
      <g className={styles.pen}>
        <path className={styles.penBody} d="M118 124 L150 92 L158 100 L126 132 Z" />
        <path className={styles.penTip} d="M118 124 L126 132 L113 136 Z" />
      </g>
      {/* Stopwatch: two minutes */}
      <g className={styles.watch}>
        <rect className={styles.watchButton} x="182" y="20" width="12" height="8" rx="3" />
        <circle className={styles.watchFace} cx="188" cy="58" r="30" />
        <path className={styles.watchArc} d="M188 58 L188 28 A30 30 0 0 1 214 43 Z" />
        <line className={styles.watchHand} x1="188" y1="58" x2="188" y2="36" />
        <circle className={styles.watchHub} cx="188" cy="58" r="3.5" />
        <text className={styles.watchText} x="188" y="106" textAnchor="middle">
          {minutes}
        </text>
      </g>
    </svg>
  );
}

export function OffersArt() {
  return (
    <svg viewBox="0 0 240 150" className={styles.art} aria-hidden="true" focusable="false">
      {/* Phone */}
      <rect className={styles.paper} x="70" y="10" width="100" height="134" rx="16" />
      <rect className={styles.soft} x="104" y="18" width="32" height="5" rx="2.5" />
      {/* Offers arriving one by one */}
      {[0, 1, 2].map((i) => (
        <g key={i} className={styles.bubble} style={{ animationDelay: `${0.5 + i * 0.35}s` }}>
          <rect className={styles.field} x="80" y={32 + i * 36} width="80" height="28" rx="8" />
          <circle className={styles.carDot} cx="93" cy={46 + i * 36} r="7" />
          <rect className={styles.ink} x="105" y={39 + i * 36} width="40" height="5" rx="2.5" />
          <rect className={styles.price} x="105" y={49 + i * 36} width="26" height="5" rx="2.5" />
        </g>
      ))}
      {/* Telegram-style paper plane */}
      <g className={styles.plane}>
        <path className={styles.planeBody} d="M180 40 L222 24 L210 64 L198 52 Z" />
        <path className={styles.planeFold} d="M198 52 L222 24 L196 60 Z" />
      </g>
      <circle className={styles.newDot} cx="166" cy="34" r="7" />
    </svg>
  );
}

export function ChooseArt() {
  return (
    <svg viewBox="0 0 240 150" className={styles.art} aria-hidden="true" focusable="false">
      {/* Three offers; the middle one is chosen */}
      <rect className={styles.field} x="24" y="34" width="62" height="80" rx="10" />
      <rect className={styles.field} x="154" y="34" width="62" height="80" rx="10" />
      <g className={styles.chosen}>
        <rect className={styles.chosenCard} x="82" y="20" width="76" height="100" rx="12" />
        <circle className={styles.carDot} cx="120" cy="50" r="12" />
        <rect className={styles.ink} x="96" y="72" width="48" height="6" rx="3" />
        <rect className={styles.price} x="104" y="84" width="32" height="6" rx="3" />
        <circle className={styles.check} cx="152" cy="24" r="12" />
        <path className={styles.checkMark} d="M146 24 L150.5 28.5 L158 20" />
      </g>
      {/* The number goes only to the chosen one */}
      <g className={styles.number}>
        <rect className={styles.numberPill} x="74" y="126" width="92" height="20" rx="10" />
        <path className={styles.lockOpen} d="M86 136 h10 v7 h-10 Z M88 136 v-4 a3 3 0 0 1 6 -1" />
        <rect className={styles.numberText} x="102" y="133" width="54" height="6" rx="3" />
      </g>
    </svg>
  );
}

export function DealArt() {
  return (
    <svg viewBox="0 0 240 150" className={styles.art} aria-hidden="true" focusable="false">
      {/* Two people */}
      <circle className={styles.personA} cx="62" cy="40" r="16" />
      <path className={styles.personA} d="M34 120 Q34 72 62 66 Q90 72 90 120 Z" />
      <circle className={styles.personB} cx="178" cy="40" r="16" />
      <path className={styles.personB} d="M150 120 Q150 72 178 66 Q206 72 206 120 Z" />
      {/* Handshake */}
      <g className={styles.shake}>
        <path className={styles.armA} d="M84 92 Q104 84 118 88" />
        <path className={styles.armB} d="M156 92 Q136 84 122 88" />
        <circle className={styles.hands} cx="120" cy="88" r="9" />
      </g>
      {/* Contract and car key on the table */}
      <rect className={styles.table} x="24" y="120" width="192" height="8" rx="4" />
      <g className={styles.contract}>
        <rect className={styles.paper} x="96" y="100" width="34" height="20" rx="3" />
        <path className={styles.sign} d="M101 113 q4 -6 8 0 t8 0 t8 -2" />
      </g>
      <g className={styles.key}>
        <circle className={styles.keyRing} cx="146" cy="112" r="5" />
        <rect className={styles.keyBlade} x="150" y="110" width="14" height="4" rx="1.5" />
      </g>
    </svg>
  );
}
