import { useNavigate } from 'react-router-dom';
import { FullScreenPostModal } from '@/components/FullScreenPostModal';

export default function CreatePostPage() {
  const navigate = useNavigate();

  const handleSuccess = () => {
    navigate('/browse', { replace: true });
  };

  const handleClose = () => {
    navigate(-1);
  };

  return (
    <FullScreenPostModal
      isOpen={true}
      onClose={handleClose}
      onSuccess={handleSuccess}
    />
  );
}