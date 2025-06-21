
import { useState } from 'react';
import { StudentLayout } from '@/components/student/StudentLayout';
import { StudentDashboard } from '@/components/student/StudentDashboard';

export default function StudentPortal() {
  const [currentPage, setCurrentPage] = useState('dashboard');

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <StudentDashboard />;
      case 'quiz':
        return <div className="text-center py-8 text-gray-500">Quiz interface coming soon...</div>;
      case 'leaderboard':
        return <div className="text-center py-8 text-gray-500">Leaderboard coming soon...</div>;
      case 'achievements':
        return <div className="text-center py-8 text-gray-500">Achievements coming soon...</div>;
      case 'profile':
        return <div className="text-center py-8 text-gray-500">Profile coming soon...</div>;
      default:
        return <StudentDashboard />;
    }
  };

  return (
    <StudentLayout currentPage={currentPage} onPageChange={setCurrentPage}>
      {renderPage()}
    </StudentLayout>
  );
}
