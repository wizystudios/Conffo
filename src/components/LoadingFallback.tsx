export const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-center">
      <img 
        src="/lovable-uploads/911a3176-bd7a-4c2f-8145-9fb902754993.png" 
        alt="Conffo" 
        className="h-16 w-16 object-contain mx-auto mb-4 animate-bounce filter brightness-0 dark:brightness-100 dark:invert"
      />
      <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
      <p className="mt-2 text-sm text-muted-foreground">Loading...</p>
    </div>
  </div>
);