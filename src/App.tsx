
import { useEffect, useState } from 'react';
import { useAuth, AuthProvider } from '@/hooks/useAuth';
import { AuthForm } from '@/components/auth/AuthForm';
import TeacherPortal from '@/pages/TeacherPortal';
import StudentPortal from '@/pages/StudentPortal';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";

const queryClient = new QueryClient();

function AppContent() {
  const { user, userRole, loading } = useAuth();
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  useEffect(() => {
    if (loading) {
      // Set timeout for loading state - reduced to 3 seconds
      const timer = setTimeout(() => {
        setLoadingTimeout(true);
      }, 3000); // 3 seconds timeout instead of 10

      return () => clearTimeout(timer);
    } else {
      setLoadingTimeout(false);
    }
  }, [loading]);

  if (loading && !loadingTimeout) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-green-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Setting up your account...</p>
          <p className="mt-2 text-sm text-gray-500">Please wait while we configure your profile.</p>
        </div>
      </div>
    );
  }

  if (loading && loadingTimeout) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-green-50">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Setup Taking Too Long</h2>
          <p className="text-gray-600 mb-4">Something seems to be stuck. Let's try refreshing.</p>
          <Button onClick={() => window.location.reload()}>
            Refresh Page
          </Button>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthForm />;
  }

  if (userRole === 'teacher') {
    return <TeacherPortal />;
  }

  if (userRole === 'student') {
    return <StudentPortal />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-green-50">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Setting up your account...</h1>
        <p className="text-gray-600">Please wait while we configure your profile.</p>
      </div>
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <AppContent />
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
