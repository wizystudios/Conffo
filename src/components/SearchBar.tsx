import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { FullPageSearchModal } from './FullPageSearchModal';

interface SearchBarProps {
  onClose?: () => void;
}

export function SearchBar({ onClose }: SearchBarProps) {
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

  return (
    <>
      <div className="relative w-full max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users, confessions, or rooms..."
            value={query}
            onChange={() => {}} // Read-only, just triggers modal
            onClick={handleInputClick}
            onFocus={handleInputClick}
            className="pl-10 pr-10 cursor-pointer"
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