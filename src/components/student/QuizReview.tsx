import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, CheckCircle, XCircle } from 'lucide-react';

interface QuizReviewProps {
  quizId: string;
  onBack: () => void;
}

interface Answer {
  question_id: string;
  selected_option: string;
  is_correct: boolean;
  question_text: string;
  options: Record<string, string>;
  correct_answer: string;
  explanation: string | null;
}

interface ReviewData {
  score: number;
  total_questions: number;
  time_taken: number;
  completed_at: string;
  quiz_title: string;
  answers: Answer[];
}

export function QuizReview({ quizId, onBack }: QuizReviewProps) {
  const { userId } = useAuth();
  const [reviewData, setReviewData] = useState<ReviewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId && quizId) {
      fetchReviewData();
    }
  }, [userId, quizId]);

  const fetchReviewData = async () => {
    try {
      setLoading(true);

      const { data: progressData, error: progressError } = await supabase
        .from('user_progress')
        .select('*, quizzes(title)')
        .eq('user_id', userId)
        .eq('quiz_id', quizId)
        .order('completed_at', { ascending: false })
        .limit(1)
        .single();

      if (progressError) {
        // It's possible there's no progress yet, so don't throw, just return.
        if (progressError.code === 'PGRST116') {
          console.log('No progress found for this quiz yet.');
          setReviewData(null);
        } else {
          throw progressError;
        }
        return; 
      }

      if (progressError) throw progressError;

      const { data: answersData, error: answersError } = await supabase
        .from('user_answers' as any)
        .select('*, questions!inner(question_text, options, correct_answer, explanation)')
        .eq('user_progress_id', progressData.id);

      if (answersError) throw answersError;

      setReviewData({
        score: progressData.score,
        total_questions: progressData.total_questions,
        time_taken: progressData.time_taken,
        completed_at: progressData.completed_at,
        quiz_title: (progressData.quizzes as any).title,
        answers: (answersData as any[]).map(a => ({
          question_id: a.question_id,
          selected_option: a.selected_option,
          is_correct: a.is_correct,
          question_text: a.questions.question_text,
          options: a.questions.options as Record<string, string>,
          correct_answer: a.questions.correct_answer,
          explanation: a.questions.explanation,
        })),
      });

    } catch (error: any) {
      console.error('Error fetching review data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-4">Loading review...</div>;
  if (!reviewData) return <div className="p-4">Could not load review data.</div>;

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <Button onClick={onBack} variant="ghost" className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Dashboard
      </Button>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-2xl">Review: {reviewData.quiz_title}</CardTitle>
          <CardDescription>
            Completed on {new Date(reviewData.completed_at).toLocaleString()}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Score</p>
                <p className="text-2xl font-bold">{reviewData.score}%</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Time Taken</p>
                <p className="text-2xl font-bold">{reviewData.time_taken}s</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Correct Answers</p>
                <p className="text-2xl font-bold">{reviewData.answers.filter(a => a.is_correct).length} / {reviewData.total_questions}</p>
            </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {reviewData.answers.map((answer, index) => (
          <Card key={answer.question_id}>
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                {answer.is_correct ? (
                  <CheckCircle className="mr-2 h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="mr-2 h-5 w-5 text-red-500" />
                )}
                Question {index + 1}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-semibold mb-4 text-base">{answer.question_text}</p>
              <div className="space-y-2">
                {Object.entries(answer.options).map(([key, value]) => {
                  const isSelected = key === answer.selected_option;
                  const isCorrect = key === answer.correct_answer;
                  
                  let optionStyle = 'border-gray-200';
                  if (isCorrect) {
                    optionStyle = 'border-green-500 bg-green-50';
                  }
                  if (isSelected && !isCorrect) {
                    optionStyle = 'border-red-500 bg-red-50';
                  }

                  return (
                    <div key={key} className={`flex items-center p-3 rounded-lg border ${optionStyle}`}>
                      <span className="font-semibold mr-3">{key}.</span>
                      <span className="flex-1">{value}</span>
                      {isSelected && (
                        <Badge variant={isCorrect ? 'default' : 'destructive'} className="ml-auto">
                          Your Answer
                        </Badge>
                      )}
                      {!isSelected && isCorrect && (
                        <Badge variant="secondary" className="ml-auto">
                          Correct Answer
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
              {answer.explanation && (
                <div className="mt-4 p-3 bg-blue-50 border-l-4 border-blue-400 text-blue-800 rounded-r-lg">
                  <p className="font-semibold">Explanation</p>
                  <p>{answer.explanation}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
