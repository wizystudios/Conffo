
import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/context/AuthContext';
import { getReports, resolveReport } from '@/services/supabaseDataService';
import { useQuery } from '@tanstack/react-query';
import { ReportReason } from '@/types';
import { Navigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

export default function AdminPage() {
  const { user, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('reports');
  
  const {
    data: reports = [],
    isLoading,
    refetch
  } = useQuery({
    queryKey: ['reports'],
    queryFn: getReports,
    enabled: !!user && isAdmin,
  });
  
  const handleResolveReport = async (reportId: string) => {
    if (!user) return;
    
    const success = await resolveReport(reportId, user.id);
    
    if (success) {
      refetch();
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
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Admin Dashboard</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="reports">
                  Reports
                  {unresolvedReports.length > 0 && (
                    <Badge variant="destructive" className="ml-2">
                      {unresolvedReports.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="users">Users</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>
              
              <TabsContent value="reports" className="space-y-4 pt-4">
                <h3 className="text-lg font-medium">Unresolved Reports</h3>
                {isLoading ? (
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
                {isLoading ? (
                  <p className="text-muted-foreground">Loading reports...</p>
                ) : resolvedReports.length > 0 ? (
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
              
              <TabsContent value="users">
                <p className="text-muted-foreground pt-4">User management features coming soon.</p>
              </TabsContent>
              
              <TabsContent value="settings">
                <p className="text-muted-foreground pt-4">Admin settings coming soon.</p>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
