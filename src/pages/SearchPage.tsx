import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, TrendingUp, Hash, Users } from 'lucide-react';
import { Card } from '@/components/ui/card';

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState('');

  const trendingTags = [
    { tag: 'confession', count: '2.1k' },
    { tag: 'anonymous', count: '1.8k' },
    { tag: 'secret', count: '1.5k' },
    { tag: 'truth', count: '1.2k' },
    { tag: 'story', count: '980' },
  ];

  const suggestedUsers = [
    { username: 'anonymous_user1', followers: '1.2k' },
    { username: 'secret_keeper', followers: '980' },
    { username: 'truth_teller', followers: '750' },
  ];

  return (
    <Layout>
      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Search Header */}
        <div className="space-y-4">
          <h1 className="text-2xl font-bold">Search</h1>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search confessions, tags, or users..."
              className="pl-10 h-12 text-base"
            />
          </div>
        </div>

        {/* Quick Filters */}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Hash className="h-4 w-4" />
            Tags
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <Users className="h-4 w-4" />
            Users
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            Trending
          </Button>
        </div>

        {/* Trending Tags */}
        <Card className="p-4">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Trending Tags
          </h2>
          <div className="space-y-3">
            {trendingTags.map((item, index) => (
              <div key={index} className="flex items-center justify-between py-2 hover:bg-muted/50 rounded px-2 cursor-pointer">
                <div className="flex items-center gap-2">
                  <Hash className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">#{item.tag}</span>
                </div>
                <span className="text-sm text-muted-foreground">{item.count} posts</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Suggested Users */}
        <Card className="p-4">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Users className="h-5 w-5" />
            Suggested Users
          </h2>
          <div className="space-y-3">
            {suggestedUsers.map((user, index) => (
              <div key={index} className="flex items-center justify-between py-2 hover:bg-muted/50 rounded px-2 cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                    <Users className="h-4 w-4" />
                  </div>
                  <span className="font-medium">@{user.username}</span>
                </div>
                <span className="text-sm text-muted-foreground">{user.followers} followers</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Search Results */}
        {searchQuery && (
          <Card className="p-6">
            <div className="text-center text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Search results for "{searchQuery}" will appear here</p>
            </div>
          </Card>
        )}
      </div>
    </Layout>
  );
}