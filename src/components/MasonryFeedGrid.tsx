import { Confession } from '@/types';
import { InstagramConfessionCard } from './InstagramConfessionCard';
import { PeopleYouMayKnow } from './PeopleYouMayKnow';

interface MasonryFeedGridProps {
  confessions: Confession[];
  onUpdate?: () => void;
}

export function MasonryFeedGrid({ confessions, onUpdate }: MasonryFeedGridProps) {
  // Split confessions into two columns for masonry effect
  const leftColumn: Confession[] = [];
  const rightColumn: Confession[] = [];
  
  confessions.forEach((confession, index) => {
    if (index % 2 === 0) {
      leftColumn.push(confession);
    } else {
      rightColumn.push(confession);
    }
  });

  return (
    <div className="px-2">
      {/* Masonry grid layout - 2 columns with varying heights */}
      <div className="grid grid-cols-2 gap-2">
        {/* Left column */}
        <div className="space-y-2">
          {leftColumn.map((confession, index) => (
            <div key={confession.id}>
              <MasonryCard 
                confession={confession} 
                onUpdate={onUpdate}
                variant={index % 3 === 0 ? 'tall' : index % 3 === 1 ? 'medium' : 'short'}
              />
            </div>
          ))}
        </div>
        
        {/* Right column */}
        <div className="space-y-2">
          {rightColumn.map((confession, index) => (
            <div key={confession.id}>
              <MasonryCard 
                confession={confession} 
                onUpdate={onUpdate}
                variant={index % 3 === 0 ? 'short' : index % 3 === 1 ? 'tall' : 'medium'}
              />
              {index === 1 && <PeopleYouMayKnow />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface MasonryCardProps {
  confession: Confession;
  onUpdate?: () => void;
  variant: 'tall' | 'medium' | 'short';
}

function MasonryCard({ confession, onUpdate }: MasonryCardProps) {
  return (
    <div 
      className="rounded-xl overflow-hidden bg-card border border-border/50 shadow-sm hover:shadow-md transition-shadow duration-300"
    >
      <InstagramConfessionCard 
        confession={confession} 
        onUpdate={onUpdate}
      />
    </div>
  );
}