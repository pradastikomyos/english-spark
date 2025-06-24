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
import { Plus, FileText, CheckCircle, XCircle, Edit, Trash2, Sparkles } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface Question {
  id: string;
  quiz_id: string;
  question_text: string;
  question_type: 'multiple_choice' | 'true_false' | 'essay';
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: 'A' | 'B' | 'C' | 'D';
  explanation?: string;
  points: number;
  order_number: number;
  created_at: string;
}

interface QuestionManagerProps {
  quizId: string;
  quizTitle?: string;
  onClose?: () => void;
  onBack?: () => void;
}

// 🎯 TEMPLATE SOAL GREETING BASICS - GURU FRIENDLY!
const GREETING_TEMPLATES = [
  {
    question_text: "What would you say when meeting someone for the first time?",
    option_a: "Good bye",
    option_b: "See you later", 
    option_c: "Nice to meet you",
    option_d: "Thank you",
    correct_answer: 'C' as 'A' | 'B' | 'C' | 'D',
    explanation: "Nice to meet you adalah ungkapan yang tepat saat bertemu seseorang untuk pertama kali"
  },
  {
    question_text: "How do you greet someone in the morning?",
    option_a: "Good night",
    option_b: "Good morning",
    option_c: "Good afternoon", 
    option_d: "Good evening",
    correct_answer: 'B' as 'A' | 'B' | 'C' | 'D',
    explanation: "Good morning digunakan untuk menyapa di pagi hari"
  },
  {
    question_text: "What is the polite way to ask someone's name?",
    option_a: "What's your name?",
    option_b: "Who are you?",
    option_c: "May I know your name?",
    option_d: "Tell me your name!",
    correct_answer: 'C' as 'A' | 'B' | 'C' | 'D',
    explanation: "May I know your name? lebih sopan dan formal"
  },
  {
    question_text: "How do you respond when someone says 'How are you?'",
    option_a: "My name is John",
    option_b: "I am fine, thank you",
    option_c: "Good bye",
    option_d: "See you tomorrow",
    correct_answer: 'B' as 'A' | 'B' | 'C' | 'D',
    explanation: "I am fine, thank you adalah respons yang tepat untuk How are you?"
  },
  {
    question_text: "What do you say when leaving someone?",
    option_a: "Hello",
    option_b: "Good morning",
    option_c: "Nice to meet you",
    option_d: "Good bye",
    correct_answer: 'D' as 'A' | 'B' | 'C' | 'D',
    explanation: "Good bye digunakan saat berpisah atau meninggalkan seseorang"
  }
];

