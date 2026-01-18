import { Eye } from 'lucide-react';

interface CommunityReadReceiptProps {
  readCount: number;
}

export function CommunityReadReceipt({ readCount }: CommunityReadReceiptProps) {
  if (readCount === 0) return null;

  return (
    <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
      <Eye className="h-3 w-3" />
      <span>Seen by {readCount}</span>
    </div>
  );
}
