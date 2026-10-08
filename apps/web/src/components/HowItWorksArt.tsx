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
        <path className={styles.watchArc} d="M188 58 L188 30 A28 28 0 0 1 214.63 49.35 Z" />
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
      {/* Three separate offers; the middle one is chosen */}
      {[22, 162].map((x) => (
        <g key={x} className={styles.sideCard}>
          <rect className={styles.field} x={x} y="40" width="56" height="74" rx="10" />
          <circle className={styles.carDot} cx={x + 28} cy="62" r="9" />
          <rect className={styles.ink} x={x + 12} y="80" width="32" height="5" rx="2.5" />
          <rect className={styles.price} x={x + 16} y="90" width="24" height="5" rx="2.5" />
        </g>
      ))}
      <g className={styles.chosen}>
        <rect className={styles.chosenCard} x="86" y="22" width="68" height="98" rx="12" />
        <circle className={styles.carDot} cx="120" cy="50" r="12" />
        <rect className={styles.ink} x="99" y="72" width="42" height="6" rx="3" />
        <rect className={styles.price} x="106" y="84" width="28" height="6" rx="3" />
        <circle className={styles.check} cx="150" cy="26" r="12" />
        <path className={styles.checkMark} d="M144 26 L148.5 30.5 L156 22" />
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
      {/* Buyer and seller */}
      <circle className={styles.personA} cx="48" cy="40" r="15" />
      <path className={styles.personA} d="M20 124 Q20 74 48 68 Q76 74 76 124 Z" />
      <circle className={styles.personB} cx="192" cy="40" r="15" />
      <path className={styles.personB} d="M164 124 Q164 74 192 68 Q220 74 220 124 Z" />
      {/* Handshake in each person's colour: blue fingers wrap over the yellow palm */}
      <g className={styles.shake}>
        <path className={styles.armA} d="M64 96 L106 86" />
        <path className={styles.armB} d="M176 96 L134 86" />
        <g transform="translate(120 84) scale(0.62) translate(-120 -84)">
          <path
            className={styles.handYellow}
            d="M150 76 L118 74 Q108 74 108 83 Q108 92 118 92 L150 92 Z"
          />
          <path className={styles.handBlue} d="M90 76 L114 73 L114 95 L90 92 Z" />
          {/* Only fingers and thumbs get thin gaps; palms join their sleeves seamlessly. */}
          <g className={styles.fingers}>
            <path
              className={styles.handYellow}
              d="M142 77 Q136 66 124 69 Q119 70.5 122 74 L134 76"
            />
            <rect className={styles.handBlue} x="108" y="73" width="28" height="6" rx="3" />
            <rect className={styles.handBlue} x="108" y="78.5" width="30" height="6" rx="3" />
            <rect className={styles.handBlue} x="108" y="84" width="29" height="6" rx="3" />
            <rect className={styles.handBlue} x="108" y="89.5" width="25" height="6" rx="3" />
            <path className={styles.handBlue} d="M100 76 Q104 66 116 67 Q121 68 118 72 L106 76" />
          </g>
        </g>
      </g>
      <g className={styles.sparks}>
        <path d="M120 54 v-10 M104 60 l-7 -7 M136 60 l7 -7" />
      </g>
      {/* Contract and car key on the table */}
      <rect className={styles.table} x="16" y="124" width="208" height="8" rx="4" />
      <g className={styles.contract}>
        <rect className={styles.paper} x="98" y="98" width="44" height="26" rx="3" />
        <rect className={styles.soft} x="104" y="104" width="24" height="4" rx="2" />
        <path className={styles.sign} d="M104 117 q4 -6 8 0 t8 0 t10 -2" />
      </g>
      <g className={styles.key}>
        <circle className={styles.keyRing} cx="154" cy="117" r="5" />
        <rect className={styles.keyBlade} x="158" y="115" width="14" height="4" rx="1.5" />
      </g>
    </svg>
  );
}

