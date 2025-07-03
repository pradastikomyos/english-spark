import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';

// Define types for our data
interface Question {
  id: string;
  text: string;
  media_url: string | null;
  options: Record<string, string>;
  points: number;
  correct_answer: string;
  explanation: string | null;
}

interface Quiz {
    title: string;
    description: string;
}

const QuizTaking = () => {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<{ [key: string]: string }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoomedImageUrl, setZoomedImageUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchQuizData = async () => {
      if (!quizId) return;
      setIsLoading(true);
      try {
        // Fetch quiz details
        const { data: quizData, error: quizError } = await supabase
            .from('quizzes')
            .select('title, description')
            .eq('id', quizId)
            .single();

        if (quizError) throw quizError;
        setQuiz(quizData);

        // Fetch questions and their options
        const { data: questionsData, error: questionsError } = await supabase
          .from('questions')
          .select('id, text, media_url, points, options, correct_answer, explanation')
          .eq('quiz_id', quizId);

        if (questionsError) throw questionsError;
        setQuestions(questionsData || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuizData();
  }, [quizId]);

  const handleAnswerChange = (questionId: string, optionId: string) => {
    setSelectedAnswers(prev => ({ ...prev, [questionId]: optionId }));
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated.');
      }

      let correctAnswersCount = 0;
      let totalScore = 0;
      const userAnswersToInsert = [];

      for (const question of questions) {
        const selectedOptionId = selectedAnswers[question.id];
        const isCorrect = selectedOptionId === question.correct_answer;

        if (isCorrect) {
          correctAnswersCount++;
          totalScore += question.points;
        }

        userAnswersToInsert.push({
          user_id: user.id,
          question_id: question.id,
          selected_option: selectedOptionId,
          is_correct: isCorrect,
        });
      }

      // Calculate score percentage
      const scorePercentage = questions.length > 0 ? (correctAnswersCount / questions.length) * 100 : 0;

      // Get current time for time_taken (assuming you start a timer when quiz begins)
      // For now, let's use a placeholder or calculate based on a start time if available
      const timeTaken = 0; // TODO: Implement actual time tracking

      // Insert user progress
      const { data: progressData, error: progressError } = await supabase
        .from('user_progress')
        .insert({
          user_id: user.id,
          quiz_id: quizId,
          score: scorePercentage,
          total_questions: questions.length,
          correct_answers: correctAnswersCount,
          time_taken: timeTaken, // Placeholder
          completed_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (progressError) throw progressError;

      // Link user answers to the progress entry
      const answersWithProgressId = userAnswersToInsert.map(answer => ({
        ...answer,
        user_progress_id: progressData.id,
      }));

      const { error: insertAnswersError } = await supabase
        .from('user_answers')
        .insert(answersWithProgressId);

      if (insertAnswersError) throw insertAnswersError;

      // Navigate to quiz results page
      navigate(`/student/quiz-results/${quizId}`);

    } catch (err: any) {
      setError(err.message);
      console.error('Submission error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) return <div className="p-4">Loading quiz...</div>;
  if (error) return <div className="p-4 text-red-500">Error: {error}</div>;
  if (!quiz || questions.length === 0) return <div className="p-4">Quiz not found or has no questions.</div>;

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  const renderMedia = (url: string) => {
    // YouTube video
    const youtubeRegex = /(?:https?):\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const youtubeMatch = url.match(youtubeRegex);

    if (youtubeMatch && youtubeMatch[1]) {
      const videoId = youtubeMatch[1];
      return (
        <div className="relative my-4" style={{ paddingBottom: '56.25%', height: 0 }}>
          <iframe
            src={`https://www.youtube.com/embed/${videoId}`}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title="Embedded YouTube video"
            className="absolute top-0 left-0 w-full h-full rounded-md"
          ></iframe>
        </div>
      );
    }

    // Image
    const isImage = /\.(jpeg|jpg|gif|png)$/i.test(url);
    if (isImage) {
      return (
        <img
          src={url}
          alt="Question media"
          className="max-w-sm mx-auto my-4 rounded-md cursor-pointer transition-transform duration-200 hover:scale-105"
          onClick={() => setZoomedImageUrl(url)}
        />
      );
    }

    // Audio
    const isAudio = /\.(mp3|wav|ogg)$/i.test(url);
    if (isAudio) {
      return <audio controls src={url} className="w-full my-4">Your browser does not support the audio element.</audio>;
    }

    return null;
  };

    return (
    <div className="container mx-auto p-4 max-w-2xl">
      {zoomedImageUrl && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
          onClick={() => setZoomedImageUrl(null)}
        >
          <img
            src={zoomedImageUrl}
            alt="Zoomed media"
            className="max-w-[90vw] max-h-[90vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setZoomedImageUrl(null)}
            className="absolute top-4 right-4 text-white text-4xl font-bold"
          >
            &times;
          </button>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">{quiz.title}</CardTitle>
          <CardDescription>{quiz.description}</CardDescription>
          <div className="mt-4">
            <Progress value={progress} />
            <p className="text-sm text-center mt-1">Question {currentQuestionIndex + 1} of {questions.length}</p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="my-4">
            <p className="text-xl mt-2 font-semibold">{currentQuestion.text}</p>
            {currentQuestion.media_url && renderMedia(currentQuestion.media_url)}
          </div>
          <RadioGroup
            value={selectedAnswers[currentQuestion.id] || ''}
            onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
            className="mt-4 space-y-3"
          >
            {Object.entries(currentQuestion.options).map(([key, value]) => (
              <div key={key} className="flex items-center p-3 border rounded-lg has-[:checked]:bg-blue-50 has-[:checked]:border-blue-500 transition-colors">
                <RadioGroupItem value={key} id={`${currentQuestion.id}-${key}`} />
                <Label htmlFor={`${currentQuestion.id}-${key}`} className="ml-3 text-base flex-1 cursor-pointer">
                  <span className="font-bold mr-2">{key}.</span> {value}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      <div className="flex justify-between mt-6">
        <Button onClick={handlePrev} disabled={currentQuestionIndex === 0}>
          Previous
        </Button>
        {currentQuestionIndex === questions.length - 1 ? (
          <Button onClick={handleSubmit} disabled={!selectedAnswers[currentQuestion.id] || isLoading}>
            {isLoading ? 'Submitting...' : 'Submit Quiz'}
          </Button>
        ) : (
          <Button onClick={handleNext} disabled={!selectedAnswers[currentQuestion.id]}>
            Next
          </Button>
        )}
      </div>
    </div>
  );
};

export default QuizTaking;
