import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export const ChatLoadingSkeleton = () => {
  return (
    <Card className="flex flex-col h-[600px] bg-gradient-to-br from-background via-background to-primary/5 animate-fade-in">
      {/* Header Skeleton */}
      <div className="p-4 border-b bg-background/50">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-6 rounded" />
            <div>
              <Skeleton className="h-5 w-32 mb-1" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
          <Skeleton className="h-8 w-8 rounded" />
        </div>
        
        {/* Status badges */}
        <div className="grid grid-cols-4 gap-2 mt-2">
          <Skeleton className="h-6 rounded-full" />
          <Skeleton className="h-6 rounded-full" />
          <Skeleton className="h-6 rounded-full" />
          <Skeleton className="h-6 rounded-full" />
        </div>
      </div>

      {/* Messages area skeleton */}
      <div className="flex-1 p-4 space-y-4">
        {/* Welcome message skeleton */}
        <div className="flex gap-2">
          <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
          <div className="space-y-2 max-w-[80%]">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-64" />
            <Skeleton className="h-4 w-56" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>

        {/* More message placeholders */}
        <div className="flex gap-2 justify-end">
          <div className="space-y-2">
            <Skeleton className="h-10 w-32 rounded-2xl" />
          </div>
          <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
        </div>

        <div className="flex gap-2">
          <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
          <div className="space-y-2 max-w-[80%]">
            <Skeleton className="h-4 w-56" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
      </div>

      {/* Input area skeleton */}
      <div className="p-4 border-t bg-background/50">
        <div className="flex gap-2 mb-2">
          <Skeleton className="h-10 w-10 rounded" />
          <Skeleton className="h-10 flex-1 rounded" />
          <Skeleton className="h-10 w-10 rounded" />
        </div>
        <Skeleton className="h-3 w-64 mx-auto" />
      </div>
    </Card>
  );
};
