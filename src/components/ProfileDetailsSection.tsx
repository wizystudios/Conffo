import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { MapPin, Globe, Calendar, Mail, Phone, Heart, Ban } from 'lucide-react';
import { format } from 'date-fns';

interface ProfileDetailsSectionProps {
  userId: string;
  isBlocked?: boolean;
}

interface UserProfile {
  bio: string | null;
  website: string | null;
  location: string | null;
  gender: string | null;
  date_of_birth: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  interests: string[] | null;
}

export function ProfileDetailsSection({ userId, isBlocked }: ProfileDetailsSectionProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select(`
            bio,
            website,
            location,
            gender,
            date_of_birth,
            contact_email,
            contact_phone,
            interests
          `)
          .eq('id', userId)
          .single();

        if (!error && data) {
          setProfile(data);
        }
      } catch (error) {
        console.error('Error fetching profile details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [userId]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-2 mt-3">
        <div className="h-3 bg-muted rounded w-3/4"></div>
        <div className="h-3 bg-muted rounded w-1/2"></div>
      </div>
    );
  }

  if (!profile) return null;

  const hasDetails = profile.website || profile.location || profile.date_of_birth || 
                     profile.contact_email || profile.contact_phone || 
                     (profile.interests && profile.interests.length > 0);

  if (!hasDetails) return null;

  return (
    <div className="mt-3 space-y-2 text-sm">
      {/* Blocked Badge */}
      {isBlocked && (
        <div className="flex items-center gap-1 text-destructive">
          <Ban className="h-3 w-3" />
          <span className="text-xs font-medium">Blocked</span>
        </div>
      )}

      {/* Website */}
      {profile.website && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Globe className="h-3 w-3 flex-shrink-0" />
          <a 
            href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline truncate text-xs"
          >
            {profile.website.replace(/^https?:\/\//, '')}
          </a>
        </div>
      )}

      {/* Location */}
      {profile.location && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <MapPin className="h-3 w-3 flex-shrink-0" />
          <span className="text-xs">{profile.location}</span>
        </div>
      )}

      {/* Birth Date */}
      {profile.date_of_birth && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="h-3 w-3 flex-shrink-0" />
          <span className="text-xs">{format(new Date(profile.date_of_birth), 'MMM dd')}</span>
        </div>
      )}

      {/* Contact Info */}
      <div className="flex flex-wrap gap-3">
        {profile.contact_email && (
          <a 
            href={`mailto:${profile.contact_email}`}
            className="flex items-center gap-1 text-muted-foreground hover:text-primary text-xs"
          >
            <Mail className="h-3 w-3" />
            <span className="truncate max-w-[120px]">{profile.contact_email}</span>
          </a>
        )}
        
        {profile.contact_phone && (
          <a 
            href={`tel:${profile.contact_phone}`}
            className="flex items-center gap-1 text-muted-foreground hover:text-primary text-xs"
          >
            <Phone className="h-3 w-3" />
            <span>{profile.contact_phone}</span>
          </a>
        )}
      </div>

      {/* Interests */}
      {profile.interests && profile.interests.length > 0 && (
        <div className="flex items-start gap-2">
          <Heart className="h-3 w-3 flex-shrink-0 text-muted-foreground mt-0.5" />
          <div className="flex flex-wrap gap-1">
            {profile.interests.slice(0, 5).map((interest, index) => (
              <Badge 
                key={index} 
                variant="secondary" 
                className="text-[10px] px-1.5 py-0 h-5"
              >
                {interest}
              </Badge>
            ))}
            {profile.interests.length > 5 && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">
                +{profile.interests.length - 5}
              </Badge>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
