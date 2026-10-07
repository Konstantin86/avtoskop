import { Skeleton, SkeletonCard, SkeletonPage } from '@/components/Skeleton';

export default function Loading() {
  return (
    <SkeletonPage narrow>
      <Skeleton h={96} r={16} />
      {Array.from({ length: 3 }, (_, i) => (
        <SkeletonCard key={i}>
          <Skeleton w="60%" h={22} />
          <Skeleton w="40%" h={14} />
          <Skeleton h={44} r={12} />
        </SkeletonCard>
      ))}
    </SkeletonPage>
  );
}