export function QuestionManager({ quizId, quizTitle, onClose, onBack }: QuestionManagerProps) {
  const { profileId } = useAuth();
  const { toast } = useToast();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
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
    points: 10,
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
        .order('order_number', { ascending: true });

      if (error) throw error;
        console.log('📝 Quiz questions:', data);
      setQuestions((data || []) as Question[]);
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
      points: 10,
    });
  };

  // 🎯 GURU FRIENDLY: Load template langsung!
  const loadTemplate = (template: typeof GREETING_TEMPLATES[0], index: number) => {
    setQuestionForm({
      question_text: template.question_text,
      option_a: template.option_a,
      option_b: template.option_b,
      option_c: template.option_c,
      option_d: template.option_d,
      correct_answer: template.correct_answer,
      explanation: template.explanation || '',
      points: 10,
    });
    
    toast({
      title: '✨ Template Loaded!',
      description: `Template soal #${index + 1} berhasil dimuat. Tinggal edit sesuai kebutuhan!`,
    });
  };

  const handleCreateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      console.log('📝 Creating question:', questionForm);
      
      const nextOrderNumber = questions.length + 1;
      
      const { data, error } = await supabase
        .from('questions')
        .insert({
          quiz_id: quizId,
          question_text: questionForm.question_text,
          question_type: 'multiple_choice',
          option_a: questionForm.option_a,
          option_b: questionForm.option_b,
          option_c: questionForm.option_c,
          option_d: questionForm.option_d,
          correct_answer: questionForm.correct_answer,
          explanation: questionForm.explanation,
          points: questionForm.points,
          order_number: nextOrderNumber,
        })
        .select()
        .single();

      if (error) throw error;
      
      console.log('✅ Question created successfully:', data);
      
      toast({
        title: 'Success',
        description: 'Soal berhasil ditambahkan!',
      });

      setIsCreateDialogOpen(false);
      resetForm();
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
      
      const { data, error } = await supabase
        .from('questions')
        .update({
          question_text: questionForm.question_text,
          option_a: questionForm.option_a,
          option_b: questionForm.option_b,
          option_c: questionForm.option_c,
          option_d: questionForm.option_d,
          correct_answer: questionForm.correct_answer,
          explanation: questionForm.explanation,
          points: questionForm.points,
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
    setQuestionForm({
      question_text: question.question_text,
      option_a: question.option_a,
      option_b: question.option_b,
      option_c: question.option_c,
      option_d: question.option_d,
      correct_answer: question.correct_answer,
      explanation: question.explanation || '',
      points: question.points,
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
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Tambah Soal
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>✨ Tambah Soal Baru - Template Tersedia!</DialogTitle>
              </DialogHeader>
              
              {/* 🎯 TEMPLATE GREETING BASICS */}
              <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h3 className="font-semibold text-blue-900 mb-3 flex items-center">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Template Soal Greeting Basics (Tinggal Klik & Edit!)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {GREETING_TEMPLATES.map((template, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      onClick={() => loadTemplate(template, index)}
                      className="justify-start h-auto p-3 text-left"
                    >
                      <div>
                        <div className="font-medium text-sm">Soal #{index + 1}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {template.question_text.slice(0, 50)}...
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>

              <form onSubmit={handleCreateQuestion} className="space-y-4">
                <div>
                  <Label htmlFor="question_text">Pertanyaan *</Label>
                  <Textarea
                    id="question_text"
                    value={questionForm.question_text}
                    onChange={(e) => setQuestionForm({ ...questionForm, question_text: e.target.value })}
                    placeholder="Tulis pertanyaan di sini..."
                    required
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="option_a">Pilihan A *</Label>
                    <Input
                      id="option_a"
                      value={questionForm.option_a}
                      onChange={(e) => setQuestionForm({ ...questionForm, option_a: e.target.value })}
                      placeholder="Pilihan A"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="option_b">Pilihan B *</Label>
                    <Input
                      id="option_b"
                      value={questionForm.option_b}
                      onChange={(e) => setQuestionForm({ ...questionForm, option_b: e.target.value })}
                      placeholder="Pilihan B"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="option_c">Pilihan C *</Label>
                    <Input
                      id="option_c"
                      value={questionForm.option_c}
                      onChange={(e) => setQuestionForm({ ...questionForm, option_c: e.target.value })}
                      placeholder="Pilihan C"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="option_d">Pilihan D *</Label>
                    <Input
                      id="option_d"
                      value={questionForm.option_d}
                      onChange={(e) => setQuestionForm({ ...questionForm, option_d: e.target.value })}
                      placeholder="Pilihan D"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="correct_answer">Jawaban Benar *</Label>
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
                    <Label htmlFor="points">Poin</Label>
                    <Input
                      id="points"
                      type="number"
                      min="1"
                      max="100"
                      value={questionForm.points}
                      onChange={(e) => setQuestionForm({ ...questionForm, points: parseInt(e.target.value) || 10 })}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="explanation">Penjelasan (Opsional)</Label>
                  <Textarea
                    id="explanation"
                    value={questionForm.explanation}
                    onChange={(e) => setQuestionForm({ ...questionForm, explanation: e.target.value })}
                    placeholder="Jelaskan mengapa jawaban ini benar..."
                    rows={2}
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Batal
                  </Button>
                  <Button type="submit">
                    Simpan Soal
                  </Button>
                </div>
              </form>
            </DialogContent>
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
            <Button onClick={() => setIsCreateDialogOpen(true)}>
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
                  </div>
                  <h3 className="font-semibold text-lg mb-3">{question.question_text}</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div className={`p-2 rounded border ${getDifficultyColor('A', question.correct_answer)}`}>
                      <span className="font-medium">A. </span>{question.option_a}
                      {question.correct_answer === 'A' && <CheckCircle className="w-4 h-4 inline ml-2 text-green-600" />}
                    </div>
                    <div className={`p-2 rounded border ${getDifficultyColor('B', question.correct_answer)}`}>
                      <span className="font-medium">B. </span>{question.option_b}
                      {question.correct_answer === 'B' && <CheckCircle className="w-4 h-4 inline ml-2 text-green-600" />}
                    </div>
                    <div className={`p-2 rounded border ${getDifficultyColor('C', question.correct_answer)}`}>
                      <span className="font-medium">C. </span>{question.option_c}
                      {question.correct_answer === 'C' && <CheckCircle className="w-4 h-4 inline ml-2 text-green-600" />}
                    </div>
                    <div className={`p-2 rounded border ${getDifficultyColor('D', question.correct_answer)}`}>
                      <span className="font-medium">D. </span>{question.option_d}
                      {question.correct_answer === 'D' && <CheckCircle className="w-4 h-4 inline ml-2 text-green-600" />}
                    </div>
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
