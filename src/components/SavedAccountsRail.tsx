import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getSavedAccounts, forgetAccount, type SavedAccount } from '@/utils/savedAccounts';

interface Props {
  onPick: (acc: SavedAccount) => void;
}

/**
 * Horizontal avatar chips of previously signed-in accounts. Tapping a chip
 * pre-fills the email on the sign-in form. Long-press / × removes it.
 */
export function SavedAccountsRail({ onPick }: Props) {
  const [accounts, setAccounts] = useState<SavedAccount[]>([]);

  useEffect(() => {
    setAccounts(getSavedAccounts());
  }, []);

  if (accounts.length === 0) return null;

  return (
    <div className="pb-2">
      <p className="text-xs text-muted-foreground mb-3 text-center">
        Continue as
      </p>
      <div className="flex gap-4 justify-center flex-wrap">
        {accounts.map((acc) => (
          <div key={acc.id} className="relative group">
            <button
              type="button"
              onClick={() => onPick(acc)}
              className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform"
            >
              <Avatar className="h-14 w-14 ring-2 ring-primary/30">
                <AvatarImage src={acc.avatarUrl} />
                <AvatarFallback>{acc.username?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
              </Avatar>
              <span className="text-[11px] text-foreground/80 max-w-[64px] truncate">
                @{acc.username}
              </span>
            </button>
            <button
              type="button"
              aria-label="Remove account"
              onClick={(e) => {
                e.stopPropagation();
                forgetAccount(acc.id);
                setAccounts(getSavedAccounts());
              }}
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-background border border-border flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
