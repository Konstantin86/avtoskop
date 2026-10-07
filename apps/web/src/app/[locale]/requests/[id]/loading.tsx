import { Skeleton, SkeletonCard, SkeletonPage } from '@/components/Skeleton';

export default function Loading() {
  return (
    <SkeletonPage narrow>
      <SkeletonCard>
        <Skeleton w="35%" h={28} />
        <Skeleton h={120} r={12} />
      </SkeletonCard>
      <SkeletonCard>
        <Skeleton w="50%" h={22} />
        <Skeleton w="85%" h={14} />
        <Skeleton h={48} r={12} />
      </SkeletonCard>
    </SkeletonPage>
  );
}
