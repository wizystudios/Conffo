import { useMemo } from 'react';
import { Sparkles } from 'lucide-react';

// A calm, guided daily prompt. Deterministic by date so it feels
// like "today's" prompt for everyone but changes at midnight.
const PROMPTS: { title: string; body: string; room?: string }[] = [
  { title: 'Something you kept quiet this week', body: 'Say the thing you almost said out loud but did not.', room: 'random' },
  { title: 'A moment of quiet gratitude', body: 'Name one small thing today that steadied you.', room: 'random' },
  { title: 'A change you did not expect', body: 'What shifted in how you see someone or yourself?', room: 'relationships' },
  { title: 'What did school teach you today', body: 'A lesson from a person, not a page.', room: 'school' },
  { title: 'Work, honestly', body: 'The part of your day nobody asks about.', room: 'work' },
  { title: 'Family, in one line', body: 'The truest sentence you can write about them right now.', room: 'family' },
  { title: 'A friend on your mind', body: 'Say what you would say if you were braver.', room: 'friends' },
  { title: 'What are you carrying today', body: 'Put it down here for a minute.', room: 'random' },
];

function dayIndex(): number {
  const d = new Date();
  const start = new Date(d.getFullYear(), 0, 0);
  const diff = (d.getTime() - start.getTime()) + ((start.getTimezoneOffset() - d.getTimezoneOffset()) * 60 * 1000);
  return Math.floor(diff / 86400000);
}

interface Props {
  onWrite?: (room?: string) => void;
}

export function DailyRoomPrompt({ onWrite }: Props) {
  const prompt = useMemo(() => PROMPTS[dayIndex() % PROMPTS.length], []);

  return (
    <div className="mx-4 mt-3 mb-2">
      <div className="relative overflow-hidden rounded-2xl p-4 bg-gradient-primary-soft border border-border/40">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-full flex items-center justify-center bg-background/70 shrink-0">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
              Today's prompt
            </div>
            <div className="text-[15px] font-semibold mt-0.5 leading-snug">{prompt.title}</div>
            <div className="text-[13px] text-muted-foreground mt-1 leading-relaxed">{prompt.body}</div>
            <button
              onClick={() => onWrite?.(prompt.room)}
              className="mt-3 h-8 px-4 rounded-full bg-primary text-primary-foreground text-[12px] font-semibold active:scale-95 transition-transform"
            >
              Write on this
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
