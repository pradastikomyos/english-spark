
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, FileText, Clock, Award, Edit, Trash2 } from 'lucide-react';

interface Quiz {
  id: string;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  time_limit: number;
  points_per_question: number;
  teacher_id?: string;
  created_by?: string;
  status?: string;
  created_at: string;
  updated_at?: string;
  total_questions?: number;
  questionCount?: number;
}

interface Question {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  points: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

type DifficultyLevel = 'easy' | 'medium' | 'hard';

export function QuizManagement() {
  const { profileId } = useAuth();
  const { toast } = useToast();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentQuiz, setCurrentQuiz] = useState<Quiz | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [quizToDelete, setQuizToDelete] = useState<Quiz | null>(null);

  const [quizForm, setQuizForm] = useState({
    title: '',
    description: '',
    totalQuestions: 30,
    timeLimit: 1800, // 30 minutes for 30 questions
  });

  useEffect(() => {
    if (profileId) {
      fetchQuizzes();
    }
  }, [profileId]);

  const fetchQuizzes = async () => {
    try {
      setLoading(true);
      console.log('🔍 Fetching quizzes for teacher:', profileId);

      const { data, error } = await supabase
        .from('quizzes')
        .select('*')
        .eq('created_by', profileId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get questions count for each quiz
      let quizzesWithQuestions: Quiz[] = data || [];
      if (data && data.length > 0) {
        const quizIds = data.map(q => q.id);
        const { data: questionsData } = await supabase
          .from('questions')
          .select('quiz_id')
          .in('quiz_id', quizIds);

        // Count questions per quiz
        const questionCounts: Record<string, number> = {};
        if (questionsData) {
          questionsData.forEach(q => {
            questionCounts[q.quiz_id] = (questionCounts[q.quiz_id] || 0) + 1;
          });
        }

        quizzesWithQuestions = data.map(quiz => ({
          ...quiz,
          questionCount: questionCounts[quiz.id] || 0
        }));
      }

      setQuizzes(quizzesWithQuestions);
    } catch (error: any) {
      console.error('❌ Quiz fetch error:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch quizzes',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setQuizForm({
      title: '',
      description: '',
      totalQuestions: 30,
      timeLimit: 1800,
    });
  };

  const calculateTotalPoints = (totalQuestions: number) => {
    // 10 easy (2 pts), 10 medium (3 pts), 10 hard (5 pts)
    const questionsPerDifficulty = Math.floor(totalQuestions / 3);
    const easyPoints = questionsPerDifficulty * 2;
    const mediumPoints = questionsPerDifficulty * 3;
    const hardPoints = questionsPerDifficulty * 5;
    return easyPoints + mediumPoints + hardPoints;
  };

  const handleCreateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      console.log('🎯 Creating quiz with gamification:', quizForm);
      
      const totalPoints = calculateTotalPoints(quizForm.totalQuestions);
      
      const { data: quiz, error: quizError } = await supabase
        .from('quizzes')
        .insert({
          title: quizForm.title,
          description: quizForm.description,
          difficulty: 'medium' as DifficultyLevel, // Default, akan dioverride per question
          time_limit: quizForm.timeLimit,
          points_per_question: 0, // Will be set per question
          total_questions: quizForm.totalQuestions,
          total_points: totalPoints,
          created_by: profileId,
        })
        .select()
        .single();

      if (quizError) throw quizError;

      console.log('✅ Quiz created successfully:', quiz);

      toast({
        title: 'Success',
        description: `Quiz created successfully! Total points: ${totalPoints}. Add questions next.`,
      });

      setIsCreateDialogOpen(false);
      resetForm();
      fetchQuizzes();
    } catch (error: any) {
      console.error('❌ Create quiz error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create quiz',
        variant: 'destructive',
      });
    }
  };

