
import { useState } from 'react';
import { TeacherLayout } from '@/components/teacher/TeacherLayout';
import { TeacherDashboard } from '@/components/teacher/TeacherDashboard';
import { StudentsManagement } from '@/components/teacher/StudentsManagement';
import { QuizManagement } from '@/components/teacher/QuizManagement';
import { QuizAssignment } from '@/components/teacher/QuizAssignment';

export default function TeacherPortal() {
  const [currentPage, setCurrentPage] = useState('dashboard');
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
    <TeacherLayout currentPage={currentPage} onPageChange={setCurrentPage}>
      {renderPage()}
    </TeacherLayout>
  );
}
