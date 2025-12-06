import { Check, CheckCheck } from 'lucide-react';

interface MessageReadReceiptProps {
  isSent: boolean;
  isDelivered: boolean;
  isRead: boolean;
  className?: string;
}

export function MessageReadReceipt({ isSent, isDelivered, isRead, className = '' }: MessageReadReceiptProps) {
  if (!isSent) return null;
  
  if (isRead) {
    // Blue double checkmark for read
    return (
      <CheckCheck className={`h-4 w-4 text-blue-500 ${className}`} />
    );
  }
  
  if (isDelivered) {
    // Gray double checkmark for delivered
    return (
      <CheckCheck className={`h-4 w-4 text-muted-foreground ${className}`} />
    );
  }
  
  // Single checkmark for sent
  return (
    <Check className={`h-4 w-4 text-muted-foreground ${className}`} />
  );
}
