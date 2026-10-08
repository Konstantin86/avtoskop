'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChooseArt, DealArt, DescribeArt, OffersArt } from './HowItWorksArt';
import styles from './HowItWorks.module.css';

interface Step {
  title: string;
  text: string;
}

interface Props {
  title: string;
  steps: [Step, Step, Step, Step];
  minutes: string;
  outsideLabel: string;
}

// Four steps joined by arrows. The cards, arrows and scenes play in order once the
// section scrolls into view; with reduced motion everything is simply shown.
export function HowItWorks({ title, steps, minutes, outsideLabel }: Props) {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setShown(true);
          observer.disconnect();
        }
      },
      { threshold: 0.25 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const art: ReactNode[] = [
    <DescribeArt key="1" minutes={minutes} />,
    <OffersArt key="2" />,
    <ChooseArt key="3" />,
    <DealArt key="4" />,
  ];

  return (
    <section id="how" ref={ref} className={`${styles.how} ${shown ? styles.shown : ''}`}>
      <h2 className={styles.title}>{title}</h2>
      <ol className={styles.steps}>
        {steps.map((step, i) => {
          const outside = i === 3;
          return (
            <li key={step.title} className={styles.item} style={{ ['--i' as string]: i }}>
              <div className={`${styles.card} ${outside ? styles.outside : ''}`}>
                <div className={styles.scene}>{art[i]}</div>
                <div className={styles.top}>
                  <span className={styles.num}>{i + 1}</span>
                  {outside && <span className={styles.badge}>{outsideLabel}</span>}
                </div>
                <h3 className={styles.stepTitle}>{step.title}</h3>
                <p className={styles.stepText}>{step.text}</p>
              </div>
              {i < steps.length - 1 && (
                <svg className={styles.arrow} viewBox="0 0 48 24" aria-hidden="true">
                  <path className={styles.arrowLine} d="M2 12 H40" />
                  <path className={styles.arrowHead} d="M34 5 L42 12 L34 19" />
                </svg>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
