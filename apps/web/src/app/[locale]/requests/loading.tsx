import { Skeleton, SkeletonCard, SkeletonPage } from '@/components/Skeleton';
import styles from '@/components/Skeleton.module.css';

export default function Loading() {
  return (
    <SkeletonPage>
      <Skeleton h={88} r={20} />
      <div className={styles.grid}>
        {Array.from({ length: 6 }, (_, i) => (
          <SkeletonCard key={i}>
            <Skeleton w="40%" h={12} />
            <Skeleton w="70%" h={24} />
            <Skeleton w="50%" h={14} />
            <Skeleton w="45%" h={26} />
            <Skeleton h={40} r={12} />
          </SkeletonCard>
        ))}
      </div>
    </SkeletonPage>
  );
}
