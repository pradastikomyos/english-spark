
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { 
  PlayCircle, 
  Trophy, 
  Star, 
  Flame, 
  TrendingUp, 
  Award,
  Target,
  Clock
} from 'lucide-react';

interface StudentData {
  id: string;
  name: string;
  total_points: number;
  level: number;
  current_streak: number;
  classes?: { name: string };
}

interface DashboardStats {
  studentData: StudentData | null;
  recentQuizzes: any[];
  achievements: any[];
  availableQuizzes: any[];
  classRank: number;
  totalClassmates: number;
}

export function StudentDashboard() {
  const { profileId } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    studentData: null,
    recentQuizzes: [],
    achievements: [],
    availableQuizzes: [],
    classRank: 0,
    totalClassmates: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profileId) {
      fetchDashboardData();
    }
  }, [profileId]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch student data
      const { data: studentData } = await supabase
        .from('students')
        .select('*, classes:class_id(name)')
        .eq('id', profileId)
        .single();

      // Fetch recent quiz attempts
      const { data: recentQuizzes } = await supabase
        .from('user_progress')
        .select(`
          *,
          quizzes:quiz_id(title, difficulty)
        `)
        .eq('student_id', profileId)
        .order('completed_at', { ascending: false })
        .limit(5);

      // Fetch available quizzes
      const { data: availableQuizzes } = await supabase
        .from('class_quizzes')
        .select(`
          *,
          quizzes:quiz_id(*)
        `)
        .eq('class_id', studentData?.class_id)
        .order('assigned_at', { ascending: false })
        .limit(3);

      // Fetch achievements
      const { data: achievements } = await supabase
        .from('user_achievements')
        .select(`
          *,
          achievements:achievement_id(*)
        `)
        .eq('student_id', profileId)
        .order('earned_at', { ascending: false })
        .limit(3);

      // Get class ranking
      if (studentData?.class_id) {
        const { data: classmates } = await supabase
          .from('students')
          .select('total_points')
          .eq('class_id', studentData.class_id)
          .order('total_points', { ascending: false });

        const rank = classmates?.findIndex(s => s.total_points <= studentData.total_points) + 1 || 0;
        
        setStats({
          studentData,
          recentQuizzes: recentQuizzes || [],
          achievements: achievements || [],
          availableQuizzes: availableQuizzes || [],
          classRank: rank,
          totalClassmates: classmates?.length || 0,
        });
      } else {
        setStats({
          studentData,
          recentQuizzes: recentQuizzes || [],
          achievements: achievements || [],
          availableQuizzes: availableQuizzes || [],
          classRank: 0,
          totalClassmates: 0,
        });
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getNextLevelPoints = (currentLevel: number) => {
    return currentLevel * 100;
  };

  const getLevelProgress = (points: number, level: number) => {
    const currentLevelPoints = (level - 1) * 100;
    const nextLevelPoints = level * 100;
    const progress = ((points - currentLevelPoints) / (nextLevelPoints - currentLevelPoints)) * 100;
    return Math.max(0, Math.min(100, progress));
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/3"></div>
                  <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const { studentData } = stats;

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {studentData?.name}! 🎓
        </h1>
        <p className="text-gray-600 mt-2">
          Ready to continue your English learning journey?
        </p>
      </div>

      {/* Level & Progress Section */}
      <Card className="bg-gradient-to-r from-blue-500 to-green-500 text-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                <Star className="h-8 w-8" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Level {studentData?.level}</h2>
                <p className="text-blue-100">{studentData?.total_points} total points</p>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 mb-2">
                <Flame className="h-5 w-5 text-orange-300" />
                <span className="text-lg font-bold">{studentData?.current_streak} day streak</span>
              </div>
              {stats.classRank > 0 && (
                <p className="text-blue-100">
                  Rank #{stats.classRank} of {stats.totalClassmates}
                </p>
              )}
            </div>
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-2">
              <span>Progress to Level {(studentData?.level || 1) + 1}</span>
              <span>
                {studentData?.total_points || 0} / {getNextLevelPoints(studentData?.level || 1)} points
              </span>
            </div>
            <Progress 
              value={getLevelProgress(studentData?.total_points || 0, studentData?.level || 1)} 
              className="h-3 bg-white/20"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Available Quizzes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PlayCircle className="h-5 w-5 text-green-600" />
                Available Quizzes
              </CardTitle>
              <CardDescription>
                Take these quizzes to earn points and level up!
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stats.availableQuizzes.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Target className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No quizzes available yet</p>
                  <p className="text-sm">Check back later for new challenges!</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {stats.availableQuizzes.map((quiz) => (
                    <div
                      key={quiz.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <PlayCircle className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-medium">{quiz.quizzes?.title}</h3>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Badge variant="outline" className="text-xs">
                              {quiz.quizzes?.difficulty}
                            </Badge>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {Math.floor((quiz.quizzes?.time_limit || 0) / 60)}min
                            </span>
                          </div>
                        </div>
                      </div>
                      <Button size="sm">
                        Start Quiz
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.recentQuizzes.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <PlayCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No quiz attempts yet</p>
                  <p className="text-sm">Start your first quiz to see your progress!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {stats.recentQuizzes.map((quiz, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{quiz.quizzes?.title}</p>
                        <p className="text-sm text-gray-600">
                          {new Date(quiz.completed_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600">
                          {quiz.score}/{quiz.total_questions}
                        </p>
                        <p className="text-sm text-gray-600">
                          {Math.round((quiz.score / quiz.total_questions) * 100)}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Total Points</span>
                <span className="font-bold text-blue-600">{studentData?.total_points}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Current Level</span>
                <Badge variant="outline">Level {studentData?.level}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Streak Days</span>
                <span className="flex items-center gap-1">
                  <Flame className="h-4 w-4 text-orange-500" />
                  {studentData?.current_streak}
                </span>
              </div>
              {studentData?.classes && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Class</span>
                  <Badge variant="secondary">{studentData.classes.name}</Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Achievements */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Award className="h-5 w-5 text-yellow-600" />
                Recent Achievements
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.achievements.length === 0 ? (
                <div className="text-center py-6 text-gray-500">
                  <Award className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No achievements yet</p>
                  <p className="text-xs">Complete quizzes to earn badges!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {stats.achievements.map((achievement, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-2 bg-yellow-50 rounded-lg"
                    >
                      <span className="text-2xl">{achievement.achievements?.badge_icon}</span>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{achievement.achievements?.name}</p>
                        <p className="text-xs text-gray-600">
                          {new Date(achievement.earned_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
