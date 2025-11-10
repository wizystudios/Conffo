import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function PostSkeleton() {
  return (
    <Card className="p-2 border-0 border-b rounded-none">
      <div className="flex items-center gap-2 mb-2">
        <Skeleton className="h-7 w-7 rounded-full" />
        <Skeleton className="h-3 w-20" />
      </div>
      <Skeleton className="h-3 w-full mb-1" />
      <Skeleton className="h-3 w-3/4 mb-2" />
      <Skeleton className="h-32 w-full rounded-lg mb-2" />
      <div className="flex gap-3">
        <Skeleton className="h-6 w-12" />
        <Skeleton className="h-6 w-12" />
        <Skeleton className="h-6 w-12" />
      </div>
    </Card>
  );
}
