import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from "@/components/ui/badge";
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, FileText, Clock, Award, Edit, Trash2, Sparkles, Loader2, Settings } from 'lucide-react';
import { QuestionManager } from './QuestionManager';
// import { QuizGenerator } from './QuizGenerator';

// Interface untuk objek Kuis
interface Quiz {
  id: string;
  title: string;
  description: string;
  time_limit: number;
  points_per_question: number;
  created_by?: string;
  created_at: string;
  questionCount: number; // Selalu ada, dihitung dari fetch
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed';
}

// State untuk form kuis
interface QuizFormState {
  title: string;
  description: string;
  time_limit: number;
  points_per_question: number;
}

export default function QuizManagement() {
  const { profileId } = useAuth();
  const { toast } = useToast();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);

  // State untuk dialog
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    // const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);

  // State untuk form dan aksi
  const [currentQuiz, setCurrentQuiz] = useState<Quiz | null>(null);
  const [quizToDelete, setQuizToDelete] = useState<Quiz | null>(null);
  const [quizForm, setQuizForm] = useState<QuizFormState>({
    title: '',
    description: '',
    time_limit: 600,
    points_per_question: 10,
  });

  // Ambil kuis saat komponen dimuat jika profileId tersedia
  useEffect(() => {
    if (profileId) {
      fetchQuizzes();
    }
  }, [profileId]);

  const fetchQuizzes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('quizzes')
        .select(`*, questions(id, difficulty)`)
        .eq('created_by', profileId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const quizzesWithCalculatedData = data.map((quiz: any): Quiz => {
        const questions = quiz.questions || [];
        const questionCount = questions.length;
        let difficulty: 'easy' | 'medium' | 'hard' | 'mixed' = 'easy'; // Default

        if (questionCount > 0) {
          const uniqueDifficulties = new Set(questions.map((q: { difficulty: string }) => q.difficulty));
          if (uniqueDifficulties.size > 1) {
            difficulty = 'mixed';
          } else {
            // Ambil kesulitan dari satu-satunya jenis pertanyaan yang ada
            difficulty = uniqueDifficulties.values().next().value || 'easy';
          }
        }
        
        return {
          ...quiz,
          questionCount: questionCount,
          difficulty: difficulty,
        };
      });

      setQuizzes(quizzesWithCalculatedData);
    } catch (error: any) {
      toast({
        title: 'Error Fetching Quizzes',
        description: error.message,
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
      time_limit: 600,
      points_per_question: 10,
    });
  };

  // --- Handler CRUD ---
  const handleCreateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase
        .from('quizzes')
        .insert({ ...quizForm, created_by: profileId })
        .select()
        .single();

      if (error) throw error;

      toast({ title: 'Success', description: `Quiz "${data.title}" created.` });
      setIsCreateDialogOpen(false);
      fetchQuizzes(); // Refresh list
    } catch (error: any) {
      toast({ title: 'Creation Failed', description: error.message, variant: 'destructive' });
    }
  };

  const handleEditQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentQuiz) return;
    try {
      const { data, error } = await supabase
        .from('quizzes')
        .update({ ...quizForm, updated_at: new Date().toISOString() })
        .eq('id', currentQuiz.id)
        .select()
        .single();

      if (error) throw error;

      toast({ title: 'Success', description: `Quiz "${data.title}" updated.` });
      setIsEditDialogOpen(false);
      fetchQuizzes(); // Refresh list
    } catch (error: any) {
      toast({ title: 'Update Failed', description: error.message, variant: 'destructive' });
    }
  };

  const handleDeleteQuiz = async () => {
    if (!quizToDelete) return;
    try {
      // Cascade delete ditangani oleh constraint foreign key di database
      const { error } = await supabase.from('quizzes').delete().eq('id', quizToDelete.id);
      if (error) throw error;

      toast({ title: 'Success', description: `Quiz "${quizToDelete.title}" deleted.` });
      setIsDeleteConfirmOpen(false);
      setQuizToDelete(null);
      fetchQuizzes(); // Refresh list
    } catch (error: any) {
      toast({ title: 'Deletion Failed', description: error.message, variant: 'destructive' });
    }
  };

  // --- Pembuka Dialog ---
  const openCreateDialog = () => {
    resetForm();
    setIsCreateDialogOpen(true);
  };

  const openEditDialog = (quiz: Quiz) => {
    setCurrentQuiz(quiz);
    setQuizForm({
      title: quiz.title,
      description: quiz.description,
      time_limit: quiz.time_limit,
      points_per_question: quiz.points_per_question,
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (quiz: Quiz) => {
    setQuizToDelete(quiz);
    setIsDeleteConfirmOpen(true);
  };

  // --- Helper Functions ---
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes === 0) return `${remainingSeconds}s`;
    if (remainingSeconds === 0) return `${minutes}m`;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getDifficultyColor = (difficulty: 'easy' | 'medium' | 'hard' | 'mixed'): string => {
    switch (difficulty) {
      case 'easy': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'hard': return 'bg-red-500';
      case 'mixed': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  // --- Render ---
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-4 text-lg">Loading your quizzes...</p>
      </div>
    );
  }

  if (selectedQuizId) {
    return (
      <QuestionManager 
        quizId={selectedQuizId} 
        onBack={() => setSelectedQuizId(null)}
        teacherId={profileId!} 
      />
    );
  }

  return (
    <TooltipProvider>
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">My Quizzes</h1>
            <p className="mt-1 text-muted-foreground">
              Create, manage, and track your quizzes all in one place.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Create New Quiz
            </Button>
          </div>
        </div>

        {/* Content Area */}
        {quizzes.length === 0 ? (
          // Empty State
          <div className="flex flex-col items-center justify-center text-center p-12 border-2 border-dashed rounded-lg mt-8">
            <FileText className="h-16 w-16 text-muted-foreground" />
            <h2 className="mt-6 text-2xl font-semibold">No Quizzes Yet</h2>
            <p className="mt-2 mb-6 text-muted-foreground">
              It looks like you haven't created any quizzes. Get started now!
            </p>
            <Button onClick={openCreateDialog} size="lg">
              <Plus className="mr-2 h-5 w-5" />
              Create Your First Quiz
            </Button>
          </div>
        ) : (
          // Quiz Grid
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {quizzes.map((quiz) => (
              <Card key={quiz.id} className="flex flex-col shadow-md hover:shadow-xl transition-shadow duration-300 rounded-lg overflow-hidden bg-card">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start gap-2">
                    <CardTitle className="text-lg font-semibold truncate" title={quiz.title}>{quiz.title}</CardTitle>
                    <Tooltip>
                      <TooltipTrigger>
                        <Badge variant="outline" className={`${getDifficultyColor(quiz.difficulty)} text-white border-0`}>{quiz.difficulty}</Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Difficulty Level</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <CardDescription className="h-10 text-sm line-clamp-2">{quiz.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow pt-2">
                  <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1" title="Number of Questions"><FileText className="h-3 w-3" /> {quiz.questionCount} Qs</div>
                    <div className="flex items-center gap-1" title="Time Limit"><Clock className="h-3 w-3" /> {formatTime(quiz.time_limit)}</div>
                    <div className="flex items-center gap-1" title="Points per Question"><Award className="h-3 w-3" /> {quiz.points_per_question} pts</div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between items-center pt-4 mt-auto bg-muted/30 px-4 py-2">
                  <div className="flex items-center space-x-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="default" size="sm" className="!bg-black !text-white !border !border-black hover:!bg-gray-900 focus:!ring-2 focus:!ring-black focus:!ring-offset-2 shadow-lg" onClick={() => setSelectedQuizId(quiz.id)}>
                          Kelola Soal
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent><p>Kelola soal untuk kuis ini</p></TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(quiz)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent><p>Edit Quiz Details</p></TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(quiz)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent><p>Delete Quiz</p></TooltipContent>
                    </Tooltip>
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}

        {/* Dialogs */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Quiz</DialogTitle>
              <DialogDescription>Fill in the details for your new quiz.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateQuiz} className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input id="title" value={quizForm.title} onChange={(e) => setQuizForm({ ...quizForm, title: e.target.value })} required />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" value={quizForm.description} onChange={(e) => setQuizForm({ ...quizForm, description: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="time_limit">Time Limit (seconds)</Label>
                <Input id="time_limit" type="number" value={quizForm.time_limit} onChange={(e) => setQuizForm({ ...quizForm, time_limit: parseInt(e.target.value, 10) })} required />
              </div>
              <div>
                <Label htmlFor="points_per_question">Points per Question</Label>
                <Input id="points_per_question" type="number" value={quizForm.points_per_question} onChange={(e) => setQuizForm({ ...quizForm, points_per_question: parseInt(e.target.value, 10) })} required />
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
                <Button type="submit">Create Quiz</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Quiz</DialogTitle>
              <DialogDescription>Update the details for "{currentQuiz?.title}".</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEditQuiz} className="space-y-4">
              <div>
                <Label htmlFor="edit-title">Title</Label>
                <Input id="edit-title" value={quizForm.title} onChange={(e) => setQuizForm({ ...quizForm, title: e.target.value })} required />
              </div>
              <div>
                <Label htmlFor="edit-description">Description</Label>
                <Textarea id="edit-description" value={quizForm.description} onChange={(e) => setQuizForm({ ...quizForm, description: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="edit-time_limit">Time Limit (seconds)</Label>
                <Input id="edit-time_limit" type="number" value={quizForm.time_limit} onChange={(e) => setQuizForm({ ...quizForm, time_limit: parseInt(e.target.value, 10) })} required />
              </div>
              <div>
                <Label htmlFor="edit-points_per_question">Points per Question</Label>
                <Input id="edit-points_per_question" type="number" value={quizForm.points_per_question} onChange={(e) => setQuizForm({ ...quizForm, points_per_question: parseInt(e.target.value, 10) })} required />
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
                <Button type="submit">Update Quiz</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the quiz and all associated questions.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setQuizToDelete(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteQuiz}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}
