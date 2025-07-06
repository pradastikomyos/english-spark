import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useStudentTour } from '@/hooks/useStudentTour';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { X, BookOpen, PlayCircle } from 'lucide-react';

export const FirstTimeWelcome: React.FC = () => {
  const { user, role } = useAuth();
  const { isFirstTimeStudent, restartTour } = useStudentTour();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Show welcome message for first-time students
    if (role === 'student' && isFirstTimeStudent) {
      // Small delay to ensure the dashboard is loaded
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [role, isFirstTimeStudent]);

  const handleStartTour = () => {
    setIsVisible(false);
    // Small delay before starting tour to allow welcome card to disappear
    setTimeout(() => {
      restartTour();
    }, 300);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    // Mark tour as completed when dismissed
    localStorage.setItem('studentTourCompleted', 'true');
    if (user?.id) {
      localStorage.setItem(`studentTour_${user.id}`, 'true');
    }
  };

  if (!isVisible || role !== 'student') {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md">
      <Card className="shadow-lg border-l-4 border-l-purple-500 bg-gradient-to-br from-purple-50 to-blue-50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <CardTitle className="text-lg text-purple-800">
                  Selamat datang! 🎉
                </CardTitle>
                <CardDescription className="text-purple-600">
                  Pertama kali di English Spark?
                </CardDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="text-purple-500 hover:text-purple-700 hover:bg-purple-100"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <Alert className="border-purple-200 bg-white/60">
            <AlertDescription className="text-purple-700">
              Yuk, kenalan dulu dengan semua fitur dashboard kamu! 
              Tour interaktif ini akan memandu kamu memahami cara 
              menggunakan English Spark dengan maksimal.
            </AlertDescription>
          </Alert>
          
          <div className="flex gap-2 mt-4">
            <Button 
              onClick={handleStartTour}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
            >
              <PlayCircle className="h-4 w-4 mr-2" />
              Mulai Tour
            </Button>
            <Button 
              variant="outline" 
              onClick={handleDismiss}
              className="px-4 border-purple-300 text-purple-600 hover:bg-purple-50"
            >
              Nanti aja
            </Button>
          </div>
          
          <p className="text-xs text-purple-500 mt-2 text-center">
            💡 Kamu bisa mengulang tour kapan saja dari menu di pojok kanan atas
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
