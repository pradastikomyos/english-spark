
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
  BarChart3,
  Zap,
  Flame,
  Gem
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
  correct_answers?: number;
  points_earned?: number;
  difficulty_breakdown?: {
    easy: { correct: number; total: number; points: number };
    medium: { correct: number; total: number; points: number };
    hard: { correct: number; total: number; points: number };
  };
}

export function QuizResults() {
  const { profileId } = useAuth();
  const [results, setResults] = useState<QuizResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalQuizzes: 0,
    averageScore: 0,
    bestScore: 0,
    totalTimeSpent: 0,
    totalPointsEarned: 0,
    difficultyStats: {
      easy: { total: 0, correct: 0, percentage: 0 },
      medium: { total: 0, correct: 0, percentage: 0 },
      hard: { total: 0, correct: 0, percentage: 0 }
    }
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
          correct_answers,
          points_earned,
          quizzes!inner(title, difficulty, total_questions)
        `)
        .eq('student_id', profileId)
        .order('completed_at', { ascending: false });

      if (error) throw error;

      const formattedResults = data?.map(result => {
        // Calculate difficulty breakdown based on quiz structure
        const totalQuestions = result.quizzes?.total_questions || 30;
        const questionsPerDifficulty = Math.floor(totalQuestions / 3);
        const correctAnswers = result.correct_answers || 0;
        
        // Estimate breakdown (in real implementation, store this data)
        const difficultyBreakdown = {
          easy: { 
            correct: Math.min(correctAnswers, questionsPerDifficulty),
            total: questionsPerDifficulty,
            points: Math.min(correctAnswers, questionsPerDifficulty) * 2
          },
          medium: { 
            correct: Math.min(Math.max(0, correctAnswers - questionsPerDifficulty), questionsPerDifficulty),
            total: questionsPerDifficulty,
            points: Math.min(Math.max(0, correctAnswers - questionsPerDifficulty), questionsPerDifficulty) * 3
          },
          hard: { 
            correct: Math.min(Math.max(0, correctAnswers - (2 * questionsPerDifficulty)), questionsPerDifficulty),
            total: questionsPerDifficulty,
            points: Math.min(Math.max(0, correctAnswers - (2 * questionsPerDifficulty)), questionsPerDifficulty) * 5
          }
        };

        return {
          ...result,
          quiz_title: result.quizzes?.title || 'Unknown Quiz',
          quiz_difficulty: result.quizzes?.difficulty || 'medium',
          difficulty_breakdown: difficultyBreakdown
        };
      }) || [];

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
      setStats({ 
        totalQuizzes: 0, 
        averageScore: 0, 
        bestScore: 0, 
        totalTimeSpent: 0,
        totalPointsEarned: 0,
        difficultyStats: {
          easy: { total: 0, correct: 0, percentage: 0 },
          medium: { total: 0, correct: 0, percentage: 0 },
          hard: { total: 0, correct: 0, percentage: 0 }
        }
      });
      return;
    }

    const totalQuizzes = results.length;
    const averageScore = Math.round(results.reduce((sum, r) => sum + r.score, 0) / totalQuizzes);
    const bestScore = Math.max(...results.map(r => r.score));
    const totalTimeSpent = results.reduce((sum, r) => sum + (r.time_taken || 0), 0);
    const totalPointsEarned = results.reduce((sum, r) => sum + (r.points_earned || 0), 0);

    // Calculate difficulty stats
    let easyTotal = 0, easyCorrect = 0;
    let mediumTotal = 0, mediumCorrect = 0;
    let hardTotal = 0, hardCorrect = 0;

    results.forEach(result => {
      if (result.difficulty_breakdown) {
        easyTotal += result.difficulty_breakdown.easy.total;
        easyCorrect += result.difficulty_breakdown.easy.correct;
        mediumTotal += result.difficulty_breakdown.medium.total;
        mediumCorrect += result.difficulty_breakdown.medium.correct;
        hardTotal += result.difficulty_breakdown.hard.total;
        hardCorrect += result.difficulty_breakdown.hard.correct;
      }
    });

    const difficultyStats = {
      easy: { 
        total: easyTotal, 
        correct: easyCorrect, 
        percentage: easyTotal > 0 ? Math.round((easyCorrect / easyTotal) * 100) : 0 
      },
      medium: { 
        total: mediumTotal, 
        correct: mediumCorrect, 
        percentage: mediumTotal > 0 ? Math.round((mediumCorrect / mediumTotal) * 100) : 0 
      },
      hard: { 
        total: hardTotal, 
        correct: hardCorrect, 
        percentage: hardTotal > 0 ? Math.round((hardCorrect / hardTotal) * 100) : 0 
      }
    };

    setStats({ totalQuizzes, averageScore, bestScore, totalTimeSpent, totalPointsEarned, difficultyStats });
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
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
        <h1 className="text-2xl font-bold text-gray-900">Quiz Results & Gamification</h1>
        <p className="text-gray-600">Track your learning progress and earning achievements</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
            <CardTitle className="text-sm font-medium">Points Earned</CardTitle>
            <Award className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPointsEarned}</div>
            <p className="text-xs text-muted-foreground">Total points</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Time Spent</CardTitle>
            <Clock className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatTime(stats.totalTimeSpent)}</div>
            <p className="text-xs text-muted-foreground">Learning time</p>
          </CardContent>
        </Card>
      </div>

      {/* Difficulty Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Performance by Difficulty
          </CardTitle>
          <CardDescription>Your success rate across different difficulty levels</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-green-500" />
                <span className="font-medium text-green-700">Easy Questions</span>
                <Badge variant="outline" className="bg-green-50 text-green-700">
                  2 points each
                </Badge>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Correct: {stats.difficultyStats.easy.correct}/{stats.difficultyStats.easy.total}</span>
                  <span className="font-medium">{stats.difficultyStats.easy.percentage}%</span>
                </div>
                <Progress value={stats.difficultyStats.easy.percentage} className="h-2" />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Flame className="h-5 w-5 text-yellow-500" />
                <span className="font-medium text-yellow-700">Medium Questions</span>
                <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                  3 points each
                </Badge>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Correct: {stats.difficultyStats.medium.correct}/{stats.difficultyStats.medium.total}</span>
                  <span className="font-medium">{stats.difficultyStats.medium.percentage}%</span>
                </div>
                <Progress value={stats.difficultyStats.medium.percentage} className="h-2" />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Gem className="h-5 w-5 text-red-500" />
                <span className="font-medium text-red-700">Hard Questions</span>
                <Badge variant="outline" className="bg-red-50 text-red-700">
                  5 points each
                </Badge>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Correct: {stats.difficultyStats.hard.correct}/{stats.difficultyStats.hard.total}</span>
                  <span className="font-medium">{stats.difficultyStats.hard.percentage}%</span>
                </div>
                <Progress value={stats.difficultyStats.hard.percentage} className="h-2" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

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
                        {result.time_taken && (
                          <>
                            <Clock className="h-4 w-4 text-gray-500 ml-2" />
                            <span className="text-sm text-gray-500">
                              {formatTime(result.time_taken)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={getScoreBadgeVariant(result.score)} className="text-lg px-3 py-1 mb-1">
                        {result.score}%
                      </Badge>
                      <div className="text-sm text-gray-600">
                        {result.points_earned || 0} points earned
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Overall Progress</span>
                        <span className={getScoreColor(result.score)}>
                          {result.score}% ({result.correct_answers || 0}/{result.total_questions} correct)
                        </span>
                      </div>
                      <Progress value={result.score} className="h-2" />
                    </div>

                    {/* Difficulty Breakdown */}
                    {result.difficulty_breakdown && (
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-medium mb-3 text-gray-900">Performance by Difficulty:</h4>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div className="text-center">
                            <div className="flex items-center justify-center gap-1 mb-1">
                              <Zap className="h-4 w-4 text-green-500" />
                              <span className="font-medium text-green-700">Easy</span>
                            </div>
                            <div className="text-gray-900">
                              {result.difficulty_breakdown.easy.correct}/{result.difficulty_breakdown.easy.total}
                            </div>
                            <div className="text-green-600 font-medium">
                              +{result.difficulty_breakdown.easy.points} pts
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="flex items-center justify-center gap-1 mb-1">
                              <Flame className="h-4 w-4 text-yellow-500" />
                              <span className="font-medium text-yellow-700">Medium</span>
                            </div>
                            <div className="text-gray-900">
                              {result.difficulty_breakdown.medium.correct}/{result.difficulty_breakdown.medium.total}
                            </div>
                            <div className="text-yellow-600 font-medium">
                              +{result.difficulty_breakdown.medium.points} pts
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="flex items-center justify-center gap-1 mb-1">
                              <Gem className="h-4 w-4 text-red-500" />
                              <span className="font-medium text-red-700">Hard</span>
                            </div>
                            <div className="text-gray-900">
                              {result.difficulty_breakdown.hard.correct}/{result.difficulty_breakdown.hard.total}
                            </div>
                            <div className="text-red-600 font-medium">
                              +{result.difficulty_breakdown.hard.points} pts
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
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
