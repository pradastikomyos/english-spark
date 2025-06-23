
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { 
  Trophy, 
  Target, 
  Clock, 
  Star, 
  TrendingUp,
  Calendar,
  Award,
  BarChart3
} from 'lucide-react';

interface QuizResult {
  id: string;
  quiz_id: string;
  score: number;
  total_questions: number;
  time_taken: number | null;
  completed_at: string;
  quiz_title?: string;
  quiz_difficulty?: string;
}

export function QuizResults() {
  const { profileId } = useAuth();
  const [results, setResults] = useState<QuizResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalQuizzes: 0,
    averageScore: 0,
    bestScore: 0,
    totalTimeSpent: 0
  });

  useEffect(() => {
    if (profileId) {
      fetchResults();
    }
  }, [profileId]);

  const fetchResults = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('user_progress')
        .select(`
          id,
          quiz_id,
          score,
          total_questions,
          time_taken,
          completed_at,
          quizzes!inner(title, difficulty)
        `)
        .eq('student_id', profileId)
        .order('completed_at', { ascending: false });

      if (error) throw error;

      const formattedResults = data?.map(result => ({
        ...result,
        quiz_title: result.quizzes?.title || 'Unknown Quiz',
        quiz_difficulty: result.quizzes?.difficulty || 'medium'
      })) || [];

      setResults(formattedResults);
      calculateStats(formattedResults);
    } catch (error: any) {
      console.error('Error fetching quiz results:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (results: QuizResult[]) => {
    if (results.length === 0) {
      setStats({ totalQuizzes: 0, averageScore: 0, bestScore: 0, totalTimeSpent: 0 });
      return;
    }

    const totalQuizzes = results.length;
    const averageScore = Math.round(results.reduce((sum, r) => sum + r.score, 0) / totalQuizzes);
    const bestScore = Math.max(...results.map(r => r.score));
    const totalTimeSpent = results.reduce((sum, r) => sum + (r.time_taken || 0), 0);

    setStats({ totalQuizzes, averageScore, bestScore, totalTimeSpent });
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadgeVariant = (score: number) => {
    if (score >= 90) return 'default';
    if (score >= 70) return 'secondary';
    return 'destructive';
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
        <p className="mt-2 text-gray-600">Loading your results...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Quiz Results</h1>
        <p className="text-gray-600">Track your learning progress and achievements</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Quizzes</CardTitle>
            <Target className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalQuizzes}</div>
            <p className="text-xs text-muted-foreground">Completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
            <BarChart3 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageScore}%</div>
            <p className="text-xs text-muted-foreground">Overall performance</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Best Score</CardTitle>
            <Trophy className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.bestScore}%</div>
            <p className="text-xs text-muted-foreground">Personal best</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Time Spent</CardTitle>
            <Clock className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatTime(stats.totalTimeSpent)}</div>
            <p className="text-xs text-muted-foreground">Learning time</p>
          </CardContent>
        </Card>
      </div>

      {/* Results List */}
      {results.length === 0 ? (
        <Card className="p-8 text-center">
          <Star className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No quiz results yet</h3>
          <p className="text-gray-600">Complete your first quiz to see results here!</p>
        </Card>
      ) : (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Recent Results</h2>
          <div className="grid gap-4">
            {results.map((result) => (
              <Card key={result.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-lg">{result.quiz_title}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-500">
                          {new Date(result.completed_at).toLocaleDateString()}
                        </span>
                        <Badge className={getDifficultyColor(result.quiz_difficulty)}>
                          {result.quiz_difficulty}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={getScoreBadgeVariant(result.score)} className="text-lg px-3 py-1">
                        {result.score}%
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Progress</span>
                        <span className={getScoreColor(result.score)}>
                          {result.score}% ({Math.round((result.score / 100) * result.total_questions)}/{result.total_questions} correct)
                        </span>
                      </div>
                      <Progress value={result.score} className="h-2" />
                    </div>

                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                          <Target className="h-4 w-4" />
                          <span>{result.total_questions} questions</span>
                        </div>
                        {result.time_taken && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>{formatTime(result.time_taken)}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {result.score >= 90 && <Award className="h-4 w-4 text-yellow-500" />}
                        {result.score >= 90 ? (
                          <span className="text-yellow-600 font-medium">Excellent!</span>
                        ) : result.score >= 70 ? (
                          <span className="text-green-600 font-medium">Good job!</span>
                        ) : (
                          <span className="text-blue-600 font-medium">Keep practicing!</span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
