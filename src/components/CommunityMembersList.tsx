import { useState, useEffect } from 'react';
import { X, Crown, Shield, UserMinus, Check, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { 
  getCommunityMembers, 
  removeCommunityMember, 
  CommunityMember,
  getConnectionsForCommunity,
  addCommunityMember,
  updateMemberRole
} from '@/services/communityService';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/hooks/use-toast';
import { haptic } from '@/utils/hapticFeedback';

interface CommunityMembersListProps {
  isOpen: boolean;
  onClose: () => void;
  communityId: string;
  creatorId: string;
  isAddMode?: boolean;
}

export function CommunityMembersList({ 
  isOpen, 
  onClose, 
  communityId, 
  creatorId,
  isAddMode = false 
}: CommunityMembersListProps) {
  const { user } = useAuth();
  const [members, setMembers] = useState<CommunityMember[]>([]);
  const [connections, setConnections] = useState<{ id: string; username: string; avatarUrl?: string }[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const isCreator = creatorId === user?.id;

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, communityId]);

  const loadData = async () => {
    setIsLoading(true);
    
    if (isAddMode) {
      const [membersData, connectionsData] = await Promise.all([
        getCommunityMembers(communityId),
        getConnectionsForCommunity()
      ]);
      
      setMembers(membersData);
      
      const memberIds = new Set(membersData.map(m => m.userId));
      const availableConnections = connectionsData.filter(c => !memberIds.has(c.id));
      setConnections(availableConnections);
    } else {
      const membersData = await getCommunityMembers(communityId);
      setMembers(membersData);
    }
    
    setIsLoading(false);
  };

  const handleRemoveMember = async (memberId: string, userId: string) => {
    if (!isCreator) return;
    
    const success = await removeCommunityMember(communityId, userId);
    if (success) {
      setMembers(prev => prev.filter(m => m.id !== memberId));
      haptic.light();
      toast({ description: 'Member removed' });
    } else {
      toast({ variant: 'destructive', description: 'Failed to remove member' });
    }
  };

  const handlePromote = async (userId: string) => {
    const success = await updateMemberRole(communityId, userId, 'admin');
    if (success) {
      setMembers(prev => prev.map(m => 
        m.userId === userId ? { ...m, role: 'admin' } : m
      ));
      haptic.success();
      toast({ description: 'Member promoted to admin' });
    } else {
      toast({ variant: 'destructive', description: 'Failed to promote member' });
    }
  };

  const handleDemote = async (userId: string) => {
    const success = await updateMemberRole(communityId, userId, 'member');
    if (success) {
      setMembers(prev => prev.map(m => 
        m.userId === userId ? { ...m, role: 'member' } : m
      ));
      haptic.light();
      toast({ description: 'Member demoted' });
    } else {
      toast({ variant: 'destructive', description: 'Failed to demote member' });
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleAddSelected = async () => {
    if (selectedIds.size === 0) return;
    
    setIsAdding(true);
    
    let successCount = 0;
    for (const userId of selectedIds) {
      const success = await addCommunityMember(communityId, userId);
      if (success) successCount++;
    }
    
    if (successCount > 0) {
      haptic.success();
      toast({ description: `✅ Added ${successCount} member${successCount > 1 ? 's' : ''}` });
      setSelectedIds(new Set());
      await loadData();
    } else {
      toast({ variant: 'destructive', description: 'Failed to add members' });
    }
    
    setIsAdding(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose}>
      <div 
        className="absolute bottom-0 left-0 right-0 bg-background rounded-t-3xl max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center py-3">
          <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3 border-b border-border">
          <h2 className="text-lg font-bold">
            {isAddMode ? 'Add Members' : 'Members'}
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : isAddMode ? (
            connections.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">No connections available to add</p>
                <p className="text-xs mt-1">Only Fans & Crew can be added</p>
              </div>
            ) : (
              <div className="space-y-2">
                {connections.map((connection) => (
                  <button
                    key={connection.id}
                    onClick={() => toggleSelection(connection.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${
                      selectedIds.has(connection.id) 
                        ? 'bg-primary/10 border border-primary' 
                        : 'bg-muted/50 hover:bg-muted'
                    }`}
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={connection.avatarUrl} />
                      <AvatarFallback>{connection.username.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    
                    <span className="flex-1 text-left font-medium text-sm">{connection.username}</span>
                    
                    {selectedIds.has(connection.id) && (
                      <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                        <Check className="h-4 w-4 text-primary-foreground" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )
          ) : (
            <div className="space-y-2">
              {members.map((member) => (
                <div 
                  key={member.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-muted/50"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={member.avatarUrl} />
                    <AvatarFallback>{member.username?.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{member.username}</p>
                    {member.role === 'creator' && (
                      <Badge variant="secondary" className="text-[10px] h-4 gap-0.5">
                        <Crown className="h-2.5 w-2.5" />
                        Creator
                      </Badge>
                    )}
                    {member.role === 'admin' && (
                      <Badge variant="outline" className="text-[10px] h-4 gap-0.5">
                        <Shield className="h-2.5 w-2.5" />
                        Admin
                      </Badge>
                    )}
                  </div>
                  
                  {isCreator && member.role !== 'creator' && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 px-2">
                          <span className="text-xs">Manage</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {member.role === 'member' ? (
                          <DropdownMenuItem onClick={() => handlePromote(member.userId)}>
                            <ChevronUp className="h-4 w-4 mr-2" />
                            Promote to Admin
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => handleDemote(member.userId)}>
                            <ChevronDown className="h-4 w-4 mr-2" />
                            Demote to Member
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem 
                          onClick={() => handleRemoveMember(member.id, member.userId)}
                          className="text-destructive"
                        >
                          <UserMinus className="h-4 w-4 mr-2" />
                          Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add button for add mode */}
        {isAddMode && selectedIds.size > 0 && (
          <div className="p-4 border-t border-border">
            <Button 
              onClick={handleAddSelected} 
              disabled={isAdding}
              className="w-full h-12 rounded-xl font-semibold"
            >
              {isAdding ? 'Adding...' : `Add ${selectedIds.size} Member${selectedIds.size > 1 ? 's' : ''}`}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}