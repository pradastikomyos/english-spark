import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Trophy,
  Target,
  Clock,
  TrendingUp,
  Star,
  Calendar,
  Award,
  BarChart3,
  CheckCircle,
  XCircle,
  Zap,
  ArrowRight,
  RotateCcw,
  BookOpen
} from 'lucide-react';

interface QuizResult {
  id: string;
  quiz_id: string;
  score: number;
  total_questions: number;
  correct_answers?: number;
  time_taken?: number;
  points_earned?: number;
  completed_at: string;
  quiz: {
    title: string;
    difficulty: string;
    time_limit: number;
  };
}

interface StudentStats {
  total_points: number;
  level: number;
  quizzes_completed: number;
  average_score: number;
  best_score: number;
  total_time_spent: number;
  streak_days: number;
  achievements_unlocked: number;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  condition: string;
  points_reward: number;
  unlocked_at?: string;
}

export function QuizResults() {
  const { profileId } = useAuth();
  const { toast } = useToast();
  const [results, setResults] = useState<QuizResult[]>([]);
  const [stats, setStats] = useState<StudentStats | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'recent' | 'best'>('all');

  useEffect(() => {
    if (profileId) {
      fetchData();
    }
  }, [profileId]);

  const fetchData = async () => {
    try {
      setLoading(true);      // Fetch quiz results
      const { data: resultsData, error: resultsError } = await supabase
        .from('user_progress')
        .select(`
          id,
          quiz_id,
          score,
          total_questions,
          correct_answers,
          time_taken,
          points_earned,
          completed_at,
          quiz:quizzes!inner(title, difficulty, time_limit)
        `)
        .eq('student_id', profileId)
        .order('completed_at', { ascending: false });

      if (resultsError) throw resultsError;

      // Fetch student stats
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('*')
        .eq('id', profileId)
        .single();

      if (studentError) throw studentError;

      // Calculate additional stats
      const calculatedStats: StudentStats = {
        total_points: studentData.total_points || 0,
        level: studentData.level || 1,
        quizzes_completed: resultsData?.length || 0,
        average_score: resultsData && resultsData.length > 0 
          ? resultsData.reduce((sum, r) => sum + r.score, 0) / resultsData.length 
          : 0,
        best_score: resultsData && resultsData.length > 0 
          ? Math.max(...resultsData.map(r => r.score)) 
          : 0,        total_time_spent: resultsData && resultsData.length > 0 
          ? resultsData.reduce((sum, r) => sum + (r.time_taken || 0), 0) 
          : 0,
        streak_days: studentData.current_streak || 0,
        achievements_unlocked: 0, // Will be calculated from achievements
      };

      // Generate achievements based on progress
      const generatedAchievements = generateAchievements(calculatedStats, resultsData || []);

      setResults(resultsData || []);
      setStats(calculatedStats);
      setAchievements(generatedAchievements);

    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load results',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const generateAchievements = (stats: StudentStats, results: QuizResult[]): Achievement[] => {
    const achievements: Achievement[] = [
      {
        id: '1',
        title: '🚀 First Steps',
        description: 'Complete your first quiz',
        icon: '🚀',
        condition: 'Complete 1 quiz',
        points_reward: 10,
        unlocked_at: stats.quizzes_completed >= 1 ? new Date().toISOString() : undefined,
      },
      {
        id: '2',
        title: '📚 Eager Learner',
        description: 'Complete 5 quizzes',
        icon: '📚',
        condition: 'Complete 5 quizzes',
        points_reward: 25,
        unlocked_at: stats.quizzes_completed >= 5 ? new Date().toISOString() : undefined,
      },
      {
        id: '3',
        title: '🎯 Sharp Shooter',
        description: 'Score 90% or higher on a quiz',
        icon: '🎯',
        condition: 'Score 90%+ on any quiz',
        points_reward: 30,
        unlocked_at: stats.best_score >= 90 ? new Date().toISOString() : undefined,
      },
      {
        id: '4',
        title: '🏆 Quiz Master',
        description: 'Complete 10 quizzes',
        icon: '🏆',
        condition: 'Complete 10 quizzes',
        points_reward: 50,
        unlocked_at: stats.quizzes_completed >= 10 ? new Date().toISOString() : undefined,
      },
      {
        id: '5',
        title: '⚡ Speed Runner',
        description: 'Complete a quiz in under 2 minutes',
        icon: '⚡',
        condition: 'Complete quiz < 2 minutes',
        points_reward: 20,
        unlocked_at: results.some(r => (r.time_taken || 0) < 120) ? new Date().toISOString() : undefined,
      },
      {
        id: '6',
        title: '🔥 On Fire',
        description: 'Maintain a 7-day streak',
        icon: '🔥',
        condition: '7-day learning streak',
        points_reward: 40,
        unlocked_at: stats.streak_days >= 7 ? new Date().toISOString() : undefined,
      },
      {
        id: '7',
        title: '💎 Perfectionist',
        description: 'Score 100% on a quiz',
        icon: '💎',
        condition: 'Score perfect 100%',
        points_reward: 75,
        unlocked_at: stats.best_score >= 100 ? new Date().toISOString() : undefined,
      },
      {
        id: '8',
        title: '🌟 Rising Star',
        description: 'Reach Level 5',
        icon: '🌟',
        condition: 'Reach Level 5',
        points_reward: 100,
        unlocked_at: stats.level >= 5 ? new Date().toISOString() : undefined,
      },
    ];

    return achievements;
  };

  const getFilteredResults = () => {
    switch (filter) {
      case 'recent':
        return results.slice(0, 5);
      case 'best':
        return [...results].sort((a, b) => b.score - a.score).slice(0, 5);
      default:
        return results;
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-blue-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getLevelProgress = () => {
    if (!stats) return 0;
    const currentLevelPoints = (stats.level - 1) * 100;
    const nextLevelPoints = stats.level * 100;
    const progressPoints = stats.total_points - currentLevelPoints;
    return (progressPoints / 100) * 100;
  };

  const getUnlockedAchievements = () => {
    return achievements.filter(a => a.unlocked_at);
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading results...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100">Level</p>
                <p className="text-3xl font-bold">{stats?.level || 1}</p>
              </div>
              <Trophy className="h-8 w-8 text-blue-200" />
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-sm text-blue-100 mb-1">
                <span>Progress to Level {(stats?.level || 1) + 1}</span>
                <span>{Math.round(getLevelProgress())}%</span>
              </div>
              <Progress value={getLevelProgress()} className="h-2 bg-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600">Total Points</p>
                <p className="text-3xl font-bold text-green-600">{stats?.total_points || 0}</p>
              </div>
              <Star className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600">Quizzes Done</p>
                <p className="text-3xl font-bold text-purple-600">{stats?.quizzes_completed || 0}</p>
              </div>
              <BookOpen className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600">Average Score</p>
                <p className="text-3xl font-bold text-orange-600">
                  {stats?.average_score ? Math.round(stats.average_score) : 0}%
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Achievements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Achievements ({getUnlockedAchievements().length}/{achievements.length})
          </CardTitle>
          <CardDescription>
            Your learning milestones and accomplishments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {achievements.map((achievement) => (
              <div
                key={achievement.id}
                className={`p-4 rounded-lg border-2 transition-all ${
                  achievement.unlocked_at
                    ? 'border-green-200 bg-green-50'
                    : 'border-gray-200 bg-gray-50 opacity-60'
                }`}
              >
                <div className="text-center">
                  <div className="text-3xl mb-2">{achievement.icon}</div>
                  <h3 className="font-semibold text-sm mb-1">{achievement.title}</h3>
                  <p className="text-xs text-gray-600 mb-2">{achievement.description}</p>
                  <Badge variant={achievement.unlocked_at ? 'default' : 'secondary'} className="text-xs">
                    {achievement.unlocked_at ? 'Unlocked!' : achievement.condition}
                  </Badge>
                  {achievement.unlocked_at && (
                    <div className="mt-2 text-xs text-green-600">
                      +{achievement.points_reward} points
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quiz Results */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Quiz Results
              </CardTitle>
              <CardDescription>
                Your quiz history and performance
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('all')}
              >
                All
              </Button>
              <Button
                variant={filter === 'recent' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('recent')}
              >
                Recent
              </Button>
              <Button
                variant={filter === 'best' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('best')}
              >
                Best
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {results.length === 0 ? (
            <div className="text-center py-8">
              <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Quiz Results Yet</h3>
              <p className="text-gray-600 mb-4">Start taking quizzes to see your progress here!</p>
              <Button>Take Your First Quiz</Button>
            </div>
          ) : (
            <div className="space-y-4">
              {getFilteredResults().map((result) => (
                <div
                  key={result.id}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-semibold">{result.quiz.title}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={getDifficultyColor(result.quiz.difficulty)}>
                          {result.quiz.difficulty}
                        </Badge>
                        <span className="text-sm text-gray-500">
                          {formatDate(result.completed_at)}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-2xl font-bold ${getScoreColor(result.score)}`}>
                        {Math.round(result.score)}%
                      </div>
                      <div className="text-sm text-gray-500">
                        +{result.points_earned} points
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-sm">                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>{result.correct_answers || 0}/{result.total_questions} correct</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-blue-500" />
                      <span>Time: {formatTime(result.time_taken || 0)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-yellow-500" />
                      <span>{result.points_earned || 0} points earned</span>
                    </div>
                  </div>

                  <Progress 
                    value={result.score} 
                    className="mt-3 h-2"
                  />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
