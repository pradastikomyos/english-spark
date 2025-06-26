
import { useState, useEffect } from 'react';
import { TeacherLayout } from '@/components/teacher/TeacherLayout';
import { TeacherDashboard } from '@/components/teacher/TeacherDashboard';
import { StudentsManagement } from '@/components/teacher/StudentsManagement';
import { QuizManagement } from '../../loveable-english-spark/src/components/teacher/QuizManagement';
import { QuizAssignment } from '@/components/teacher/QuizAssignment';
import { useIsMobile } from '@/hooks/use-mobile';

export default function TeacherPortal() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false); // State for sidebar
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false); // Auto-close sidebar on page change in mobile
    }
  }, [currentPage, isMobile]);

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <TeacherDashboard />;
      case 'students':
        return <StudentsManagement />;
      case 'quizzes':
        return <QuizManagement />;
      case 'assignment':
        return <QuizAssignment />;
      case 'reports':
        return <div className="text-center py-8 text-gray-500">Reports coming soon...</div>;
      case 'settings':
        return <div className="text-center py-8 text-gray-500">Settings coming soon...</div>;
      default:
        return <TeacherDashboard />;
    }
  };

  return (
    <TeacherLayout
      currentPage={currentPage}
      onPageChange={setCurrentPage}
      sidebarOpen={sidebarOpen}
      setSidebarOpen={setSidebarOpen}
    >
      {renderPage()}
    </TeacherLayout>
  );
}
