
import { useState, useEffect } from 'react';
import { StudentLayout } from '@/components/student/StudentLayout';
import { StudentDashboard } from '@/components/student/StudentDashboard';
import { AssignedQuizzes } from '@/components/student/AssignedQuizzes';
import { QuizResults } from '@/components/student/QuizResults';
import { QuizTaking } from '@/components/student/QuizTaking';
import { Leaderboard } from '@/components/student/Leaderboard';
import { StudyMaterials } from '@/components/student/StudyMaterials';
import { Achievements } from '@/components/student/Achievements';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';

export default function StudentPortal() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);
  const [takingQuiz, setTakingQuiz] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false); // State for sidebar
  const { toast } = useToast();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false); // Auto-close sidebar on page change in mobile
    }
  }, [currentPage, isMobile]);

  const handleStartQuiz = (quizId: string) => {
    setSelectedQuizId(quizId);
    setTakingQuiz(true);
  };

  const handleQuizComplete = (score: number, totalQuestions: number) => {
    toast({
      title: '🎉 Quiz Completed!',
      description: `You scored ${Math.round(score)}%! Great job!`,
    });
    setTakingQuiz(false);
    setCurrentPage('results');
  };

  const handleBackFromQuiz = () => {
    setTakingQuiz(false);
    setSelectedQuizId(null);
  };

  // If taking a quiz, show quiz interface
  if (takingQuiz && selectedQuizId) {
    return (
      <StudentLayout
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        isTakingQuiz={takingQuiz}
      >
        <QuizTaking
          quizId={selectedQuizId}
          onComplete={handleQuizComplete}
          onBack={handleBackFromQuiz}
        />
      </StudentLayout>
    );
  }
  
  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <StudentDashboard onStartQuiz={handleStartQuiz} />;
      case 'assigned':
        return <AssignedQuizzes onStartQuiz={handleStartQuiz} />;
      case 'results':
        return <QuizResults />;
      case 'leaderboard':
        return <Leaderboard />;
      case 'materials':
        return <StudyMaterials />;
      case 'achievements':
        return <Achievements />;
      case 'profile':
        return <div className="text-center py-8 text-gray-500">Profile management coming soon...</div>;
      default:
        return <StudentDashboard onStartQuiz={handleStartQuiz} />;
    }
  };

  return (
    <StudentLayout
      currentPage={currentPage}
      onPageChange={setCurrentPage}
      sidebarOpen={sidebarOpen}
      setSidebarOpen={setSidebarOpen}
      isTakingQuiz={takingQuiz}
    >
      {renderPage()}
    </StudentLayout>
  );
}
