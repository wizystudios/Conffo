
import { useState, useEffect } from 'react';
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
import { ConfessionCard } from '@/components/ConfessionCard';
import { CommentCard } from '@/components/CommentCard';
import { CommentForm } from '@/components/CommentForm';
import { Layout } from '@/components/Layout';
import { ReportDialog } from '@/components/ReportDialog';
import { useAuth } from '@/context/AuthContext';
import { getConfessionById, getCommentsByConfessionId, deleteConfession } from '@/services/dataService';
import { useToast } from '@/hooks/use-toast';
import { Confession, Comment } from '@/types';

export default function ConfessionPage() {
  const { confessionId } = useParams<{ confessionId: string }>();
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [confession, setConfession] = useState<Confession | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);

  const loadConfession = () => {
    if (!confessionId) return;
    
    setIsLoading(true);
    const conf = getConfessionById(confessionId, user?.id);
    setConfession(conf);
    
    if (conf) {
      const confComments = getCommentsByConfessionId(confessionId);
      setComments(confComments);
    }
    
    setIsLoading(false);
  };
  
  const handleDeleteConfession = () => {
    if (!confessionId) return;
    
    deleteConfession(confessionId);
    toast({
      title: "Confession deleted",
      description: "The confession has been removed.",
    });
    
    navigate('/');
  };
  
  useEffect(() => {
    loadConfession();
  }, [confessionId, user]);
  
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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Link to="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
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
        
        <ConfessionCard 
          confession={confession}
          detailed 
          onUpdate={loadConfession}
        />
        
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Comments ({comments.length})</h2>
          
          {user ? (
            <CommentForm confessionId={confession.id} onSuccess={loadConfession} />
          ) : (
            <p className="text-center py-4 text-sm text-muted-foreground">
              <Link to="/" className="text-primary underline">Log in</Link> to leave a comment
            </p>
          )}
          
          {comments.length > 0 ? (
            <div className="space-y-3 mt-6">
              {comments.map((comment) => (
                <CommentCard 
                  key={comment.id} 
                  comment={comment}
                  onUpdate={loadConfession} 
                />
              ))}
            </div>
          ) : (
            <p className="text-center py-6 text-muted-foreground">
              No comments yet. Be the first to comment!
            </p>
          )}
        </div>
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
