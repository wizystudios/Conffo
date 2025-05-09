
import { Navigate } from 'react-router-dom';

const Index = () => {
  // This file is not needed as we have a HomePage.tsx already
  // Redirect to the homepage
  return <Navigate to="/" replace />;
};

export default Index;
