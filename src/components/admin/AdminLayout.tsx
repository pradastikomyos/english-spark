import React, { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { LogOut } from 'lucide-react';

interface AdminLayoutProps {
  children: ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-2xl font-bold text-gray-900">Admin Portal</h1>
            <Button variant="ghost" size="icon" onClick={signOut}>
              <LogOut className="h-5 w-5" />
              <span className="sr-only">Sign Out</span>
            </Button>
          </div>
        </div>
      </header>
      <main className="p-8">
        {children}
      </main>
    </div>
  );
};

export default AdminLayout;
