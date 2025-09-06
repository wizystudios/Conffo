import { useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { FullPageSearchModal } from './FullPageSearchModal';

interface EnhancedSearchBarProps {
  onClose?: () => void;
  onResultClick?: (result: any) => void;
}

export function EnhancedSearchBar({ onClose, onResultClick }: EnhancedSearchBarProps) {
  const [query, setQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleInputClick = () => {
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setQuery('');
    onClose?.();
  };

  const handleResultClick = (result: any) => {
    setIsModalOpen(false);
    setQuery('');
    onResultClick?.(result);
  };

  return (
    <>
      <div className="relative w-full">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search users, posts, rooms..."
            value={query}
            onChange={() => {}} // Read-only, just triggers modal
            onClick={handleInputClick}
            onFocus={handleInputClick}
            className="pl-10 pr-10 rounded-full bg-muted/50 border-none cursor-pointer"
            readOnly
          />
        </div>
      </div>

      <FullPageSearchModal 
        isOpen={isModalOpen}
        onClose={handleModalClose}
        initialQuery={query}
      />
    </>
  );
}