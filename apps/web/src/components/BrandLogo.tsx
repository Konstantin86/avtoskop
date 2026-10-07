import { BRAND_LOGOS } from './brandLogos';
import styles from './BrandLogo.module.css';

interface Props {
  name: string;
  size?: number;
  className?: string | undefined;
}

// Brand logo tinted with the text colour (a CSS mask over the SVG file), or the first letter
// in a round badge for brands without a logo. Decorative: the brand name is always shown next to it.
export function BrandLogo({ name, size = 28, className }: Props) {
  const slug = BRAND_LOGOS[name];
  const letter = name
    .replace(/[^\p{L}\p{N}]/gu, '')
    .charAt(0)
    .toUpperCase();
  return (
    <span
      className={`${styles.badge} ${className ?? ''}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.45) }}
      aria-hidden="true"
    >
      {slug ? (
        <span
          className={styles.logo}
          style={{
            maskImage: `url(/brands/${slug}.svg)`,
            WebkitMaskImage: `url(/brands/${slug}.svg)`,
          }}
        />
      ) : (
        letter
      )}
    </span>
  );
}
