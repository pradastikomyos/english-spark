import React from 'react';
import { Button } from '@/components/ui/button';
import { useStudentTour } from '@/hooks/useStudentTour';
import { HelpCircle, RotateCcw } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface TourControlProps {
  variant?: 'icon' | 'button';
  className?: string;
}

export const TourControl: React.FC<TourControlProps> = ({ 
  variant = 'icon', 
  className = '' 
}) => {
  const { restartTour, resetTourStatus, isStudent } = useStudentTour();

  // Only show for students
  if (!isStudent) {
    return null;
  }

  const handleRestartTour = () => {
    restartTour();
  };

  const handleResetAndRestart = () => {
    resetTourStatus();
    setTimeout(() => {
      restartTour();
    }, 100);
  };

  if (variant === 'icon') {
    return (
      <TooltipProvider>
        <div className={`flex gap-2 ${className}`}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRestartTour}
                className="text-gray-500 hover:text-purple-600"
              >
                <HelpCircle className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Mulai Tour Dashboard</p>
            </TooltipContent>
          </Tooltip>
          
          {process.env.NODE_ENV === 'development' && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetAndRestart}
                  className="text-gray-500 hover:text-blue-600"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Reset & Restart Tour (Dev)</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </TooltipProvider>
    );
  }

  return (
    <div className={`flex gap-2 ${className}`}>
      <Button
        variant="outline"
        size="sm"
        onClick={handleRestartTour}
        className="flex items-center gap-2"
      >
        <HelpCircle className="h-4 w-4" />
        Tour Dashboard
      </Button>
      
      {process.env.NODE_ENV === 'development' && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleResetAndRestart}
          className="flex items-center gap-2"
        >
          <RotateCcw className="h-4 w-4" />
          Reset Tour
        </Button>
      )}
    </div>
  );
};
