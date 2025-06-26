import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  ArrowRight, 
  ArrowLeft,
  Timer,
  Target,
  Trophy,
  RotateCcw,
  AlertTriangle
} from 'lucide-react';

interface Quiz {
  id: string;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  time_limit: number;
  points_per_question: number;
  status: 'open' | 'closed'; // Add status to Quiz interface
}

interface Question {
  id: string;
  question_text: string;
  options?: Record<string, string>; // Modern format
  option_a?: string; // Legacy format
  option_b?: string; // Legacy format
  option_c?: string; // Legacy format
  option_d?: string; // Legacy format
  correct_answer: string;
  explanation?: string;
  points: number;
  difficulty: 'easy' | 'medium' | 'hard';
  question_order?: number;
}

interface QuizTakingProps {
  quizId: string;
  onComplete: (score: number, totalQuestions: number) => void;
  onBack: () => void;
}

export function QuizTaking({ quizId, onComplete, onBack }: QuizTakingProps): JSX.Element {
  const { profileId } = useAuth();
  const { toast } = useToast();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [isStarted, setIsStarted] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showResults, setShowResults] = useState(false);
  const [totalPoints, setTotalPoints] = useState(0);
  const [pointsByDifficulty, setPointsByDifficulty] = useState({ easy: 0, medium: 0, hard: 0 });

  useEffect(() => {
    fetchQuizData();
  }, [quizId]);

  // Timer effect
  useEffect(() => {
    if (isStarted && timeLeft > 0 && !isCompleted) {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleTimeUp();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }  }, [isStarted, timeLeft, isCompleted]);

  const fetchQuizData = async () => {
    try {
      setLoading(true);

      // Fetch quiz details
      const { data: quizData, error: quizError } = await supabase
        .from('quizzes')
        .select('*, status') // Explicitly select status
        .eq('id', quizId)
        .single();

      if (quizError) throw quizError;

      if (quizData.status === 'closed') {
        toast({
          title: 'Quiz Closed',
          description: 'This quiz is currently closed and cannot be taken.',
          variant: 'destructive',
        });
        setLoading(false);
        onBack(); // Go back to the previous page
        return;
      }

      // Fetch questions
      const { data: questionsData, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .eq('quiz_id', quizId)
        .order('question_order', { ascending: true });

      if (questionsError) throw questionsError;

      setQuiz(quizData as Quiz);
      setQuestions((questionsData as unknown as Question[]) || []);
      setTimeLeft(quizData.time_limit);
    } catch (error: any) {
      console.error('Error fetching quiz:', error);
      toast({
        title: 'Error',
        description: 'Failed to load quiz',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTimeUp = useCallback(() => {
    toast({
      title: '⏰ Time\'s Up!',
      description: 'Quiz completed automatically',
      variant: 'destructive',
    });
    submitQuiz();
  }, []);

  const startQuiz = () => {
    setIsStarted(true);
    toast({
      title: '🚀 Quiz Started!',
      description: 'Good luck! You\'ve got this!',
    });
  };

  const handleAnswerSelect = (questionId: string, answer: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const navigateQuestion = (direction: 'next' | 'prev') => {
    if (direction === 'next' && currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else if (direction === 'prev' && currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const submitQuiz = async () => {
    try {
      setIsCompleted(true);
      
      let correctAnswers = 0;
      const pointsBreakdown = { easy: 0, medium: 0, hard: 0 };
      let totalPointsEarned = 0;

      questions.forEach(question => {
        const userAnswer = answers[question.id];
        const isCorrect = userAnswer === question.correct_answer;
        if (isCorrect) {
          correctAnswers++;
          const points = question.points;
          const difficulty = question.difficulty;
          totalPointsEarned += points;
          if (pointsBreakdown.hasOwnProperty(difficulty)) {
            pointsBreakdown[difficulty] += points;
          }
        }
      });

      const totalScore = questions.length > 0 ? Math.round((correctAnswers / questions.length) * 100) : 0;
      
      setScore(totalScore);
      setTotalPoints(totalPointsEarned);
      setPointsByDifficulty(pointsBreakdown);

      // Save to database
      const { error } = await supabase
        .from('user_progress')
        .insert({
          student_id: profileId,
          quiz_id: quizId,
          score: totalScore,
          total_questions: questions.length,
          time_taken: quiz!.time_limit - timeLeft,
        });

      if (error) throw error;

      // Update student points
      const { data: student } = await supabase
        .from('students')
        .select('total_points, level')
        .eq('id', profileId)
        .single();

      if (student) {
        const newTotalPoints = (student.total_points || 0) + totalPointsEarned;
        const newLevel = Math.floor(newTotalPoints / 100) + 1;

        await supabase
          .from('students')
          .update({
            total_points: newTotalPoints,
            level: newLevel,
          })
          .eq('id', profileId);
      }

      setShowResults(true);
      
      toast({
        title: '🎉 Quiz Completed!',
        description: `You scored ${totalScore.toFixed(0)}% and earned ${totalPointsEarned} points!`,
      });

    } catch (error: any) {
      console.error('Error submitting quiz:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit quiz',
        variant: 'destructive',
      });
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getProgressPercentage = () => {
    if (questions.length === 0) return 0;
    return ((currentQuestionIndex + 1) / questions.length) * 100;
  };

  const getAnsweredCount = () => {
    return Object.keys(answers).length;
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading quiz...</p>
      </div>
    );
  }

  if (!quiz || questions.length === 0) {
    return (
      <Card className="p-8 text-center">
        <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Quiz Not Available</h3>
        <p className="text-gray-600 mb-4">This quiz doesn't have any questions yet.</p>
        <Button onClick={onBack}>Go Back</Button>
      </Card>
    );
  }

  // Results View
  if (showResults) {
    return (
      <div className="space-y-6">
        <Card className="bg-gradient-to-r from-green-500 to-blue-500 text-white">
          <CardContent className="p-8 text-center">
            <Trophy className="h-16 w-16 mx-auto mb-4" />
            <h1 className="text-3xl font-bold mb-2">Quiz Completed! 🎉</h1>
            <p className="text-xl">You scored {score.toFixed(0)}%</p>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="text-center">
              <Target className="h-8 w-8 mx-auto text-blue-500" />
              <CardTitle>Score</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className="text-3xl font-bold text-blue-600">
                {score.toFixed(0)}%
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="text-center">
              <CheckCircle className="h-8 w-8 mx-auto text-green-500" />
              <CardTitle>Correct</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className="text-3xl font-bold text-green-600">
                {Math.round((score / 100) * questions.length)} / {questions.length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="text-center">
              <Clock className="h-8 w-8 mx-auto text-purple-500" />
              <CardTitle>Time Used</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className="text-3xl font-bold text-purple-600">
                {formatTime(quiz.time_limit - timeLeft)}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Points Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-2 text-gray-600">
                <Badge className={getDifficultyColor('easy')}>Easy</Badge>
                <span>Points Earned</span>
              </span>
              <span className="font-semibold text-green-600">{pointsByDifficulty.easy}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-2 text-gray-600">
                <Badge className={getDifficultyColor('medium')}>Medium</Badge>
                <span>Points Earned</span>
              </span>
              <span className="font-semibold text-yellow-600">{pointsByDifficulty.medium}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-2 text-gray-600">
                <Badge className={getDifficultyColor('hard')}>Hard</Badge>
                <span>Points Earned</span>
              </span>
              <span className="font-semibold text-red-600">{pointsByDifficulty.hard}</span>
            </div>
            <div className="border-t pt-3 mt-3 flex justify-between items-center">
              <span className="font-bold text-gray-800">Total Points Earned</span>
              <span className="font-bold text-xl text-blue-600">{totalPoints}</span>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-center gap-4">
          <Button onClick={onBack} variant="outline">
            Back to Dashboard
          </Button>
          <Button onClick={() => onComplete(score, questions.length)}>
            Continue Learning
          </Button>
        </div>
      </div>
    );
  }

  // Pre-start view
  if (!isStarted) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">{quiz.title}</CardTitle>
                <CardDescription className="mt-2">{quiz.description}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Target className="h-5 w-5 text-blue-500" />
                  <span className="font-semibold">Questions</span>
                </div>
                <p className="text-2xl font-bold text-blue-600">{questions.length}</p>
              </div>
              
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Timer className="h-5 w-5 text-orange-500" />
                  <span className="font-semibold">Time Limit</span>
                </div>
                <p className="text-2xl font-bold text-orange-600">{formatTime(quiz.time_limit)}</p>
              </div>
              
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Trophy className="h-5 w-5 text-green-500" />
                  <span className="font-semibold">Points</span>
                </div>
                <p className="text-2xl font-bold text-green-600">{quiz.points_per_question} each</p>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-blue-900 mb-2">📋 Instructions:</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Read each question carefully</li>
                <li>• Select the best answer from the options</li>
                <li>• You can navigate between questions</li>
                <li>• Submit when you're ready or time runs out</li>
              </ul>
            </div>

            <div className="flex justify-between">
            <Button variant="outline" onClick={onBack} className="px-6 py-3 text-base">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Back
            </Button>
            <Button onClick={startQuiz} className="bg-green-600 hover:bg-green-700 px-6 py-3 text-base">
                <Timer className="h-4 w-4 mr-2" />
                Start Quiz
            </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Quiz taking view
  const currentQuestion = questions[currentQuestionIndex];

  return (
    <div className="space-y-6">
      {/* Quiz Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            {quiz.title}
            <Badge className={`${getDifficultyColor(currentQuestion.difficulty)} ml-2`}>
              {currentQuestion.difficulty} ({currentQuestion.points} points)
            </Badge>
          </CardTitle>
              <CardDescription>
                Question {currentQuestionIndex + 1} of {questions.length}
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="flex items-center justify-end gap-2 mb-1">
                <Clock className={`h-6 w-6 ${timeLeft < 60 ? 'text-red-500' : 'text-blue-500'}`} />
                <span className={`text-xl font-bold ${timeLeft < 60 ? 'text-red-500' : 'text-blue-600'}`}>
                  {formatTime(timeLeft)}
                </span>
              </div>
              <p className="text-sm text-gray-600">
                {getAnsweredCount()} / {questions.length} answered
              </p>
            </div>
          </div>
          <Progress value={getProgressPercentage()} className="h-3 mt-4" />
        </CardHeader>
      </Card>

      {/* Current Question */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">
            {currentQuestion.question_text}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={answers[currentQuestion.id] || ''}
            onValueChange={(value) => handleAnswerSelect(currentQuestion.id, value)}
            className="space-y-4"
          >
            {currentQuestion.options && Object.keys(currentQuestion.options).length > 0 ? (
              // New format: Render from 'options' JSON
              Object.entries(currentQuestion.options).map(([key, value]) => (
                <div key={key} className="flex items-center space-x-3">
                  <RadioGroupItem value={key} id={`${currentQuestion.id}-${key}`} className="h-5 w-5" />
                  <Label htmlFor={`${currentQuestion.id}-${key}`} className="flex-1 cursor-pointer p-4 rounded-lg border text-lg hover:bg-gray-50 transition-colors">
                    <span className="font-semibold mr-2">{key}.</span>
                    {value}
                  </Label>
                </div>
              ))
            ) : (
              // Old format: Render from separate option fields
              [
                { value: 'A', text: currentQuestion.option_a },
                { value: 'B', text: currentQuestion.option_b },
                { value: 'C', text: currentQuestion.option_c },
                { value: 'D', text: currentQuestion.option_d },
              ].map((option) => (
                option.text && (
                  <div key={option.value} className="flex items-center space-x-3">
                    <RadioGroupItem value={option.value} id={`${currentQuestion.id}-${option.value}`} className="h-5 w-5" />
                    <Label htmlFor={`${currentQuestion.id}-${option.value}`} className="flex-1 cursor-pointer p-4 rounded-lg border text-lg hover:bg-gray-50 transition-colors">
                      <span className="font-semibold mr-2">{option.value}.</span>
                      {option.text}
                    </Label>
                  </div>
                )
              ))
            )}
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => navigateQuestion('prev')}
          disabled={currentQuestionIndex === 0}
          className="px-6 py-3 text-base"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>

        <div className="flex gap-2">
          {currentQuestionIndex === questions.length - 1 ? (
            <Button 
              onClick={submitQuiz}
              className="bg-green-600 hover:bg-green-700 px-6 py-3 text-base"
              disabled={getAnsweredCount() === 0}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Submit Quiz
            </Button>
          ) : (
            <Button
              onClick={() => navigateQuestion('next')}
              disabled={currentQuestionIndex === questions.length - 1}
              className="px-6 py-3 text-base"
            >
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>

      {/* Question Overview */}
      <Card>
        <CardHeader className="px-4 py-2"> {/* Adjusted padding */}
          <CardTitle className="text-base">Question Overview</CardTitle> {/* Increased font size */}
        </CardHeader>
        <CardContent className="px-4 pt-2"> {/* Adjusted padding */}
          <div className="flex flex-wrap gap-2">
            {questions.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentQuestionIndex(index)}
                className={`w-9 h-9 rounded-lg text-base font-semibold transition-colors flex items-center justify-center
                  ${
                    index === currentQuestionIndex
                      ? 'bg-blue-600 text-white shadow-lg'
                      : answers[questions[index].id]
                      ? 'bg-green-100 text-green-800 border border-green-300 hover:bg-green-200'
                      : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
                  }`}
              >
                {index + 1}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