  const handleEditQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentQuiz) return;
    
    try {
      console.log('✏️ Updating quiz:', currentQuiz.id, quizForm);
      
      const totalPoints = calculateTotalPoints(quizForm.totalQuestions);
      
      const { data: quiz, error: quizError } = await supabase
        .from('quizzes')
        .update({
          title: quizForm.title,
          description: quizForm.description,
          time_limit: quizForm.timeLimit,
          total_questions: quizForm.totalQuestions,
          total_points: totalPoints,
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentQuiz.id)
        .select()
        .single();

      if (quizError) throw quizError;

      console.log('✅ Quiz updated successfully:', quiz);

      toast({
        title: 'Success',
        description: 'Quiz updated successfully!',
      });

      setIsEditDialogOpen(false);
      setCurrentQuiz(null);
      resetForm();
      fetchQuizzes();
    } catch (error: any) {
      console.error('❌ Update quiz error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update quiz',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteQuiz = async () => {
    if (!quizToDelete) return;
    
    try {
      console.log('🗑️ Deleting quiz:', quizToDelete.id);
      
      // Delete questions first (cascade delete)
      const { error: questionsError } = await supabase
        .from('questions')
        .delete()
        .eq('quiz_id', quizToDelete.id);

      if (questionsError) {
        console.warn('⚠️ Questions delete warning:', questionsError);
      }

      // Delete quiz
      const { error: quizError } = await supabase
        .from('quizzes')
        .delete()
        .eq('id', quizToDelete.id);

      if (quizError) throw quizError;

      console.log('✅ Quiz deleted successfully');

      toast({
        title: 'Success',
        description: 'Quiz deleted successfully!',
      });

      setIsDeleteConfirmOpen(false);
      setQuizToDelete(null);
      fetchQuizzes();
    } catch (error: any) {
      console.error('❌ Delete quiz error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete quiz',
        variant: 'destructive',
      });
    }
  };

  const openEditDialog = (quiz: Quiz) => {
    setCurrentQuiz(quiz);
    setQuizForm({
      title: quiz.title,
      description: quiz.description,
      totalQuestions: quiz.total_questions || 30,
      timeLimit: quiz.time_limit,
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (quiz: Quiz) => {
    setQuizToDelete(quiz);
    setIsDeleteConfirmOpen(true);
  };

  const closeCreateDialog = () => {
    setIsCreateDialogOpen(false);
    resetForm();
  };

  const closeEditDialog = () => {
    setIsEditDialogOpen(false);
    setCurrentQuiz(null);
    resetForm();
  };

  const getQuestionCount = (quiz: Quiz): number => {
    return quiz.questionCount || 0;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quiz Management</h1>
          <p className="text-gray-600">Create and manage your gamified quizzes</p>
        </div>

        {/* Create Quiz Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={closeCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Quiz
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Gamified Quiz</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateQuiz} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Quiz Name</Label>
                <Input
                  id="title"
                  value={quizForm.title}
                  onChange={(e) => setQuizForm({ ...quizForm, title: e.target.value })}
                  placeholder="Enter quiz name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={quizForm.description}
                  onChange={(e) => setQuizForm({ ...quizForm, description: e.target.value })}
                  placeholder="Enter quiz description"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="totalQuestions">Total Questions</Label>
                <Input
                  id="totalQuestions"
                  type="number"
                  value={quizForm.totalQuestions}
                  onChange={(e) => setQuizForm({ ...quizForm, totalQuestions: parseInt(e.target.value) || 30 })}
                  min={3}
                  max={90}
                  placeholder="30"
                />
                <p className="text-xs text-gray-500">
                  Questions will be divided equally: Easy (2pts), Medium (3pts), Hard (5pts)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timeLimit">Time Limit (minutes)</Label>
                <Input
                  id="timeLimit"
                  type="number"
                  value={Math.floor(quizForm.timeLimit / 60)}
                  onChange={(e) => setQuizForm({ ...quizForm, timeLimit: parseInt(e.target.value) * 60 })}
                  min={10}
                  max={120}
                />
              </div>

              <div className="bg-blue-50 p-3 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Gamification Preview:</h4>
                <div className="text-sm text-blue-800 space-y-1">
                  <div>📚 Total Questions: {quizForm.totalQuestions}</div>
                  <div>🎯 Total Points: {calculateTotalPoints(quizForm.totalQuestions)}</div>
                  <div>⭐ Easy: {Math.floor(quizForm.totalQuestions / 3)} × 2pts</div>
                  <div>🔥 Medium: {Math.floor(quizForm.totalQuestions / 3)} × 3pts</div>
                  <div>💎 Hard: {Math.floor(quizForm.totalQuestions / 3)} × 5pts</div>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1">
                  Create Quiz
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Reset
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Quiz Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={closeEditDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Quiz</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEditQuiz} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Quiz Name</Label>
                <Input
                  id="edit-title"
                  value={quizForm.title}
                  onChange={(e) => setQuizForm({ ...quizForm, title: e.target.value })}
                  placeholder="Enter quiz name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={quizForm.description}
                  onChange={(e) => setQuizForm({ ...quizForm, description: e.target.value })}
                  placeholder="Enter quiz description"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-totalQuestions">Total Questions</Label>
                <Input
                  id="edit-totalQuestions"
                  type="number"
                  value={quizForm.totalQuestions}
                  onChange={(e) => setQuizForm({ ...quizForm, totalQuestions: parseInt(e.target.value) || 30 })}
                  min={3}
                  max={90}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-timeLimit">Time Limit (minutes)</Label>
                <Input
                  id="edit-timeLimit"
                  type="number"
                  value={Math.floor(quizForm.timeLimit / 60)}
                  onChange={(e) => setQuizForm({ ...quizForm, timeLimit: parseInt(e.target.value) * 60 })}
                  min={10}
                  max={120}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1">
                  Update Quiz
                </Button>
                <Button type="button" variant="outline" onClick={closeEditDialog}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Quiz</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{quizToDelete?.title}"? This action cannot be undone and will also delete all associated questions.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDeleteQuiz}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete Quiz
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full text-center py-8">
            Loading quizzes...
          </div>
        ) : quizzes.length === 0 ? (
          <div className="col-span-full text-center py-8 text-gray-500">
            No quizzes created yet. Create your first gamified quiz!
          </div>
        ) : (
          quizzes.map((quiz) => (
            <Card key={quiz.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{quiz.title}</CardTitle>
                    <CardDescription className="mt-1">
                      {quiz.description}
                    </CardDescription>
                  </div>
                  <Badge className="bg-purple-100 text-purple-800">
                    Gamified
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <FileText className="h-4 w-4" />
                      {getQuestionCount(quiz)} / {quiz.total_questions || 30} questions
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {Math.floor(quiz.time_limit / 60)}m
                    </div>
                    <div className="flex items-center gap-1">
                      <Award className="h-4 w-4" />
                      {quiz.total_points || 100}pts
                    </div>
                  </div>

                  <div className="bg-gray-50 p-2 rounded text-xs">
                    <div className="font-medium mb-1">Point Distribution:</div>
                    <div className="grid grid-cols-3 gap-1 text-center">
                      <div className="bg-green-100 p-1 rounded">
                        <div className="font-medium text-green-800">Easy</div>
                        <div className="text-green-600">2pts</div>
                      </div>
                      <div className="bg-yellow-100 p-1 rounded">
                        <div className="font-medium text-yellow-800">Medium</div>
                        <div className="text-yellow-600">3pts</div>
                      </div>
                      <div className="bg-red-100 p-1 rounded">
                        <div className="font-medium text-red-800">Hard</div>
                        <div className="text-red-600">5pts</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => openEditDialog(quiz)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-red-600 hover:text-red-700 hover:border-red-300"
                      onClick={() => openDeleteDialog(quiz)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
