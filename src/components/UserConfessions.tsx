
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getUserConfessions, deleteConfession } from '@/services/supabaseDataService';
import { Confession } from '@/types';
import { ConfessionCard } from './ConfessionCard';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Trash2, Edit } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
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
    return <p className="text-center py-8 text-muted-foreground">Loading confessions...</p>;
  }

  if (confessions.length === 0) {
    return (
      <div className="text-center py-8 border border-dashed rounded-md">
        <p className="text-muted-foreground">No confessions found.</p>
        <p className="text-sm mt-2">
          {isOwnProfile 
            ? "Share your thoughts anonymously to see them listed here." 
            : "This user hasn't shared any confessions yet."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {confessions.map(confession => (
        <div key={confession.id} className="relative">
          <ConfessionCard 
            confession={confession} 
            onUpdate={onUpdate}
          />
          {isOwnProfile && (
            <div className="absolute top-3 right-3 flex gap-1">
              <Button 
                variant="outline" 
                size="icon"
                className="h-7 w-7"
                onClick={() => handleEdit(confession)}
              >
                <Edit className="h-3.5 w-3.5" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="destructive" 
                    size="icon"
                    className="h-7 w-7"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
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
