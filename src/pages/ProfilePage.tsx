
import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ConfessionCard } from '@/components/ConfessionCard';
import { getConfessionById } from '@/services/supabaseDataService';
import { Confession } from '@/types';
import { AlertCircle, User, Save, Download, LogOut } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Navigate } from 'react-router-dom';

export default function ProfilePage() {
  const { user, isAuthenticated, isLoading, updateUsername, logout, getSavedConfessions } = useAuth();
  const [username, setUsername] = useState('');
  const [savedConfessions, setSavedConfessions] = useState<Confession[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);

  useEffect(() => {
    if (user?.username) {
      setUsername(user.username);
    }
  }, [user]);

  useEffect(() => {
    const fetchSavedConfessions = async () => {
      if (!isAuthenticated) return;
      
      setLoadingSaved(true);
      try {
        const savedIds = await getSavedConfessions();
        const confessions: Confession[] = [];
        
        for (const id of savedIds) {
          try {
            const confession = await getConfessionById(id, user?.id);
            if (confession) {
              confessions.push(confession);
            }
          } catch (error) {
            console.error(`Error fetching confession ${id}:`, error);
          }
        }
        
        setSavedConfessions(confessions);
      } catch (error) {
        console.error('Error fetching saved confessions:', error);
      } finally {
        setLoadingSaved(false);
      }
    };
    
    fetchSavedConfessions();
  }, [isAuthenticated, user?.id, getSavedConfessions]);

  const handleSaveUsername = async () => {
    if (username.trim()) {
      await updateUsername(username.trim());
    } else {
      toast({
        title: "Username cannot be empty",
        description: "Please enter a valid username",
        variant: "destructive"
      });
    }
  };
  
  const downloadConfession = (confession: Confession) => {
    // Create text content
    const text = `
      Confession from ${new Date(confession.timestamp).toLocaleString()}
      Room: ${confession.room}
      
      ${confession.content}
      
      Reactions:
      👍 ${confession.reactions.like} | 😂 ${confession.reactions.laugh} | 😲 ${confession.reactions.shock} | ❤️ ${confession.reactions.heart}
      
      Comments: ${confession.commentCount}
      
      Downloaded from Confession Room
    `.trim();
    
    // Create blob and download link
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `confession-${confession.id.substring(0, 8)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Confession Downloaded",
      description: "The confession has been saved to your device",
    });
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center py-12">
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </Layout>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/auth" />;
  }

  return (
    <Layout>
      <div className="space-y-6 container py-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <User className="h-6 w-6" />
              Profile Settings
            </CardTitle>
            <CardDescription>
              Manage your profile settings and saved content
            </CardDescription>
          </CardHeader>
          
          <Tabs defaultValue="settings" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="settings">Settings</TabsTrigger>
              <TabsTrigger value="saved">Saved Confessions</TabsTrigger>
            </TabsList>
            
            <TabsContent value="settings">
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <div className="flex gap-2">
                    <Input 
                      id="username" 
                      value={username} 
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Set your username"
                      className="flex-1"
                    />
                    <Button onClick={handleSaveUsername}>Save</Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Your username is only visible to moderators and is used for account management.
                  </p>
                </div>
                
                <div className="pt-4">
                  <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3 rounded-md flex gap-2 text-amber-800 dark:text-amber-300">
                    <AlertCircle className="h-5 w-5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium">Anonymous Usage</p>
                      <p className="text-xs mt-1">
                        Your confessions are posted anonymously. Your username is not attached to your confessions.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t pt-6">
                <Button variant="destructive" onClick={logout} className="gap-2">
                  <LogOut className="h-4 w-4" />
                  Logout
                </Button>
              </CardFooter>
            </TabsContent>
            
            <TabsContent value="saved">
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Save className="h-5 w-5 text-primary" />
                    <h3 className="font-medium">Your Saved Confessions</h3>
                  </div>
                  
                  {loadingSaved ? (
                    <p className="text-center py-8 text-muted-foreground">Loading saved confessions...</p>
                  ) : savedConfessions.length > 0 ? (
                    <div className="space-y-4">
                      {savedConfessions.map(confession => (
                        <div key={confession.id} className="relative">
                          <ConfessionCard 
                            confession={confession}
                            onUpdate={() => {/* Refresh saved confessions */}}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            className="absolute top-2 right-2"
                            onClick={() => downloadConfession(confession)}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 border border-dashed rounded-md">
                      <p className="text-muted-foreground">You haven't saved any confessions yet.</p>
                      <p className="text-sm mt-2">
                        When you find interesting confessions, click the save button to add them here.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </Layout>
  );
}
