
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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
  created_at: string;
  questions?: Question[];
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
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [currentQuiz, setCurrentQuiz] = useState<Quiz | null>(null);
  
  const [quizForm, setQuizForm] = useState({
    title: '',
    description: '',
    difficulty: 'medium' as 'easy' | 'medium' | 'hard',
    timeLimit: 600,
    pointsPerQuestion: 10,
  });

  const [questions, setQuestions] = useState<Omit<Question, 'id'>[]>([
    {
      question_text: '',
      option_a: '',
      option_b: '',
      option_c: '',
      option_d: '',
      correct_answer: 'A',
      points: 10,
    }
  ]);

  useEffect(() => {
    if (profileId) {
      fetchQuizzes();
    }
  }, [profileId]);

  const fetchQuizzes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('quizzes')
        .select(`
          *,
          questions(*)
        `)
        .eq('created_by', profileId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQuizzes(data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to fetch quizzes',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        question_text: '',
        option_a: '',
        option_b: '',
        option_c: '',
        option_d: '',
        correct_answer: 'A',
        points: quizForm.pointsPerQuestion,
      }
    ]);
  };

  const updateQuestion = (index: number, field: string, value: string | number) => {
    const updatedQuestions = [...questions];
    updatedQuestions[index] = { ...updatedQuestions[index], [field]: value };
    setQuestions(updatedQuestions);
  };

  const removeQuestion = (index: number) => {
    if (questions.length > 1) {
      setQuestions(questions.filter((_, i) => i !== index));
    }
  };

  const handleCreateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Validate questions
      const validQuestions = questions.filter(q => 
        q.question_text.trim() && 
        q.option_a.trim() && 
        q.option_b.trim() && 
        q.option_c.trim() && 
        q.option_d.trim()
      );

      if (validQuestions.length === 0) {
        toast({
          title: 'Error',
          description: 'Please add at least one complete question',
          variant: 'destructive',
        });
        return;
      }

      // Create quiz
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

      // Create questions
      const questionsToInsert = validQuestions.map(q => ({
        ...q,
        quiz_id: quiz.id,
      }));

      const { error: questionsError } = await supabase
        .from('questions')
        .insert(questionsToInsert);

      if (questionsError) throw questionsError;

      toast({
        title: 'Success',
        description: 'Quiz created successfully',
      });

      setIsCreateDialogOpen(false);
      resetForm();
      fetchQuizzes();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create quiz',
        variant: 'destructive',
      });
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
    setQuestions([
      {
        question_text: '',
        option_a: '',
        option_b: '',
        option_c: '',
        option_d: '',
        correct_answer: 'A',
        points: 10,
      }
    ]);
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
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Quiz
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Quiz</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateQuiz} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="timeLimit">Time Limit (seconds)</Label>
                  <Input
                    id="timeLimit"
                    type="number"
                    value={quizForm.timeLimit}
                    onChange={(e) => setQuizForm({ ...quizForm, timeLimit: parseInt(e.target.value) })}
                    min={60}
                    max={3600}
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

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Questions</h3>
                  <Button type="button" onClick={addQuestion} variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Question
                  </Button>
                </div>

                {questions.map((question, index) => (
                  <Card key={index}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">Question {index + 1}</CardTitle>
                        {questions.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeQuestion(index)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>Question Text</Label>
                        <Textarea
                          value={question.question_text}
                          onChange={(e) => updateQuestion(index, 'question_text', e.target.value)}
                          placeholder="Enter your question"
                          rows={2}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Option A</Label>
                          <Input
                            value={question.option_a}
                            onChange={(e) => updateQuestion(index, 'option_a', e.target.value)}
                            placeholder="Option A"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Option B</Label>
                          <Input
                            value={question.option_b}
                            onChange={(e) => updateQuestion(index, 'option_b', e.target.value)}
                            placeholder="Option B"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Option C</Label>
                          <Input
                            value={question.option_c}
                            onChange={(e) => updateQuestion(index, 'option_c', e.target.value)}
                            placeholder="Option C"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Option D</Label>
                          <Input
                            value={question.option_d}
                            onChange={(e) => updateQuestion(index, 'option_d', e.target.value)}
                            placeholder="Option D"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Correct Answer</Label>
                        <Select
                          value={question.correct_answer}
                          onValueChange={(value) => updateQuestion(index, 'correct_answer', value)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="A">A</SelectItem>
                            <SelectItem value="B">B</SelectItem>
                            <SelectItem value="C">C</SelectItem>
                            <SelectItem value="D">D</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="flex gap-2">
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
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <FileText className="h-4 w-4" />
                      {quiz.questions?.length || 0} questions
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {Math.floor(quiz.time_limit / 60)}m
                    </div>
                    <div className="flex items-center gap-1">
                      <Award className="h-4 w-4" />
                      {quiz.points_per_question}pts
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <Button variant="outline" size="sm" className="text-red-600">
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
