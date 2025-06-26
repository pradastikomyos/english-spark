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
import { Plus, FileText, CheckCircle, XCircle, Edit, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { CreateQuestionForm } from './CreateQuestionForm';

interface Question {
  id: string;
  quiz_id: string;
  question_text: string;
  options: Record<string, string>;
  correct_answer: 'A' | 'B' | 'C' | 'D';
  explanation?: string;
  points: number;
  question_order: number;
  created_at: string;
  difficulty: 'easy' | 'medium' | 'hard'; // Add difficulty to Question interface
}

interface QuestionManagerProps {
  quizId: string;
  quizTitle?: string;
  onClose?: () => void;
  onBack?: () => void;
}

export function QuestionManager({ quizId, quizTitle, onClose, onBack }: QuestionManagerProps) {
  const { profileId } = useAuth();
  const { toast } = useToast();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateQuestionDialogOpen, setIsCreateQuestionDialogOpen] = useState(false); // Renamed state
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [questionToDelete, setQuestionToDelete] = useState<Question | null>(null);
  
  const [questionForm, setQuestionForm] = useState({
    question_text: '',
    option_a: '',
    option_b: '',
    option_c: '',
    option_d: '',
    correct_answer: 'A' as 'A' | 'B' | 'C' | 'D',
    explanation: '',
    points: 0, // Default to 0, will be set by CreateQuestionForm
    difficulty: 'medium' as 'easy' | 'medium' | 'hard', // Add difficulty to form state
  });

  useEffect(() => {
    fetchQuestions();
  }, [quizId]);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      console.log('🔍 Fetching questions for quiz:', quizId);
      
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('quiz_id', quizId)
        .order('question_order', { ascending: true });

      if (error) throw error;
        console.log('📝 Quiz questions:', data);
        console.log('Fetched questions data:', data); // Added console.log statement
      setQuestions((data || []) as any as Question[]);
    } catch (error: any) {
      console.error('❌ Fetch questions error:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch questions',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setQuestionForm({
      question_text: '',
      option_a: '',
      option_b: '',
      option_c: '',
      option_d: '',
      correct_answer: 'A',
      explanation: '',
      points: 0,
      difficulty: 'medium',
    });
  };

  const handleCreateQuestion = async (
    questionName: string,
    difficulty: 'easy' | 'medium' | 'hard',
    points: number,
    options: string[],
    correctIndex: number
  ) => {
    try {
      console.log('📝 Creating question with new format:', { questionName, difficulty, points, options, correctIndex });
      
      const nextOrderNumber = questions.length + 1;

      // Build the new 'options' JSON object
      const optionsObject = {
        'A': options[0] || '',
        'B': options[1] || '',
        'C': options[2] || '',
        'D': options[3] || '',
      };
      
      const { data, error } = await supabase
        .from('questions')
        .insert({
          quiz_id: quizId,
          question_text: questionName,
          options: optionsObject, // Use the new JSON format
          correct_answer: String.fromCharCode(65 + correctIndex) as 'A' | 'B' | 'C' | 'D',
          explanation: '',
          points: points,
          question_order: nextOrderNumber,
          difficulty: difficulty,
        })
        .select()
        .single();

      if (error) throw error;
      
      console.log('✅ Question created successfully:', data);
      
      toast({
        title: 'Success',
        description: 'Soal berhasil ditambahkan!',
      });

      setIsCreateQuestionDialogOpen(false);
      fetchQuestions();
    } catch (error: any) {
      console.error('❌ Create question error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create question',
        variant: 'destructive',
      });
    }
  };

  const handleEditQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentQuestion) return;
    
    try {
      console.log('✏️ Updating question:', currentQuestion.id, questionForm);
      
      // Build the new 'options' JSON object from the form state
      const optionsObject = {
        'A': questionForm.option_a,
        'B': questionForm.option_b,
        'C': questionForm.option_c,
        'D': questionForm.option_d,
      };

      const { data, error } = await supabase
        .from('questions')
        .update({
          question_text: questionForm.question_text,
          options: optionsObject, // Use the new JSON format
          correct_answer: questionForm.correct_answer,
          explanation: questionForm.explanation,
          points: questionForm.points,
          difficulty: questionForm.difficulty,
        })
        .eq('id', currentQuestion.id)
        .select()
        .single();
 
      if (error) throw error;
      
      console.log('✅ Question updated successfully:', data);
      
      toast({
        title: 'Success',
        description: 'Soal berhasil diperbarui!',
      });
 
      setIsEditDialogOpen(false);
      setCurrentQuestion(null);
      resetForm();
      fetchQuestions();
    } catch (error: any) {
      console.error('❌ Update question error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update question',
        variant: 'destructive',
      });
    }
  };
 
  const handleDeleteQuestion = async () => {
    if (!questionToDelete) return;
    
    try {
      console.log('🗑️ Deleting question:', questionToDelete.id);
      
      const { error } = await supabase
        .from('questions')
        .delete()
        .eq('id', questionToDelete.id);
 
      if (error) throw error;
      
      console.log('✅ Question deleted successfully');
      
      toast({
        title: 'Success',
        description: 'Soal berhasil dihapus!',
      });
 
      setIsDeleteConfirmOpen(false);
      setQuestionToDelete(null);
      fetchQuestions();
    } catch (error: any) {
      console.error('❌ Delete question error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete question',
        variant: 'destructive',
      });
    }
  };
 
  const openEditDialog = (question: Question) => {
    setCurrentQuestion(question);
    // Populate form from the 'options' object for consistency
    setQuestionForm({
      question_text: question.question_text,
      option_a: question.options?.A || '',
      option_b: question.options?.B || '',
      option_c: question.options?.C || '',
      option_d: question.options?.D || '',
      correct_answer: question.correct_answer,
      explanation: question.explanation || '',
      points: question.points,
      difficulty: question.difficulty,
    });
    setIsEditDialogOpen(true);
  };
 
  const openDeleteDialog = (question: Question) => {
    setQuestionToDelete(question);
    setIsDeleteConfirmOpen(true);
  };
 
  const getDifficultyColor = (answer: string, correct: string) => {
    return answer === correct ? 'bg-green-100 border-green-500 text-green-700' : 'bg-gray-50 border-gray-200';
  };
 
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Question Management</h2>
          <p className="text-muted-foreground">
            Kelola soal untuk quiz: <span className="font-semibold">{quizTitle}</span>
          </p>
        </div>        <div className="flex gap-2">
          {onBack && (
            <Button variant="outline" onClick={onBack}>
              ← Back to Quizzes
            </Button>
          )}
          {onClose && (
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          )}
          <Dialog open={isCreateQuestionDialogOpen} onOpenChange={setIsCreateQuestionDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setIsCreateQuestionDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Tambah Soal
              </Button>
            </DialogTrigger>
            <CreateQuestionForm
              isOpen={isCreateQuestionDialogOpen}
              onClose={() => setIsCreateQuestionDialogOpen(false)}
              onCreateQuestion={(questionName, difficulty, points, options, correctIndex) =>
                handleCreateQuestion(questionName, difficulty, points, options, correctIndex)
              }
            />
          </Dialog>
          
          <Button variant="outline" onClick={onClose}>
            Kembali ke Quiz
          </Button>
        </div>
      </div>
 
      {loading ? (
        <div className="text-center py-8">Loading questions...</div>
      ) : questions.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Belum ada soal</h3>
            <p className="text-muted-foreground mb-4">
              Mulai buat soal pertama untuk quiz ini. Gunakan template yang sudah disediakan!
            </p>
            <Button onClick={() => setIsCreateQuestionDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Tambah Soal Pertama
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {questions.map((question, index) => (
            <Card key={question.id} className="p-4">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary">Soal #{index + 1}</Badge>
                    <Badge variant="outline">{question.points} poin</Badge>
                    <Badge variant="outline" className="capitalize">{question.difficulty}</Badge>
                  </div>
                  <h3 className="font-semibold text-lg mb-3">{question.question_text}</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {question.options && Object.keys(question.options).length > 0 && Object.values(question.options).some(v => v) ? (
                      Object.entries(question.options).map(([key, value]) => (
                        <div key={key} className={`p-2 rounded border ${getDifficultyColor(key, question.correct_answer)}`}>
                          <span className="font-medium">{key}. </span>{value}
                          {question.correct_answer === key && <CheckCircle className="w-4 h-4 inline ml-2 text-green-600" />}
                        </div>
                      ))
                    ) : (
                      <div className="col-span-1 md:col-span-2 text-sm text-muted-foreground italic p-2 bg-gray-50 rounded-md">
                        Pilihan jawaban tidak tersedia untuk soal ini. Silakan klik tombol 'Edit' untuk menambahkan pilihan jawaban.
                      </div>
                    )}
                  </div>
                  
                  {question.explanation && (
                    <div className="mt-3 p-2 bg-blue-50 rounded border border-blue-200">
                      <span className="font-medium text-blue-900">Penjelasan: </span>
                      <span className="text-blue-800">{question.explanation}</span>
                    </div>
                  )}
                </div>
                
                <div className="flex gap-2 ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditDialog(question)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openDeleteDialog(question)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
 
      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Soal</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleEditQuestion} className="space-y-4">
            <div>
              <Label htmlFor="edit_question_text">Pertanyaan *</Label>
              <Textarea
                id="edit_question_text"
                value={questionForm.question_text}
                onChange={(e) => setQuestionForm({ ...questionForm, question_text: e.target.value })}
                placeholder="Tulis pertanyaan di sini..."
                required
                rows={3}
              />
            </div>
 
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_option_a">Pilihan A *</Label>
                <Input
                  id="edit_option_a"
                  value={questionForm.option_a}
                  onChange={(e) => setQuestionForm({ ...questionForm, option_a: e.target.value })}
                  placeholder="Pilihan A"
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit_option_b">Pilihan B *</Label>
                <Input
                  id="edit_option_b"
                  value={questionForm.option_b}
                  onChange={(e) => setQuestionForm({ ...questionForm, option_b: e.target.value })}
                  placeholder="Pilihan B"
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit_option_c">Pilihan C *</Label>
                <Input
                  id="edit_option_c"
                  value={questionForm.option_c}
                  onChange={(e) => setQuestionForm({ ...questionForm, option_c: e.target.value })}
                  placeholder="Pilihan C"
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit_option_d">Pilihan D *</Label>
                <Input
                  id="edit_option_d"
                  value={questionForm.option_d}
                  onChange={(e) => setQuestionForm({ ...questionForm, option_d: e.target.value })}
                  placeholder="Pilihan D"
                  required
                />
              </div>
            </div>
 
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_correct_answer">Jawaban Benar *</Label>
                <Select value={questionForm.correct_answer} onValueChange={(value: 'A' | 'B' | 'C' | 'D') => setQuestionForm({ ...questionForm, correct_answer: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih jawaban benar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A">A</SelectItem>
                    <SelectItem value="B">B</SelectItem>
                    <SelectItem value="C">C</SelectItem>
                    <SelectItem value="D">D</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit_points">Poin</Label>
                <Input
                  id="edit_points"
                  type="number"
                  min="1"
                  max="100"
                  value={questionForm.points}
                  onChange={(e) => setQuestionForm({ ...questionForm, points: parseInt(e.target.value) || 10 })}
                />
              </div>
            </div>
 
            <div>
              <Label htmlFor="edit_explanation">Penjelasan (Opsional)</Label>
              <Textarea
                id="edit_explanation"
                value={questionForm.explanation}
                onChange={(e) => setQuestionForm({ ...questionForm, explanation: e.target.value })}
                placeholder="Jelaskan mengapa jawaban ini benar..."
                rows={2}
              />
            </div>
 
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Batal
              </Button>
              <Button type="submit">
                Simpan Perubahan
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
 
      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Soal</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus soal ini? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteQuestion}>
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
