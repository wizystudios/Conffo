export const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-center">
      <img 
        src="/lovable-uploads/d4fd9efb-43e0-4330-ab14-b265b0098be2.png" 
        alt="Conffo" 
        className="h-16 w-16 object-contain mx-auto mb-4 animate-bounce"
      />
      <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
      <p className="mt-2 text-sm text-muted-foreground">Loading...</p>
    </div>
  </div>
);