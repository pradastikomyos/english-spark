import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Trophy, BookOpen, UserCheck } from 'lucide-react';

interface StudentScore {
  student_id: string;
  student_name: string;
  quiz_id: string;
  quiz_title: string;
  score: number;
  submitted_at: string;
}

interface LeaderboardStudent {
  student_id: string;
  student_name: string;
  total_score: number;
  class_name: string;
}

const Reports: React.FC = () => {
  const { profileId } = useAuth();
  const { toast } = useToast();
  const [studentScores, setStudentScores] = useState<StudentScore[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardStudent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profileId) {
      fetchReportsData();
    }
  }, [profileId]);

  const fetchReportsData = async () => {
    setLoading(true);
    try {
      const [scoresRes, leaderboardRes] = await Promise.all([
        supabase.rpc('get_student_scores_for_teacher', { p_teacher_id: profileId }),
        supabase.rpc('get_leaderboard_for_teacher', { p_teacher_id: profileId })
      ]);

      if (scoresRes.error) throw scoresRes.error;
      setStudentScores(scoresRes.data || []);

      if (leaderboardRes.error) throw leaderboardRes.error;
      setLeaderboard(leaderboardRes.data || []);

    } catch (error: any) {
      console.error('Error fetching reports data:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch reports data.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Reports</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Leaderboard Card (takes 1/3 width on large screens) */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Top Performing Students
            </CardTitle>
             <CardDescription>Leaderboard of students with the highest total scores.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p>Loading leaderboard...</p>
            ) : leaderboard.length === 0 ? (
              <p>No data available to display leaderboard.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rank</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Total Score</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leaderboard.map((student, index) => (
                      <TableRow key={student.student_id}>
                        <TableCell className="font-medium">{index + 1}</TableCell>
                        <TableCell>{student.student_name}</TableCell>
                        <TableCell>{student.class_name}</TableCell>
                        <TableCell>{student.total_score}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Student Scores Card (takes 2/3 width on large screens) */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-blue-500" />
                Student Quiz Submissions
            </CardTitle>
            <CardDescription>Detailed scores for each quiz submitted by your students.</CardDescription>
          </CardHeader>
          <CardContent>
             {loading ? (
              <p>Loading scores...</p>
            ) : studentScores.length === 0 ? (
              <p>No student submissions found for your assigned quizzes.</p>
            ) : (
              <div className="overflow-auto max-h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Quiz Title</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {studentScores.map((score) => (
                      <TableRow key={`${score.student_id}-${score.quiz_id}-${score.submitted_at}`}>
                        <TableCell>{score.student_name}</TableCell>
                        <TableCell>{score.quiz_title}</TableCell>
                        <TableCell>{score.score}</TableCell>
                        <TableCell>{new Date(score.submitted_at).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Reports;
