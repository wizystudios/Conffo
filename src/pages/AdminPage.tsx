import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/context/AuthContext';
import { getReports, resolveReport } from '@/services/supabaseDataService';
import { useQuery } from '@tanstack/react-query';
import { ReportReason } from '@/types';
import { Navigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { BadgeCheck, X, Check, Shield, Users, Flag, Loader2 } from 'lucide-react';

interface VerificationRequest {
  id: string;
  user_id: string;
  image_url: string;
  status: string;
  created_at: string;
  username?: string;
  avatar_url?: string;
}

export default function AdminPage() {
  const { user, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('verification');
  const [processingIds, setProcessingIds] = useState<string[]>([]);
  
  // Fetch reports
  const {
    data: reports = [],
    isLoading: isLoadingReports,
    refetch: refetchReports
  } = useQuery({
    queryKey: ['reports'],
    queryFn: getReports,
    enabled: !!user && isAdmin,
  });

  // Fetch verification requests
  const {
    data: verificationRequests = [],
    isLoading: isLoadingVerifications,
    refetch: refetchVerifications
  } = useQuery({
    queryKey: ['verification-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('image_verification')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch user profiles for each request
      const requestsWithProfiles = await Promise.all(
        (data || []).map(async (req) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('username, avatar_url')
            .eq('id', req.user_id)
            .single();
          
          return {
            ...req,
            username: profile?.username || 'Unknown',
            avatar_url: profile?.avatar_url
          };
        })
      );

      return requestsWithProfiles as VerificationRequest[];
    },
    enabled: !!user && isAdmin,
  });

  // Fetch verified users
  const {
    data: verifiedUsers = [],
    isLoading: isLoadingVerified,
    refetch: refetchVerified
  } = useQuery({
    queryKey: ['verified-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, is_verified, verification_date')
        .eq('is_verified', true)
        .order('verification_date', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user && isAdmin,
  });
  
  const handleResolveReport = async (reportId: string) => {
    if (!user) return;
    
    const success = await resolveReport(reportId, user.id);
    
    if (success) {
      refetchReports();
    }
  };

  const handleApproveVerification = async (request: VerificationRequest) => {
    setProcessingIds(prev => [...prev, request.id]);
    
    try {
      // Update the verification request status
      await supabase
        .from('image_verification')
        .update({ 
          status: 'approved',
          verified_at: new Date().toISOString()
        })
        .eq('id', request.id);

      // Update the user's profile to verified
      await supabase
        .from('profiles')
        .update({ 
          is_verified: true,
          verification_date: new Date().toISOString(),
          verification_type: 'admin_approved'
        })
        .eq('id', request.user_id);

      // Create notification for user
      await supabase
        .from('notifications')
        .insert({
          user_id: request.user_id,
          type: 'verification_approved',
          content: 'Congratulations! Your verification request has been approved. You now have a verified badge on your profile.'
        });

      toast({ description: `Approved verification for ${request.username}` });
      refetchVerifications();
      refetchVerified();
    } catch (error) {
      console.error('Error approving verification:', error);
      toast({ variant: 'destructive', description: 'Failed to approve verification' });
    } finally {
      setProcessingIds(prev => prev.filter(id => id !== request.id));
    }
  };

  const handleRejectVerification = async (request: VerificationRequest) => {
    setProcessingIds(prev => [...prev, request.id]);
    
    try {
      await supabase
        .from('image_verification')
        .update({ status: 'rejected' })
        .eq('id', request.id);

      // Create notification for user
      await supabase
        .from('notifications')
        .insert({
          user_id: request.user_id,
          type: 'verification_rejected',
          content: 'Your verification request was not approved. Please ensure your photo meets our requirements and try again.'
        });

      toast({ description: `Rejected verification for ${request.username}` });
      refetchVerifications();
    } catch (error) {
      console.error('Error rejecting verification:', error);
      toast({ variant: 'destructive', description: 'Failed to reject verification' });
    } finally {
      setProcessingIds(prev => prev.filter(id => id !== request.id));
    }
  };

  const handleRevokeVerification = async (userId: string, username: string) => {
    setProcessingIds(prev => [...prev, userId]);
    
    try {
      await supabase
        .from('profiles')
        .update({ 
          is_verified: false,
          verification_date: null,
          verification_type: null
        })
        .eq('id', userId);

      toast({ description: `Revoked verification for ${username}` });
      refetchVerified();
    } catch (error) {
      console.error('Error revoking verification:', error);
      toast({ variant: 'destructive', description: 'Failed to revoke verification' });
    } finally {
      setProcessingIds(prev => prev.filter(id => id !== userId));
    }
  };
  
  if (!user || !isAdmin) {
    return <Navigate to="/" replace />;
  }
  
  const unresolvedReports = reports.filter((report: any) => !report.resolved);
  const resolvedReports = reports.filter((report: any) => report.resolved);
  
  const getReasonBadgeVariant = (reason: ReportReason) => {
    switch (reason) {
      case 'offensive': return 'destructive';
      case 'harassment': return 'destructive';
      case 'spam': return 'warning';
      case 'inappropriate': return 'warning';
      default: return 'outline';
    }
  };
  
  return (
    <Layout>
      <div className="space-y-6 p-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Admin Dashboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="verification" className="flex items-center gap-1">
                  <BadgeCheck className="h-4 w-4" />
                  Verification
                  {verificationRequests.length > 0 && (
                    <Badge variant="destructive" className="ml-1 h-5 px-1.5">
                      {verificationRequests.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="reports" className="flex items-center gap-1">
                  <Flag className="h-4 w-4" />
                  Reports
                  {unresolvedReports.length > 0 && (
                    <Badge variant="destructive" className="ml-1 h-5 px-1.5">
                      {unresolvedReports.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="users" className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  Verified
                </TabsTrigger>
              </TabsList>
              
              {/* Verification Tab */}
              <TabsContent value="verification" className="space-y-4 pt-4">
                <h3 className="text-lg font-medium">Pending Verification Requests</h3>
                {isLoadingVerifications ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : verificationRequests.length > 0 ? (
                  <div className="space-y-4">
                    {verificationRequests.map((request) => (
                      <Card key={request.id}>
                        <CardContent className="pt-6 pb-4">
                          <div className="flex items-start gap-4">
                            <Avatar className="h-12 w-12">
                              <AvatarImage src={request.avatar_url || `https://api.dicebear.com/7.x/micah/svg?seed=${request.user_id}`} />
                              <AvatarFallback>{request.username?.charAt(0) || 'U'}</AvatarFallback>
                            </Avatar>
                            
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-semibold">{request.username}</span>
                                <span className="text-xs text-muted-foreground">
                                  {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                                </span>
                              </div>
                              
                              {/* Verification image */}
                              <div className="mb-3">
                                <img 
                                  src={request.image_url} 
                                  alt="Verification" 
                                  className="max-w-xs rounded-lg border"
                                />
                              </div>
                              
                              <div className="flex gap-2">
                                <Button 
                                  size="sm" 
                                  onClick={() => handleApproveVerification(request)}
                                  disabled={processingIds.includes(request.id)}
                                  className="gap-1"
                                >
                                  {processingIds.includes(request.id) ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Check className="h-4 w-4" />
                                  )}
                                  Approve
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="destructive"
                                  onClick={() => handleRejectVerification(request)}
                                  disabled={processingIds.includes(request.id)}
                                  className="gap-1"
                                >
                                  <X className="h-4 w-4" />
                                  Reject
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    No pending verification requests
                  </p>
                )}
              </TabsContent>
              
              {/* Reports Tab */}
              <TabsContent value="reports" className="space-y-4 pt-4">
                <h3 className="text-lg font-medium">Unresolved Reports</h3>
                {isLoadingReports ? (
                  <p className="text-muted-foreground">Loading reports...</p>
                ) : unresolvedReports.length > 0 ? (
                  <div className="space-y-4">
                    {unresolvedReports.map((report: any) => (
                      <Card key={report.id}>
                        <CardContent className="pt-6 pb-4">
                          <div className="flex justify-between mb-2">
                            <Badge variant={getReasonBadgeVariant(report.reason)}>
                              {report.reason}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}
                            </span>
                          </div>
                          
                          <p className="text-sm mb-4">
                            <span className="font-medium">Type:</span> {report.item_type}
                          </p>
                          
                          {report.details && (
                            <p className="text-sm mb-4">
                              <span className="font-medium">Details:</span> {report.details}
                            </p>
                          )}
                          
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="outline">
                              View Content
                            </Button>
                            <Button 
                              size="sm" 
                              onClick={() => handleResolveReport(report.id)}
                            >
                              Resolve
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No unresolved reports.</p>
                )}
                
                <h3 className="text-lg font-medium mt-8">Resolved Reports</h3>
                {resolvedReports.length > 0 ? (
                  <div className="space-y-2">
                    {resolvedReports.map((report: any) => (
                      <Card key={report.id}>
                        <CardContent className="pt-6 pb-4">
                          <div className="flex justify-between mb-2">
                            <Badge variant="outline">{report.reason}</Badge>
                            <span className="text-sm text-muted-foreground">
                              {formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}
                            </span>
                          </div>
                          
                          <p className="text-sm">
                            <span className="font-medium">Type:</span> {report.item_type}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Resolved {formatDistanceToNow(new Date(report.resolved_at), { addSuffix: true })}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No resolved reports.</p>
                )}
              </TabsContent>
              
              {/* Verified Users Tab */}
              <TabsContent value="users" className="pt-4">
                <h3 className="text-lg font-medium mb-4">Verified Users ({verifiedUsers.length})</h3>
                {isLoadingVerified ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : verifiedUsers.length > 0 ? (
                  <div className="space-y-2">
                    {verifiedUsers.map((verifiedUser: any) => (
                      <Card key={verifiedUser.id}>
                        <CardContent className="py-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={verifiedUser.avatar_url || `https://api.dicebear.com/7.x/micah/svg?seed=${verifiedUser.id}`} />
                                <AvatarFallback>{verifiedUser.username?.charAt(0) || 'U'}</AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="flex items-center gap-1">
                                  <span className="font-medium">{verifiedUser.username}</span>
                                  <BadgeCheck className="h-4 w-4 text-primary" />
                                </div>
                                {verifiedUser.verification_date && (
                                  <p className="text-xs text-muted-foreground">
                                    Verified {formatDistanceToNow(new Date(verifiedUser.verification_date), { addSuffix: true })}
                                  </p>
                                )}
                              </div>
                            </div>
                            
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleRevokeVerification(verifiedUser.id, verifiedUser.username)}
                              disabled={processingIds.includes(verifiedUser.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              {processingIds.includes(verifiedUser.id) ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                'Revoke'
                              )}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">No verified users yet</p>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}