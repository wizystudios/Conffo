
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import HomePage from "./HomePage";

const Index = () => {
  const [queryClient] = useState(() => new QueryClient());
  
  return (
    <QueryClientProvider client={queryClient}>
      <HomePage />
    </QueryClientProvider>
  );
};

export default Index;
