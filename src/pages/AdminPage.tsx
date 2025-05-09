
import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import { formatDistanceToNow } from 'date-fns';
import { getReports, resolveReport, deleteConfession, deleteComment, getConfessionById, getCommentsByConfessionId } from '@/services/dataService';
import { useToast } from '@/hooks/use-toast';
import { Report } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { RoomBadge } from '@/components/RoomBadge';
import { MessageSquare, ShieldAlert } from 'lucide-react';

export default function AdminPage() {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const loadReports = () => {
    setIsLoading(true);
    const allReports = getReports();
    setReports(allReports);
    setIsLoading(false);
  };
  
  const handleDeleteItem = (report: Report) => {
    if (report.type === 'confession') {
      deleteConfession(report.itemId);
    } else {
      deleteComment(report.itemId);
    }
    
    resolveReport(report.id);
    loadReports();
    
    toast({
      title: `${report.type.charAt(0).toUpperCase() + report.type.slice(1)} deleted`,
      description: "The reported content has been removed.",
    });
  };
  
  const handleDismissReport = (reportId: string) => {
    resolveReport(reportId);
    loadReports();
    
    toast({
      title: "Report dismissed",
      description: "The report has been marked as resolved.",
    });
  };
  
  const getReportedContent = (report: Report) => {
    if (report.type === 'confession') {
      const confession = getConfessionById(report.itemId);
      return confession ? (
        <div className="mt-2 p-3 bg-secondary/50 rounded text-sm">
          <div className="flex justify-between items-center mb-1">
            <RoomBadge room={confession.room} />
          </div>
          <p className="text-foreground">{confession.content}</p>
        </div>
      ) : <p className="text-muted-foreground mt-2">Content no longer available</p>;
    } else {
      const comments = getCommentsByConfessionId(report.itemId);
      const comment = comments.find(c => c.id === report.itemId);
      return comment ? (
        <div className="mt-2 p-3 bg-secondary/50 rounded text-sm">
          <p className="text-foreground">{comment.content}</p>
        </div>
      ) : <p className="text-muted-foreground mt-2">Content no longer available</p>;
    }
  };
  
  useEffect(() => {
    loadReports();
  }, []);
  
  if (!user || !isAdmin) {
    return (
      <Layout>
        <div className="text-center py-10">
          <ShieldAlert className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-4">Admin Access Required</h1>
          <p className="text-muted-foreground mb-6">
            You don't have permission to access this area.
          </p>
          <Button onClick={() => window.history.back()}>Go Back</Button>
        </div>
      </Layout>
    );
  }
  
  const activeReports = reports.filter(r => !r.resolved);
  const resolvedReports = reports.filter(r => r.resolved);
  
  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <ShieldAlert className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">
              Review and handle reported content
            </p>
          </div>
        </div>
        
        <Tabs defaultValue="active" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="active">
              Active Reports
              {activeReports.length > 0 && (
                <span className="ml-2 bg-primary text-primary-foreground rounded-full w-5 h-5 text-xs flex items-center justify-center">
                  {activeReports.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="resolved">Resolved</TabsTrigger>
          </TabsList>
          
          <TabsContent value="active" className="mt-4 space-y-4">
            {isLoading ? (
              <p className="text-center py-8 text-muted-foreground">Loading reports...</p>
            ) : activeReports.length > 0 ? (
              activeReports.map((report) => (
                <Card key={report.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Reported {report.type.charAt(0).toUpperCase() + report.type.slice(1)}
                    </CardTitle>
                    <CardDescription>
                      Reported {formatDistanceToNow(report.timestamp, { addSuffix: true })}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div>
                      <p className="font-medium">Reason:</p>
                      <p className="text-muted-foreground">{report.reason}</p>
                      {getReportedContent(report)}
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive">Delete Content</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Reported Content</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this {report.type}? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteItem(report)}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    
                    <Button variant="outline" onClick={() => handleDismissReport(report.id)}>
                      Dismiss Report
                    </Button>
                  </CardFooter>
                </Card>
              ))
            ) : (
              <p className="text-center py-8 text-muted-foreground">No active reports!</p>
            )}
          </TabsContent>
          
          <TabsContent value="resolved" className="mt-4 space-y-4">
            {isLoading ? (
              <p className="text-center py-8 text-muted-foreground">Loading reports...</p>
            ) : resolvedReports.length > 0 ? (
              resolvedReports.map((report) => (
                <Card key={report.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Resolved {report.type.charAt(0).toUpperCase() + report.type.slice(1)} Report
                    </CardTitle>
                    <CardDescription>
                      Reported {formatDistanceToNow(report.timestamp, { addSuffix: true })}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="font-medium">Reason:</p>
                    <p className="text-muted-foreground">{report.reason}</p>
                  </CardContent>
                </Card>
              ))
            ) : (
              <p className="text-center py-8 text-muted-foreground">No resolved reports yet</p>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
