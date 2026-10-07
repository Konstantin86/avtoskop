import styles from './CarScene.module.css';

// Decorative line drawing of a car; colours come from the theme tokens.
export function CarDrawing({ className }: { className?: string | undefined }) {
  return (
    <svg
      className={className}
      viewBox="0 0 300 110"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path className={styles.beam} d="M262 52 L300 40 L300 74 Z" />
      <g className={styles.speed}>
        <path d="M6 44h30M0 58h28M10 72h22" />
      </g>
      <path
        className={styles.body}
        d="M44 82 V66 Q44 56 56 54 L92 50 L122 30 Q128 26 138 26 H190 Q200 26 208 32 L234 52 L262 56 Q274 58 274 70 V82 H252 A22 22 0 0 0 208 82 H120 A22 22 0 0 0 76 82 Z"
      />
      <path className={styles.window} d="M100 50 L126 34 H160 V50 Z" />
      <path className={styles.window} d="M170 34 H196 Q201 34 205 38 L218 50 H170 Z" />
      <path className={styles.light} d="M262 58 h8 a3 3 0 0 1 3 3 v4 h-11 Z" />
      <circle className={styles.wheel} cx="98" cy="84" r="17" />
      <circle className={styles.hub} cx="98" cy="84" r="6" />
      <circle className={styles.wheel} cx="230" cy="84" r="17" />
      <circle className={styles.hub} cx="230" cy="84" r="6" />
    </svg>
  );
}

// A road with a car driving onto it; used as a section divider.
export function RoadScene() {
  return (
    <div className={styles.road} aria-hidden="true">
      <CarDrawing className={styles.car} />
    </div>
  );
}
