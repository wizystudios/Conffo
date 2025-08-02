import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Globe, Calendar, Mail, Phone, Shield, Lock, Eye, Users } from 'lucide-react';
import { format } from 'date-fns';

interface ProfileInfoSectionProps {
  userId: string;
  isOwnProfile: boolean;
}

interface UserProfile {
  username: string | null;
  bio: string | null;
  website: string | null;
  location: string | null;
  gender: string | null;
  date_of_birth: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  interests: string[] | null;
  privacy_settings: any;
  is_public: boolean;
}

export function ProfileInfoSection({ userId, isOwnProfile }: ProfileInfoSectionProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select(`
            username,
            bio,
            website,
            location,
            gender,
            date_of_birth,
            contact_email,
            contact_phone,
            interests,
            privacy_settings,
            is_public
          `)
          .eq('id', userId)
          .single();

        if (error) {
          console.error('Error fetching profile:', error);
          return;
        }

        setProfile(data);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [userId]);

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-muted rounded w-3/4"></div>
          <div className="h-4 bg-muted rounded w-1/2"></div>
          <div className="h-4 bg-muted rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-4 text-center">
        <p className="text-muted-foreground">Profile information not available</p>
      </div>
    );
  }

  const privacySettings = profile.privacy_settings || {};
  
  // Check visibility based on privacy settings - now default to showing everything unless explicitly private
  const canViewContact = isOwnProfile || (privacySettings?.contact_visibility !== 'private' && privacySettings?.contact_visibility !== 'friends');
  const canViewEmail = isOwnProfile || privacySettings?.email_visibility !== 'private';
  const canViewPhone = isOwnProfile || privacySettings?.phone_visibility !== 'private';
  const canViewGender = isOwnProfile || privacySettings?.gender_visibility !== 'private';
  const canViewLocation = isOwnProfile || privacySettings?.location_visibility !== 'private';
  const canViewBirthDate = isOwnProfile || privacySettings?.birth_date_visibility !== 'private';

  return (
    <div className="p-4 space-y-4">
      {/* Basic Information Card */}
      <Card className="border-border/60">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-foreground">Basic Information</h3>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Username</span>
              <span className="text-sm font-semibold">{profile.username || 'Not set'}</span>
            </div>
            
            {profile.bio && (
              <div className="space-y-1">
                <span className="text-sm font-medium text-muted-foreground">Bio</span>
                <p className="text-sm text-foreground bg-muted/30 rounded-md p-2">
                  {profile.bio}
                </p>
              </div>
            )}

            {profile.website && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe className="h-3 w-3 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">Website</span>
                </div>
                <a 
                  href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline truncate max-w-[150px]"
                >
                  {profile.website}
                </a>
              </div>
            )}

            {canViewLocation && profile.location && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="h-3 w-3 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">Location</span>
                </div>
                <span className="text-sm">{profile.location}</span>
              </div>
            )}

            {canViewGender && profile.gender && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Gender</span>
                <Badge variant="secondary" className="text-xs">
                  {profile.gender}
                </Badge>
              </div>
            )}

            {canViewBirthDate && profile.date_of_birth && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-3 w-3 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">Birth Date</span>
                </div>
                <span className="text-sm">
                  {format(new Date(profile.date_of_birth), 'MMM dd, yyyy')}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Contact Information Card */}
      {((canViewEmail && profile.contact_email) || (canViewPhone && profile.contact_phone)) && (
        <Card className="border-border/60">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Mail className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-foreground">Contact Information</h3>
            </div>
            
            <div className="space-y-3">
              {canViewEmail && profile.contact_email && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="h-3 w-3 text-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground">Email</span>
                  </div>
                  <a 
                    href={`mailto:${profile.contact_email}`}
                    className="text-sm text-primary hover:underline"
                  >
                    {profile.contact_email}
                  </a>
                </div>
              )}

              {canViewPhone && profile.contact_phone && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Phone className="h-3 w-3 text-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground">Phone</span>
                  </div>
                  <a 
                    href={`tel:${profile.contact_phone}`}
                    className="text-sm text-primary hover:underline"
                  >
                    {profile.contact_phone}
                  </a>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Interests Card */}
      {profile.interests && profile.interests.length > 0 && (
        <Card className="border-border/60">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-foreground">Interests</h3>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {profile.interests.map((interest, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {interest}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Privacy Status Card */}
      <Card className="border-border/60">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Lock className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-foreground">Privacy Status</h3>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="h-3 w-3 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Profile Type</span>
              </div>
              <Badge variant={profile.is_public ? "default" : "secondary"} className="text-xs">
                {profile.is_public ? 'Public' : 'Private'}
              </Badge>
            </div>
            
            {!isOwnProfile && (
              <p className="text-xs text-muted-foreground mt-2">
                Some information may be hidden based on the user's privacy settings.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}