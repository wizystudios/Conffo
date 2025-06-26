
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getUserConfessions, deleteConfession } from '@/services/supabaseDataService';
import { Confession } from '@/types';
import { InstagramConfessionCard } from './InstagramConfessionCard';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Trash2, Edit } from 'lucide-react';
import { ConfessionEditDialog } from './ConfessionEditDialog';

interface UserConfessionsProps {
  userId?: string;
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
        console.error('Error fetching confessions:', error);
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
        if (onUpdate) onUpdate();
      }
    } catch (error) {
      console.error('Delete failed:', error);
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
    if (onUpdate) onUpdate();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (confessions.length === 0) {
    return (
      <div className="text-center py-12 mx-4">
        <p className="text-muted-foreground">No confessions found.</p>
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
                className="h-8 w-8 p-0 rounded-full"
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
                    <AlertDialogTitle>Delete?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This cannot be undone.
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
