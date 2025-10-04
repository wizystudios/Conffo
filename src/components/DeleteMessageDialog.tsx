import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

interface DeleteMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleteForMe: () => void;
  onDeleteForEveryone: () => void;
  isOwn: boolean;
}

export function DeleteMessageDialog({
  open,
  onOpenChange,
  onDeleteForMe,
  onDeleteForEveryone,
  isOwn
}: DeleteMessageDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete message?</AlertDialogTitle>
          <AlertDialogDescription>
            {isOwn 
              ? "Choose how you want to delete this message."
              : "This message will be deleted for you."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-col gap-2">
          {isOwn && (
            <Button
              variant="destructive"
              onClick={() => {
                onDeleteForEveryone();
                onOpenChange(false);
              }}
              className="w-full"
            >
              Delete for everyone
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => {
              onDeleteForMe();
              onOpenChange(false);
            }}
            className="w-full"
          >
            Delete for me
          </Button>
          <AlertDialogCancel className="w-full mt-0">Cancel</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
