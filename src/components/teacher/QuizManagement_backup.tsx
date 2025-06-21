
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
  created_by?: string; // for backward compatibility
  status?: string;
  created_at: string;
  updated_at?: string;
  questions?: { length: number } | Question[];
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
}

export function QuizManagement() {
  const { profileId } = useAuth();
  const { toast } = useToast();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentQuiz, setCurrentQuiz] = useState<Quiz | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [quizToDelete, setQuizToDelete] = useState<Quiz | null>(null);
    const [quizForm, setQuizForm] = useState({
    title: '',
    description: '',
    difficulty: 'medium' as 'easy' | 'medium' | 'hard',
    timeLimit: 600,
    pointsPerQuestion: 10,
  });

  useEffect(() => {
    if (profileId) {
      fetchQuizzes();
    }
  }, [profileId]);  const fetchQuizzes = async () => {
    try {
      setLoading(true);
      console.log('🔍 Fetching quizzes for teacher:', profileId);      const { data, error }: { data: any[] | null; error: any } = await supabase
        .from('quizzes')
        .select('*')
        .eq('teacher_id', profileId)
        .order('created_at', { ascending: false });

      // Get questions count for each quiz
      let quizzesWithQuestions = data || [];
      if (data && data.length > 0) {
        const quizIds = data.map(q => q.id);
        const { data: questionsData } = await supabase
          .from('questions')
          .select('quiz_id')
          .in('quiz_id', quizIds);

        // Count questions per quiz
        const questionCounts = questionsData?.reduce((acc, q) => {
          acc[q.quiz_id] = (acc[q.quiz_id] || 0) + 1;
          return acc;
        }, {} as Record<string, number>) || {};

        quizzesWithQuestions = data.map(quiz => ({
          ...quiz,
          questions: { length: questionCounts[quiz.id] || 0 }
        }));
      }      
      setQuizzes(quizzesWithQuestions);
    } catch (error: any) {
      console.error('❌ Quiz fetch error:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch quizzes',
        variant: 'destructive',
      });    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setQuizForm({
      title: '',
      description: '',
      difficulty: 'medium',
      timeLimit: 600,
      pointsPerQuestion: 10,
    });
  };

  const handleCreateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      console.log('🎯 Creating quiz basic (no questions yet):', quizForm);
      
      // Create quiz without questions first (basic CRUD)
      const { data: quiz, error: quizError } = await supabase
        .from('quizzes')
        .insert({
          title: quizForm.title,
          description: quizForm.description,
          difficulty: quizForm.difficulty,
          time_limit: quizForm.timeLimit,
          points_per_question: quizForm.pointsPerQuestion,
          teacher_id: profileId,
        })
        .select()
        .single();

      if (quizError) throw quizError;

      console.log('✅ Quiz created successfully:', quiz);

      toast({
        title: 'Success',
        description: 'Quiz created successfully! You can add questions later.',
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
      
      const { data: quiz, error: quizError } = await supabase
        .from('quizzes')
        .update({
          title: quizForm.title,
          description: quizForm.description,
          difficulty: quizForm.difficulty,
          time_limit: quizForm.timeLimit,
          points_per_question: quizForm.pointsPerQuestion,
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
      difficulty: quiz.difficulty,
      timeLimit: quiz.time_limit,
      pointsPerQuestion: quiz.points_per_question,
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
    setIsEditDialogOpen(false);    setCurrentQuiz(null);
    resetForm();
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quiz Management</h1>
          <p className="text-gray-600">Create and manage your quizzes</p>
        </div>        {/* Create Quiz Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={closeCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Quiz
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Quiz</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateQuiz} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Quiz Title</Label>
                <Input
                  id="title"
                  value={quizForm.title}
                  onChange={(e) => setQuizForm({ ...quizForm, title: e.target.value })}
                  placeholder="Enter quiz title"
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
                <Label htmlFor="difficulty">Difficulty</Label>
                <Select
                  value={quizForm.difficulty}
                  onValueChange={(value: 'easy' | 'medium' | 'hard') => 
                    setQuizForm({ ...quizForm, difficulty: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="timeLimit">Time Limit (minutes)</Label>
                  <Input
                    id="timeLimit"
                    type="number"
                    value={Math.floor(quizForm.timeLimit / 60)}
                    onChange={(e) => setQuizForm({ ...quizForm, timeLimit: parseInt(e.target.value) * 60 })}
                    min={1}
                    max={60}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pointsPerQuestion">Points per Question</Label>
                  <Input
                    id="pointsPerQuestion"
                    type="number"
                    value={quizForm.pointsPerQuestion}
                    onChange={(e) => setQuizForm({ ...quizForm, pointsPerQuestion: parseInt(e.target.value) })}
                    min={1}
                    max={100}
                  />
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
                <Label htmlFor="edit-title">Quiz Title</Label>
                <Input
                  id="edit-title"
                  value={quizForm.title}
                  onChange={(e) => setQuizForm({ ...quizForm, title: e.target.value })}
                  placeholder="Enter quiz title"
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
                <Label htmlFor="edit-difficulty">Difficulty</Label>
                <Select
                  value={quizForm.difficulty}
                  onValueChange={(value: 'easy' | 'medium' | 'hard') => 
                    setQuizForm({ ...quizForm, difficulty: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-timeLimit">Time Limit (minutes)</Label>
                  <Input
                    id="edit-timeLimit"
                    type="number"
                    value={Math.floor(quizForm.timeLimit / 60)}
                    onChange={(e) => setQuizForm({ ...quizForm, timeLimit: parseInt(e.target.value) * 60 })}
                    min={1}
                    max={60}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-pointsPerQuestion">Points per Question</Label>
                  <Input
                    id="edit-pointsPerQuestion"
                    type="number"
                    value={quizForm.pointsPerQuestion}
                    onChange={(e) => setQuizForm({ ...quizForm, pointsPerQuestion: parseInt(e.target.value) })}
                    min={1}
                    max={100}
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1">
                  Update Quiz
                </Button>                <Button type="button" variant="outline" onClick={closeEditDialog}>
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
            No quizzes created yet. Create your first quiz!
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
                  <Badge className={getDifficultyColor(quiz.difficulty)}>
                    {quiz.difficulty}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-4 text-sm text-gray-600">                    <div className="flex items-center gap-1">
                      <FileText className="h-4 w-4" />
                      {(() => {
                        if (!quiz.questions) return 0;
                        if (typeof quiz.questions === 'object' && 'length' in quiz.questions) {
                          return quiz.questions.length;
                        }
                        if (Array.isArray(quiz.questions)) {
                          return quiz.questions.length;
                        }
                        return 0;
                      })()} questions
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {Math.floor(quiz.time_limit / 60)}m
                    </div>
                    <div className="flex items-center gap-1">
                      <Award className="h-4 w-4" />
                      {quiz.points_per_question}pts
                    </div>
                  </div>                  <div className="flex gap-2">
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