// Sellers: a matching request arrives in Telegram, and the full list can be searched.
export function RequestAlertArt() {
  return (
    <svg viewBox="0 0 240 150" className={styles.art} aria-hidden="true" focusable="false">
      <rect className={styles.paper} x="28" y="10" width="100" height="134" rx="16" />
      <rect className={styles.soft} x="62" y="18" width="32" height="5" rx="2.5" />
      {[0, 1, 2].map((i) => (
        <g key={i} className={styles.bubble} style={{ animationDelay: `${0.5 + i * 0.3}s` }}>
          <rect className={styles.field} x="38" y={32 + i * 36} width="80" height="28" rx="8" />
          <circle className={styles.carDot} cx="51" cy={46 + i * 36} r="7" />
          <rect className={styles.ink} x="63" y={39 + i * 36} width="42" height="5" rx="2.5" />
          <rect className={styles.price} x="63" y={49 + i * 36} width="28" height="5" rx="2.5" />
        </g>
      ))}
      <circle className={styles.newDot} cx="124" cy="34" r="7" />
      {/* Search over the list of requests */}
      <g className={styles.plane}>
        <circle className={styles.lens} cx="172" cy="74" r="26" />
        <path className={styles.lensHandle} d="M191 93 L212 114" />
        <rect className={styles.price} x="158" y="68" width="28" height="5" rx="2.5" />
        <rect className={styles.ink} x="158" y="78" width="20" height="5" rx="2.5" />
      </g>
    </svg>
  );
}

// Sellers: an offer card with a photo and an all-in price, flying off to the buyer.
export function SendOfferArt() {
  return (
    <svg viewBox="0 0 240 150" className={styles.art} aria-hidden="true" focusable="false">
      <g className={styles.chosen}>
        <rect className={styles.paper} x="34" y="18" width="116" height="116" rx="12" />
        <rect className={styles.photo} x="46" y="30" width="92" height="52" rx="8" />
        <path className={styles.hill} d="M46 74 L70 54 L88 68 L104 56 L138 80 L138 82 L46 82 Z" />
        <circle className={styles.sun} cx="122" cy="44" r="7" />
        <rect className={styles.ink} x="46" y="92" width="60" height="6" rx="3" />
        <rect className={styles.numberPill} x="46" y="106" width="52" height="16" rx="8" />
        <rect className={styles.numberText} x="54" y="111" width="36" height="6" rx="3" />
      </g>
      <g className={styles.plane}>
        <path className={styles.planeBody} d="M164 66 L214 46 L200 96 L186 82 Z" />
        <path className={styles.planeFold} d="M186 82 L214 46 L182 90 Z" />
      </g>
      <path className={styles.trail} d="M150 104 Q168 100 180 90" />
    </svg>
  );
}

// Sellers: the buyer's number arrives as a message.
export function NumberArt() {
  return (
    <svg viewBox="0 0 240 150" className={styles.art} aria-hidden="true" focusable="false">
      <rect className={styles.paper} x="70" y="10" width="100" height="134" rx="16" />
      <rect className={styles.soft} x="104" y="18" width="32" height="5" rx="2.5" />
      <rect className={styles.field} x="80" y="34" width="70" height="22" rx="8" />
      <rect className={styles.ink} x="88" y="42" width="40" height="5" rx="2.5" />
      <g className={styles.number}>
        <rect className={styles.numberPill} x="80" y="66" width="80" height="34" rx="10" />
        <path
          className={styles.handset}
          d="M92 76 q-2 6 4 12 q6 6 12 4 l2 -4 l-5 -4 l-3 2 q-4 -2 -6 -6 l2 -3 l-4 -5 Z"
        />
        <rect className={styles.numberText} x="116" y="80" width="36" height="6" rx="3" />
      </g>
      {/* Ringing */}
      <g className={styles.sparks}>
        <path d="M178 70 q8 13 0 26 M188 62 q14 21 0 42" />
      </g>
    </svg>
  );
}
