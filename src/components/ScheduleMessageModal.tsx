import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Clock, Send } from 'lucide-react';
import { format, addMinutes, addHours, addDays, isBefore } from 'date-fns';
import { toast } from '@/hooks/use-toast';

interface ScheduleMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSchedule: (scheduledTime: Date) => void;
  messageContent: string;
}

const quickOptions = [
  { label: 'In 30 min', getValue: () => addMinutes(new Date(), 30) },
  { label: 'In 1 hour', getValue: () => addHours(new Date(), 1) },
  { label: 'In 3 hours', getValue: () => addHours(new Date(), 3) },
  { label: 'Tomorrow 9 AM', getValue: () => {
    const tomorrow = addDays(new Date(), 1);
    tomorrow.setHours(9, 0, 0, 0);
    return tomorrow;
  }},
];

export function ScheduleMessageModal({ isOpen, onClose, onSchedule, messageContent }: ScheduleMessageModalProps) {
  const [customDate, setCustomDate] = useState('');
  const [customTime, setCustomTime] = useState('');

  const handleQuickSchedule = (getTime: () => Date) => {
    const scheduledTime = getTime();
    onSchedule(scheduledTime);
    toast({
      description: `📅 Message scheduled for ${format(scheduledTime, 'MMM d, h:mm a')}`
    });
    onClose();
  };

  const handleCustomSchedule = () => {
    if (!customDate || !customTime) {
      toast({ variant: "destructive", description: "Please select both date and time" });
      return;
    }

    const scheduledTime = new Date(`${customDate}T${customTime}`);
    
    if (isBefore(scheduledTime, new Date())) {
      toast({ variant: "destructive", description: "Cannot schedule for the past" });
      return;
    }

    onSchedule(scheduledTime);
    toast({
      description: `📅 Message scheduled for ${format(scheduledTime, 'MMM d, h:mm a')}`
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Schedule Message
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Message preview */}
          {messageContent && (
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">Message to schedule:</p>
              <p className="text-sm line-clamp-2">{messageContent}</p>
            </div>
          )}

          {/* Quick options */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Quick schedule</Label>
            <div className="grid grid-cols-2 gap-2">
              {quickOptions.map((option) => (
                <Button
                  key={option.label}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickSchedule(option.getValue)}
                  className="justify-start"
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Custom date/time */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Or pick a custom time</Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-muted-foreground">Date</Label>
                <Input
                  type="date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  min={format(new Date(), 'yyyy-MM-dd')}
                  className="h-9"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Time</Label>
                <Input
                  type="time"
                  value={customTime}
                  onChange={(e) => setCustomTime(e.target.value)}
                  className="h-9"
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleCustomSchedule} disabled={!customDate || !customTime}>
            <Send className="h-4 w-4 mr-2" />
            Schedule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}