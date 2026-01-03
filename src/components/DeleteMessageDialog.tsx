import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Trash2 } from 'lucide-react';

interface DeleteMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleteForMe: () => Promise<void>;
  onDeleteForEveryone: () => Promise<void>;
  isOwn: boolean;
}

export function DeleteMessageDialog({
  open,
  onOpenChange,
  onDeleteForMe,
  onDeleteForEveryone,
  isOwn
}: DeleteMessageDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteType, setDeleteType] = useState<'me' | 'everyone' | null>(null);

  const handleDeleteForMe = async () => {
    setIsDeleting(true);
    setDeleteType('me');
    try {
      await onDeleteForMe();
      onOpenChange(false);
    } finally {
      setIsDeleting(false);
      setDeleteType(null);
    }
  };

  const handleDeleteForEveryone = async () => {
    setIsDeleting(true);
    setDeleteType('everyone');
    try {
      await onDeleteForEveryone();
      onOpenChange(false);
    } finally {
      setIsDeleting(false);
      setDeleteType(null);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            <AlertDialogTitle>Delete message?</AlertDialogTitle>
          </div>
          <AlertDialogDescription>
            {isOwn 
              ? "This action cannot be undone. Choose how you want to delete this message."
              : "This message will be permanently removed from your view."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-col gap-2">
          {isOwn && (
            <Button
              variant="destructive"
              onClick={handleDeleteForEveryone}
              disabled={isDeleting}
              className="w-full"
            >
              {isDeleting && deleteType === 'everyone' ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Delete for everyone
            </Button>
          )}
          <Button
            variant="outline"
            onClick={handleDeleteForMe}
            disabled={isDeleting}
            className="w-full"
          >
            {isDeleting && deleteType === 'me' ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Delete for me
          </Button>
          <AlertDialogCancel className="w-full mt-0" disabled={isDeleting}>
            Cancel
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
