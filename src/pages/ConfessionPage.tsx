
import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, MoreVertical, Flag, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { InstagramConfessionCard } from '@/components/InstagramConfessionCard';
import { Layout } from '@/components/Layout';
import { ReportDialog } from '@/components/ReportDialog';
import { useAuth } from '@/context/AuthContext';
import { getConfessionById, deleteConfession } from '@/services/supabaseDataService';
import { toast } from '@/hooks/use-toast';
import { Confession } from '@/types';
import { useQuery } from '@tanstack/react-query';

export default function ConfessionPage() {
  const { confessionId } = useParams<{ confessionId: string }>();
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [reportDialogOpen, setReportDialogOpen] = useState(false);

  // Fetch confession data
  const { 
    data: confession,
    isLoading,
    refetch: refetchConfession
  } = useQuery({
    queryKey: ['confession', confessionId, user?.id],
    queryFn: () => confessionId ? getConfessionById(confessionId, user?.id) : null,
    enabled: !!confessionId,
  });
  
  const handleDeleteConfession = async () => {
    if (!confessionId || !user) return;
    
    try {
      const success = await deleteConfession(confessionId, user.id, isAdmin);
      if (success) {
        navigate('/');
      }
    } catch (error) {
      console.error('Error deleting confession:', error);
      toast({
        variant: "destructive",
        description: "Failed to delete confession"
      });
    }
  };
  
  const handleUpdateData = () => {
    refetchConfession();
  };
  
  if (isLoading) {
    return (
      <Layout>
        <div className="text-center py-10">
          <p className="text-muted-foreground">Loading confession...</p>
        </div>
      </Layout>
    );
  }
  
  if (!confession) {
    return (
      <Layout>
        <div className="text-center py-10">
          <h1 className="text-2xl font-bold mb-4">Confession Not Found</h1>
          <p className="text-muted-foreground mb-6">
            The confession you're looking for doesn't exist or has been removed.
          </p>
          <Link to="/">
            <Button>Back to Home</Button>
          </Link>
        </div>
      </Layout>
    );
  }
  
  const isAuthor = user?.id === confession.userId;
  const canDelete = isAuthor || isAdmin;
  
  return (
    <Layout>
      <div className="space-y-0">
        <div className="flex items-center justify-between py-2 px-4 bg-background sticky top-0 z-10 border-b border-border">
          <Link to="/">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          
          <h1 className="font-semibold">Post</h1>
          
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {canDelete ? (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        <span>Delete</span>
                      </DropdownMenuItem>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Confession</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this confession? This will also delete all comments.
                          This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteConfession}>Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                ) : (
                  <DropdownMenuItem onClick={() => setReportDialogOpen(true)}>
                    <Flag className="mr-2 h-4 w-4" />
                    <span>Report</span>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        
        {/* Use the same card as home page */}
        <InstagramConfessionCard 
          confession={confession}
          onUpdate={handleUpdateData}
        />
      </div>
      
      <ReportDialog 
        open={reportDialogOpen} 
        onOpenChange={setReportDialogOpen} 
        type="confession" 
        itemId={confession.id} 
      />
    </Layout>
  );
}