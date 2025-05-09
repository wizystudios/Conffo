
import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';
import { getReports, resolveReport } from '@/services/supabaseDataService';
import { Report } from '@/types';
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { CheckCircle, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AdminPage() {
  const { user, isAdmin, isModerator } = useAuth();
  const navigate = useNavigate();
  const [isResolvingReport, setIsResolvingReport] = useState<string | null>(null);
  
  // Redirect non-admin users
  if (!user || (!isAdmin && !isModerator)) {
    return (
      <Layout>
        <div className="text-center py-10">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-muted-foreground mb-6">
            You don't have permission to view this page.
          </p>
          <Button onClick={() => navigate('/')}>Back to Home</Button>
        </div>
      </Layout>
    );
  }
  
  // Fetch reports
  const { data: activeReports = [], refetch: refetchActive } = useQuery({
    queryKey: ['reports', 'active'],
    queryFn: () => getReports(false), // false = not resolved
    enabled: isAdmin || isModerator,
  });
  
  const { data: resolvedReports = [], refetch: refetchResolved } = useQuery({
    queryKey: ['reports', 'resolved'],
    queryFn: () => getReports(true), // true = resolved
    enabled: isAdmin || isModerator,
  });
  
  const handleResolveReport = async (reportId: string) => {
    if (!user) return;
    
    setIsResolvingReport(reportId);
    
    try {
      await resolveReport(reportId, user.id);
      refetchActive();
      refetchResolved();
    } catch (error) {
      console.error('Error resolving report:', error);
    } finally {
      setIsResolvingReport(null);
    }
  };
  
  const handleViewReportedItem = (report: Report) => {
    if (report.type === 'confession') {
      navigate(`/confession/${report.itemId}`);
    }
    // For comments, navigate to the confession and highlight the comment somehow
    // This would require additional API work to get the confession ID from a comment ID
  };
  
  const renderReportReason = (reason: string) => {
    const colors = {
      offensive: 'bg-red-500',
      spam: 'bg-yellow-500',
      harassment: 'bg-orange-500',
      inappropriate: 'bg-purple-500',
      other: 'bg-gray-500'
    };
    
    const color = colors[reason as keyof typeof colors] || 'bg-gray-500';
    
    return (
      <Badge variant="secondary" className={`${color} text-white`}>
        {reason}
      </Badge>
    );
  };
  
  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Manage reports and moderate content
          </p>
        </div>
        
        <Tabs defaultValue="active">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="active">
              Active Reports ({activeReports.length})
            </TabsTrigger>
            <TabsTrigger value="resolved">
              Resolved Reports ({resolvedReports.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="active" className="mt-4">
            {activeReports.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-muted-foreground">No active reports</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {activeReports.map((report) => (
                  <Card key={report.id}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-base">
                            Reported {report.type}{' '}
                            {renderReportReason(report.reason)}
                          </CardTitle>
                          <CardDescription>
                            {formatDistanceToNow(report.timestamp, { addSuffix: true })}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pb-2">
                      {report.details && (
                        <p className="text-sm mb-4 italic">
                          "{report.details}"
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        <Button 
                          size="sm" 
                          onClick={() => handleViewReportedItem(report)}
                        >
                          View Content
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => handleResolveReport(report.id)}
                          disabled={isResolvingReport === report.id}
                        >
                          {isResolvingReport === report.id ? 'Resolving...' : 'Mark Resolved'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="resolved" className="mt-4">
            {resolvedReports.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-muted-foreground">No resolved reports</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {resolvedReports.map((report) => (
                  <Card key={report.id}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-base flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            Resolved {report.type}{' '}
                            {renderReportReason(report.reason)}
                          </CardTitle>
                          <CardDescription>
                            {report.resolvedAt && `Resolved ${formatDistanceToNow(report.resolvedAt, { addSuffix: true })}`}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pb-2">
                      {report.details && (
                        <p className="text-sm mb-4 italic">
                          "{report.details}"
                        </p>
                      )}
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleViewReportedItem(report)}
                      >
                        View Content
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
