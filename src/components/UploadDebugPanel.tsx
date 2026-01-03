import { useState } from 'react';
import { ChevronDown, ChevronUp, Check, X, Loader2, Upload, Database, Link } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface UploadStatus {
  fileName: string;
  fileSize: number;
  status: 'pending' | 'uploading' | 'uploaded' | 'db_inserting' | 'complete' | 'error';
  storagePath?: string;
  publicUrl?: string;
  error?: string;
  dbInserted?: boolean;
}

interface UploadDebugPanelProps {
  uploads: UploadStatus[];
  isVisible: boolean;
  onToggle: () => void;
}

export function UploadDebugPanel({ uploads, isVisible, onToggle }: UploadDebugPanelProps) {
  if (uploads.length === 0) return null;

  const completedCount = uploads.filter(u => u.status === 'complete').length;
  const errorCount = uploads.filter(u => u.status === 'error').length;
  const hasErrors = errorCount > 0;

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-card text-card-foreground">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 bg-muted/50 hover:bg-muted transition-colors"
      >
        <div className="flex items-center gap-2 text-sm font-medium">
          <Upload className="h-4 w-4" />
          <span>Upload Debug</span>
          <span className={cn(
            "px-2 py-0.5 rounded-full text-xs",
            hasErrors ? "bg-destructive/20 text-destructive" : "bg-primary/20 text-primary"
          )}>
            {completedCount}/{uploads.length}
          </span>
        </div>
        {isVisible ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {isVisible && (
        <div className="p-3 space-y-2 max-h-64 overflow-y-auto">
          {uploads.map((upload, index) => (
            <div key={index} className="text-xs p-2 bg-muted/30 rounded border border-border/50">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium truncate max-w-[150px]">{upload.fileName}</span>
                <StatusIcon status={upload.status} />
              </div>
              
              <div className="text-muted-foreground space-y-0.5">
                <div className="flex items-center gap-1">
                  <span>Size:</span>
                  <span>{formatBytes(upload.fileSize)}</span>
                </div>
                
                {upload.storagePath && (
                  <div className="flex items-center gap-1">
                    <Link className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">{upload.storagePath}</span>
                  </div>
                )}
                
                {upload.dbInserted !== undefined && (
                  <div className="flex items-center gap-1">
                    <Database className="h-3 w-3 flex-shrink-0" />
                    <span>DB Insert: {upload.dbInserted ? '✓' : '✗'}</span>
                  </div>
                )}
                
                {upload.error && (
                  <div className="text-destructive mt-1 p-1 bg-destructive/10 rounded">
                    {upload.error}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusIcon({ status }: { status: UploadStatus['status'] }) {
  switch (status) {
    case 'pending':
      return <span className="text-muted-foreground">Pending</span>;
    case 'uploading':
      return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
    case 'uploaded':
      return <span className="text-primary">Uploaded</span>;
    case 'db_inserting':
      return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
    case 'complete':
      return <Check className="h-4 w-4 text-green-500" />;
    case 'error':
      return <X className="h-4 w-4 text-destructive" />;
    default:
      return null;
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
