
import { useState, useEffect } from 'react';
import { StudentLayout } from '@/components/student/StudentLayout';
import { StudentDashboard } from '@/components/student/StudentDashboard';
import { AssignedQuizzes } from '@/components/student/AssignedQuizzes';
import { QuizResults } from '@/components/student/QuizResults';
import QuizTaking from '@/components/student/QuizTaking';
import { Leaderboard } from '@/components/student/Leaderboard';
import { StudyMaterials } from '@/components/student/StudyMaterials';
import { MaterialViewer } from '@/components/student/MaterialViewer';
import { Achievements } from '@/components/student/Achievements';
import Profile from '@/components/student/Profile';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { QuizReview } from '@/components/student/QuizReview';
import { useNavigate } from 'react-router-dom';

export default function StudentPortal() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);
  const [takingQuiz, setTakingQuiz] = useState(false);
  const [reviewingQuizId, setReviewingQuizId] = useState<string | null>(null);
  const [viewingMaterialId, setViewingMaterialId] = useState<string | null>(null);
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

  const handleFinishQuiz = () => {
    setSelectedQuizId(null);
    setTakingQuiz(false);
    setCurrentPage('results'); // Navigate to results page after finishing quiz
  };

  const handleReviewQuiz = (quizId: string) => {
    setReviewingQuizId(quizId);
  };

  const handleStartMaterial = (materialId: string) => {
    setViewingMaterialId(materialId);
  };

  const handleBackFromMaterial = () => {
    setViewingMaterialId(null);
  };

  const handleBackFromReview = () => {
    setReviewingQuizId(null);
  };

  if (viewingMaterialId) {
    return (
      <StudentLayout
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        isTakingQuiz={false}
      >
        <MaterialViewer materialId={viewingMaterialId} onBack={handleBackFromMaterial} />
      </StudentLayout>
    );
  }

  if (reviewingQuizId) {
    return (
      <StudentLayout
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        isTakingQuiz={false}
      >
        <QuizReview quizId={reviewingQuizId} onBack={handleBackFromReview} />
      </StudentLayout>
    );
  }

  if (takingQuiz && selectedQuizId) {
    return (
      <StudentLayout
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        isTakingQuiz={true}
      >
        <QuizTaking quizId={selectedQuizId} onFinishQuiz={handleFinishQuiz} />
      </StudentLayout>
    );
  }
  
  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <StudentDashboard onStartQuiz={handleStartQuiz} onReviewQuiz={handleReviewQuiz} />;
      case 'assigned':
        return <AssignedQuizzes onStartQuiz={handleStartQuiz} onReviewQuiz={handleReviewQuiz} />;
      case 'results':
        return <QuizResults />;
      case 'leaderboard':
        return <Leaderboard />;
      case 'materials':
        return <StudyMaterials onStartMaterial={handleStartMaterial} />;
      case 'achievements':
        return <Achievements />;
      case 'profile':
        return <Profile />;
      default:
        return <StudentDashboard onStartQuiz={handleStartQuiz} onReviewQuiz={handleReviewQuiz} />;
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
