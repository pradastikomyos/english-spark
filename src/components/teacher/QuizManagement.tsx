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
import { Plus, FileText, Clock, Award, Edit, Trash2, Sparkles, BookOpen, GraduationCap, MessageCircle, Timer, Zap, Star, Target } from 'lucide-react';
import { QuestionManager } from './QuestionManager';
interface Quiz {
  id: string;
  title: string;
  description: string;
  teacher_id?: string;
  created_by?: string;
  status?: string;
  created_at: string;
  updated_at?: string;
  questionCount?: number;
}

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
  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);
  const [quizForm, setQuizForm] = useState({
    title: '',
    description: '',
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
      
      const response = await (supabase as any)
        .from('quizzes')
        .select('*')
        .eq('created_by', profileId)
        .order('created_at', { ascending: false });

      if (response.error) {
        console.error('❌ Fetch error:', response.error);
        throw response.error;
      }

      const quizData = response.data || [];
      console.log('📚 Teacher quizzes:', quizData);
      
      // Get question counts for each quiz
      const quizzesWithCounts = await Promise.all(
        quizData.map(async (quiz: any) => {
          const { count } = await (supabase as any)
            .from('questions')
            .select('*', { count: 'exact' })
            .eq('quiz_id', quiz.id);
          
          return {
            ...quiz,
            questionCount: count || 0
          };
        })
      );
      
      setQuizzes(quizzesWithCounts);
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

  const handleCreateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      console.log('🎯 Creating quiz basic (no questions yet):', quizForm);
      
      const { data: quiz, error: quizError } = await supabase
        .from('quizzes')
        .insert({
          title: quizForm.title,
          description: quizForm.description,
          created_by: profileId,
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
      setQuizForm({
        title: '',
        description: '',
      });
      setSelectedQuizId(quiz.id); // Redirect to QuestionManager for the new quiz
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
      setQuizForm({
        title: '',
        description: '',
      });
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
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (quiz: Quiz) => {
    setQuizToDelete(quiz);
    setIsDeleteConfirmOpen(true);
  };

  const closeCreateDialog = () => {
    setIsCreateDialogOpen(false);
    setQuizForm({
      title: '',
      description: '',
    });
  };

  const closeEditDialog = () => {
    setIsEditDialogOpen(false);
    setCurrentQuiz(null);
    setQuizForm({
      title: '',
      description: '',
    });
  };

  if (selectedQuizId) {
    return (
      <QuestionManager
        quizId={selectedQuizId}
        onBack={() => setSelectedQuizId(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quiz Management</h1>
          <p className="text-gray-600">Create and manage your English quizzes</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create Quiz
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Quiz</DialogTitle>
            </DialogHeader>
            
            {/* Custom Quiz Form */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Custom Quiz Details</h3>
              <form onSubmit={handleCreateQuiz} className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <Label htmlFor="title">Quiz Title</Label>
                    <Input
                      id="title"
                      value={quizForm.title}
                      onChange={(e) => setQuizForm({ ...quizForm, title: e.target.value })}
                      placeholder="Enter quiz title"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={quizForm.description}
                      onChange={(e) => setQuizForm({ ...quizForm, description: e.target.value })}
                      placeholder="Describe what this quiz covers"
                      rows={3}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={closeCreateDialog}>
                    Cancel
                  </Button>
                  <Button type="submit">Create Quiz</Button>
                </div>
              </form>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Quiz List */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading quizzes...</p>
        </div>
      ) : quizzes.length === 0 ? (
        <Card className="p-8 text-center">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No quizzes yet</h3>
          <p className="text-gray-600 mb-4">Create your first quiz to get started!</p>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Quiz
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quizzes.map((quiz) => (
            <Card key={quiz.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{quiz.title}</CardTitle>
                    <CardDescription className="mt-1">{quiz.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Questions: {quiz.questionCount || 0}</span>
                    <span className="text-gray-500">
                      {new Date(quiz.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => setSelectedQuizId(quiz.id)}
                    >
                      <FileText className="h-4 w-4 mr-1" />
                      Kelola Soal
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEditDialog(quiz)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openDeleteDialog(quiz)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Quiz</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditQuiz} className="space-y-4">
            <div>
              <Label htmlFor="edit-title">Quiz Title</Label>
              <Input
                id="edit-title"
                value={quizForm.title}
                onChange={(e) => setQuizForm({ ...quizForm, title: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={quizForm.description}
                onChange={(e) => setQuizForm({ ...quizForm, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={closeEditDialog}>
                Cancel
              </Button>
              <Button type="submit">Update Quiz</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the quiz "{quizToDelete?.title}" and all its questions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteQuiz} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
