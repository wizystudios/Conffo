import { ReactNode, useState } from 'react';
import { Search, MoreVertical } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

export interface WATab {
  id: string;
  label: string;
  badge?: boolean;
}

interface WAPageHeaderProps {
  title: string;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (v: string) => void;
  onSearchClick?: () => void; // if provided, search becomes a button
  tabs?: WATab[];
  activeTab?: string;
  onTabChange?: (id: string) => void;
  rightSlot?: ReactNode;
  showAvatarChip?: boolean;
}

export function WAPageHeader({
  title,
  searchPlaceholder = 'Search',
  searchValue,
  onSearchChange,
  onSearchClick,
  tabs,
  activeTab,
  onTabChange,
  rightSlot,
  showAvatarChip = true,
}: WAPageHeaderProps) {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  return (
    <div className="sticky top-0 z-20 bg-background">
      {/* Top row: avatar chip / title row */}
      {showAvatarChip && isAuthenticated && user && (
        <div className="flex justify-end items-center px-4 pt-3">
          <button
            onClick={() => navigate('/profile')}
            className="flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-full bg-muted/60"
          >
            <Avatar className="h-7 w-7">
              <AvatarImage src={user.avatarUrl || ''} />
              <AvatarFallback className="text-[10px]">
                {user.username?.charAt(0)?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--primary))" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
      )}

      {/* Title row */}
      <div className="flex items-center justify-between px-4 pt-2 pb-3">
        <h1 className="text-[28px] font-bold leading-tight tracking-tight">{title}</h1>
        <div className="flex items-center gap-1">
          {rightSlot}
          <button className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-muted/60">
            <MoreVertical className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Search pill */}
      <div className="px-4 pb-3">
        {onSearchClick ? (
          <button
            onClick={onSearchClick}
            className="w-full flex items-center gap-3 h-11 px-4 rounded-full bg-muted/60 text-muted-foreground text-[15px]"
          >
            <Search className="h-[18px] w-[18px]" />
            <span>{searchPlaceholder}</span>
          </button>
        ) : (
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-muted-foreground" />
            <input
              value={searchValue || ''}
              onChange={(e) => onSearchChange?.(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full h-11 pl-11 pr-4 rounded-full bg-muted/60 text-[15px] placeholder:text-muted-foreground outline-none border-0 focus:ring-0"
            />
          </div>
        )}
      </div>

      {/* Tab strip with green underline */}
      {tabs && tabs.length > 0 && (
        <div className="flex items-center gap-7 px-5 border-b border-border/40">
          {tabs.map((t) => {
            const active = t.id === activeTab;
            return (
              <button
                key={t.id}
                onClick={() => onTabChange?.(t.id)}
                className="relative py-2.5 flex items-center gap-1"
              >
                <span className={`text-[15px] font-semibold ${active ? 'text-primary' : 'text-muted-foreground'}`}>
                  {t.label}
                </span>
                {t.badge && (
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                )}
                {active && (
                  <span className="absolute left-0 right-0 -bottom-px h-[3px] rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface WAFabProps {
  onClick: () => void;
  icon?: ReactNode;
  label?: string;
}

export function WAFab({ onClick, icon, label = 'Action' }: WAFabProps) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="fixed bottom-20 right-4 z-30 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center active:scale-95 transition-transform"
    >
      {icon}
    </button>
  );
}
