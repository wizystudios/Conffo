import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { EnhancedConfessionForm } from '@/components/EnhancedConfessionForm';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function CreatePostPage() {
  const navigate = useNavigate();

  const handleSuccess = () => {
    navigate('/', { replace: true });
  };

  const handleCancel = () => {
    navigate(-1);
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto p-4 space-y-6">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCancel}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Create New Post</h1>
        </div>
        
        <div className="bg-card rounded-lg p-6 border">
          <EnhancedConfessionForm 
            onSuccess={handleSuccess}
            onCancel={handleCancel}
          />
        </div>
      </div>
    </Layout>
  );
}