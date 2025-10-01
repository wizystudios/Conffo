import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { EnhancedCreatePostModal } from '@/components/EnhancedCreatePostModal';

export default function CreatePostPage() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Open modal when page loads
    setIsOpen(true);
  }, []);

  const handleSuccess = () => {
    setIsOpen(false);
    navigate('/', { replace: true });
  };

  const handleClose = () => {
    setIsOpen(false);
    navigate(-1);
  };

  return (
    <EnhancedCreatePostModal
      isOpen={isOpen}
      onClose={handleClose}
      onSuccess={handleSuccess}
    />
  );
}