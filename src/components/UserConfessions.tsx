
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getUserConfessions, deleteConfession } from '@/services/supabaseDataService';
import { Confession } from '@/types';
import { InstagramConfessionCard } from './InstagramConfessionCard';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Trash2, Edit } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { ConfessionEditDialog } from './ConfessionEditDialog';

interface UserConfessionsProps {
  userId?: string; // Optional, if not provided, use current user
  onUpdate?: () => void;
}

export function UserConfessions({ userId, onUpdate }: UserConfessionsProps) {
  const { user, isAdmin } = useAuth();
  const [confessions, setConfessions] = useState<Confession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedConfession, setSelectedConfession] = useState<Confession | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const viewingUserId = userId || user?.id;
  const isOwnProfile = userId ? userId === user?.id : true;

  useEffect(() => {
    const fetchConfessions = async () => {
      if (!viewingUserId) return;
      
      setIsLoading(true);
      try {
        const userConfessions = await getUserConfessions(viewingUserId);
        setConfessions(userConfessions);
      } catch (error) {
        console.error('Error fetching user confessions:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchConfessions();
  }, [viewingUserId]);

  const handleDelete = async (confessionId: string) => {
    if (!user?.id || isDeleting) return;
    
    setIsDeleting(true);
    try {
      const success = await deleteConfession(confessionId, user.id, isAdmin);
      
      if (success) {
        setConfessions(prev => prev.filter(c => c.id !== confessionId));
        toast({
          description: "Confession deleted successfully"
        });
        
        if (onUpdate) {
          onUpdate();
        }
      } else {
        throw new Error("Failed to delete confession");
      }
    } catch (error) {
      console.error('Error deleting confession:', error);
      toast({
        variant: "destructive",
        description: "Failed to delete confession"
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEdit = (confession: Confession) => {
    setSelectedConfession(confession);
    setIsEditDialogOpen(true);
  };

  const handleConfessionUpdated = (updatedConfession: Confession) => {
    setConfessions(prev => prev.map(c => c.id === updatedConfession.id ? updatedConfession : c));
    
    if (onUpdate) {
      onUpdate();
    }
    
    toast({
      description: "Confession updated successfully"
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="text-center">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Loading confessions...</p>
        </div>
      </div>
    );
  }

  if (confessions.length === 0) {
    return (
      <div className="text-center py-12 mx-4">
        <div className="border-2 border-dashed border-muted rounded-2xl p-8">
          <p className="text-muted-foreground mb-2">No confessions found.</p>
          <p className="text-sm text-muted-foreground">
            {isOwnProfile 
              ? "Share your thoughts anonymously to see them listed here." 
              : "This user hasn't shared any confessions yet."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {confessions.map(confession => (
        <div key={confession.id} className="relative">
          <InstagramConfessionCard 
            confession={confession} 
            onUpdate={onUpdate}
          />
          {isOwnProfile && (
            <div className="absolute top-6 right-6 flex gap-2 bg-background/90 backdrop-blur-sm rounded-full p-1">
              <Button 
                variant="ghost" 
                size="sm"
                className="h-8 w-8 p-0 rounded-full hover:bg-muted"
                onClick={() => handleEdit(confession)}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="h-8 w-8 p-0 rounded-full hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Confession</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete this confession?
                      This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleDelete(confession.id)}
                      disabled={isDeleting}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {isDeleting ? "Deleting..." : "Delete"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>
      ))}
      
      {selectedConfession && isOwnProfile && (
        <ConfessionEditDialog 
          confession={selectedConfession}
          isOpen={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          onUpdate={handleConfessionUpdated}
        />
      )}
    </div>
  );
}
