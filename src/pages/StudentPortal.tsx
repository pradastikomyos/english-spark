
import { useState } from 'react';
import { StudentLayout } from '@/components/student/StudentLayout';
import { StudentDashboard } from '@/components/student/StudentDashboard';
import { AssignedQuizzes } from '@/components/student/AssignedQuizzes';
import { QuizResults } from '@/components/student/QuizResults';
import { QuizTaking } from '@/components/student/QuizTaking';
import { Leaderboard } from '@/components/student/Leaderboard';
import { StudyMaterials } from '@/components/student/StudyMaterials';
import { useToast } from '@/hooks/use-toast';

export default function StudentPortal() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);
  const [takingQuiz, setTakingQuiz] = useState(false);
  const { toast } = useToast();

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
      <StudentLayout currentPage={currentPage} onPageChange={setCurrentPage}>
        <QuizTaking
          quizId={selectedQuizId}
          onComplete={handleQuizComplete}
          onBack={handleBackFromQuiz}
        />
      </StudentLayout>
    );
  }  const renderPage = () => {
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
        return <div className="text-center py-8 text-gray-500">Achievements system coming soon...</div>;
      case 'profile':
        return <div className="text-center py-8 text-gray-500">Profile management coming soon...</div>;
      default:
        return <StudentDashboard onStartQuiz={handleStartQuiz} />;
    }
  };

  return (
    <StudentLayout currentPage={currentPage} onPageChange={setCurrentPage}>
      {renderPage()}
    </StudentLayout>
  );
}
