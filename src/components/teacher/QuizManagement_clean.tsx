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
import { Plus, FileText, Clock, Award, Edit, Trash2, Sparkles, BookOpen, GraduationCap, MessageCircle, Timer, Zap, Star, Target, Send } from 'lucide-react';
import { QuestionManager } from './QuestionManager';

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
    difficulty: 'medium' as 'easy' | 'medium' | 'hard',
    timeLimit: 600,
    pointsPerQuestion: 10,
  });

  // Template quiz data dengan kategori difficulty dan timer menarik
  const quizTemplates = [
    {
      title: 'Greeting Basics',
      description: 'Master the fundamental greetings in English',
      difficulty: 'easy' as const,
      timeLimit: 300,
      pointsPerQuestion: 10,
      category: 'Communication',
      icon: MessageCircle,
      color: 'bg-green-100 border-green-200 text-green-800',
      badgeColor: 'bg-green-500',
      questions: [
        {
          question: 'How do you greet someone in the morning?',
          options: ['Good morning', 'Good night', 'Good evening', 'Goodbye'],
          correct: 'Good morning'
        }
      ]
    },
    {
      title: 'Daily Vocabulary',
      description: 'Essential words for everyday conversations',
      difficulty: 'medium' as const,
      timeLimit: 600,
      pointsPerQuestion: 15,
      category: 'Vocabulary',
      icon: BookOpen,
      color: 'bg-blue-100 border-blue-200 text-blue-800',
      badgeColor: 'bg-blue-500',
      questions: [
        {
          question: 'What do you call the first meal of the day?',
          options: ['Dinner', 'Lunch', 'Breakfast', 'Snack'],
          correct: 'Breakfast'
        }
      ]
    },
    {
      title: 'Business English',
      description: 'Professional communication skills',
      difficulty: 'hard' as const,
      timeLimit: 900,
      pointsPerQuestion: 20,
      category: 'Professional',
      icon: GraduationCap,
      color: 'bg-red-100 border-red-200 text-red-800',
      badgeColor: 'bg-red-500',
      questions: [
        {
          question: 'How do you start a formal business meeting?',
          options: ['Hi everyone', 'Good morning, shall we begin?', 'Hey guys', 'Let\'s start'],
          correct: 'Good morning, shall we begin?'
        }
      ]
    }
  ];

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes === 0) return `${remainingSeconds}s`;
    if (remainingSeconds === 0) return `${minutes}m`;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getDifficultyIcon = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return <Zap className="h-4 w-4 text-green-500" />;
      case 'medium':
        return <Target className="h-4 w-4 text-yellow-500" />;
      case 'hard':
        return <Star className="h-4 w-4 text-red-500" />;
      default:
        return <Target className="h-4 w-4 text-gray-500" />;
    }
  };

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

  const resetForm = () => {
    setQuizForm({
      title: '',
      description: '',
      difficulty: 'medium',
      timeLimit: 600,
      pointsPerQuestion: 10,
    });
  };

  const handleTemplateSelect = (template: any) => {
    setQuizForm({
      title: template.title,
      description: template.description,
      difficulty: template.difficulty,
      timeLimit: template.timeLimit,
      pointsPerQuestion: template.pointsPerQuestion,
    });
    toast({
      title: '🌟 Template Selected!',
      description: `${template.title} template loaded successfully`,
    });
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
          difficulty: quizForm.difficulty,
          time_limit: quizForm.timeLimit,
          points_per_question: quizForm.pointsPerQuestion,
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
    setIsEditDialogOpen(false);
    setCurrentQuiz(null);
    resetForm();
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
            
            {/* Quick Templates Section */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-yellow-500" />
                  Quick Templates
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {quizTemplates.map((template, index) => (
                    <Card 
                      key={index} 
                      className={`cursor-pointer transition-all hover:shadow-md border-2 hover:border-blue-300 ${template.color}`}
                      onClick={() => handleTemplateSelect(template)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <template.icon className="h-5 w-5" />
                            <h4 className="font-medium text-sm">{template.title}</h4>
                          </div>
                          <div className="flex items-center gap-1">
                            {getDifficultyIcon(template.difficulty)}
                            <Badge variant="secondary" className={`text-xs ${template.badgeColor} text-white`}>
                              {template.difficulty}
                            </Badge>
                          </div>
                        </div>
                        <p className="text-xs text-gray-600 mb-2">{template.description}</p>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>{formatTime(template.timeLimit)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Award className="h-3 w-3" />
                            <span>{template.pointsPerQuestion}pts</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Custom Quiz Form */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Custom Quiz Details</h3>
                <form onSubmit={handleCreateQuiz} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      <Label htmlFor="difficulty">Difficulty Level</Label>
                      <Select
                        value={quizForm.difficulty}
                        onValueChange={(value: 'easy' | 'medium' | 'hard') =>
                          setQuizForm({ ...quizForm, difficulty: value })
                        }
                      >
                        <SelectTrigger>
                          <div className="flex items-center gap-2">
                            {getDifficultyIcon(quizForm.difficulty)}
                            <SelectValue />
                          </div>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="easy">
                            <div className="flex items-center gap-2">
                              <Zap className="h-4 w-4 text-green-500" />
                              Easy
                            </div>
                          </SelectItem>
                          <SelectItem value="medium">
                            <div className="flex items-center gap-2">
                              <Target className="h-4 w-4 text-yellow-500" />
                              Medium
                            </div>
                          </SelectItem>
                          <SelectItem value="hard">
                            <div className="flex items-center gap-2">
                              <Star className="h-4 w-4 text-red-500" />
                              Hard
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="timeLimit">Time Limit (seconds)</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="timeLimit"
                          type="number"
                          value={quizForm.timeLimit}
                          onChange={(e) => setQuizForm({ ...quizForm, timeLimit: parseInt(e.target.value) })}
                          min={60}
                          max={3600}
                        />
                        <div className="flex items-center gap-1 text-sm text-gray-500 whitespace-nowrap">
                          <Timer className="h-4 w-4" />
                          Timer: {formatTime(quizForm.timeLimit)}
                        </div>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="pointsPerQuestion">Points per Question</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="pointsPerQuestion"
                          type="number"
                          value={quizForm.pointsPerQuestion}
                          onChange={(e) => setQuizForm({ ...quizForm, pointsPerQuestion: parseInt(e.target.value) })}
                          min={1}
                          max={100}
                        />
                        <div className="flex items-center gap-1 text-sm text-gray-500 whitespace-nowrap">
                          <Award className="h-4 w-4" />
                          {quizForm.pointsPerQuestion}pts
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={resetForm}>
                      Reset
                    </Button>
                    <Button type="button" variant="outline" onClick={closeCreateDialog}>
                      Cancel
                    </Button>
                    <Button type="submit">Create Quiz</Button>
                  </div>
                </form>
              </div>
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
                  <div className="flex items-center gap-1 ml-2">
                    {getDifficultyIcon(quiz.difficulty)}
                    <Badge 
                      variant={quiz.difficulty === 'easy' ? 'default' : quiz.difficulty === 'medium' ? 'secondary' : 'destructive'}
                      className="capitalize"
                    >
                      {quiz.difficulty}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>{formatTime(quiz.time_limit)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Award className="h-4 w-4" />
                      <span>{quiz.points_per_question} pts</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Questions: {quiz.questionCount || 0}</span>
                    <span className="text-gray-500">
                      {new Date(quiz.created_at).toLocaleDateString()}
                    </span>
                  </div>                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => setSelectedQuizId(quiz.id)}
                    >
                      <FileText className="h-4 w-4 mr-1" />
                      Kelola Soal
                    </Button>
                    {(quiz.questionCount || 0) > 0 && (
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => {
                          toast({
                            title: '🎯 Assignment Feature',
                            description: 'Go to Assignment tab to assign this quiz to classes',
                          });
                        }}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    )}
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
            <div className="grid grid-cols-2 gap-4">
              <div>
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
              <div>
                <Label htmlFor="edit-timeLimit">Time Limit (seconds)</Label>
                <Input
                  id="edit-timeLimit"
                  type="number"
                  value={quizForm.timeLimit}
                  onChange={(e) => setQuizForm({ ...quizForm, timeLimit: parseInt(e.target.value) })}
                  min={60}
                  max={3600}
                />
              </div>
            </div>
            <div>
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
