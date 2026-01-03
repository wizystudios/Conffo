import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Send } from 'lucide-react';

interface MediaPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: File | null;
  previewUrl: string | null;
  onSend: (caption: string) => void;
  isSending: boolean;
}

export function MediaPreviewModal({
  open,
  onOpenChange,
  file,
  previewUrl,
  onSend,
  isSending
}: MediaPreviewModalProps) {
  const [caption, setCaption] = useState('');

  const handleSend = () => {
    onSend(caption);
    setCaption('');
  };

  const isImage = file?.type.startsWith('image/');
  const isVideo = file?.type.startsWith('video/');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-hidden bg-background">
        <div className="relative">
          {/* Close button */}
          <button
            onClick={() => onOpenChange(false)}
            className="absolute top-3 right-3 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Media preview */}
          <div className="bg-black aspect-square flex items-center justify-center max-h-[60vh]">
            {isImage && previewUrl && (
              <img
                src={previewUrl}
                alt="Preview"
                className="max-w-full max-h-[60vh] object-contain"
              />
            )}
            {isVideo && previewUrl && (
              <video
                src={previewUrl}
                controls
                className="max-w-full max-h-[60vh] object-contain"
              />
            )}
          </div>

          {/* Caption input and send */}
          <div className="p-4 space-y-3">
            <div className="text-xs text-muted-foreground truncate">
              {file?.name}
            </div>
            <div className="flex gap-2">
              <Input
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Add a caption..."
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
              <Button
                onClick={handleSend}
                disabled={isSending}
                size="icon"
                className="rounded-full"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
