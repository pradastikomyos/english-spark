import { useState, ChangeEvent, FormEvent, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

interface Option {
  text: string;
  isCorrect: boolean;
}

interface CreateQuestionFormProps {
  quizId: string;
  isOpen: boolean;
  onClose: () => void;
  onQuestionCreated: () => void;
  isAdmin?: boolean;
}

const CreateQuestionForm = ({ quizId, isOpen, onClose, onQuestionCreated, isAdmin = false }: CreateQuestionFormProps) => {
  const [questionName, setQuestionName] = useState('');
  const [difficulty, setDifficulty] = useState('easy');
  const [points, setPoints] = useState(2);
  const [options, setOptions] = useState<Option[]>([
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
  ]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [explanation, setExplanation] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    switch (difficulty) {
      case 'easy':
        setPoints(2);
        break;
      case 'medium':
        setPoints(5);
        break;
      case 'hard':
        setPoints(10);
        break;
    }
  }, [difficulty]);

  const handleOptionChange = (index: number, text: string) => {
    const newOptions = [...options];
    newOptions[index].text = text;
    setOptions(newOptions);
  };

  const handleCorrectOptionChange = (index: number) => {
    const newOptions = options.map((option, i) => ({
      ...option,
      isCorrect: i === index,
    }));
    setOptions(newOptions);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setUploading(true);

    let mediaUrl: string | null = null;

    try {
      // 1. Handle media URL from YouTube link or file upload
      if (youtubeUrl.trim()) {
        mediaUrl = youtubeUrl.trim();
      } else if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('question-media')
          .upload(filePath, selectedFile);

        if (uploadError) {
          throw uploadError;
        }

        const { data: urlData } = supabase.storage
          .from('question-media')
          .getPublicUrl(filePath);
        
        mediaUrl = urlData.publicUrl;
      }

      // 2. Insert question data into the database
      const correctOption = options.find(opt => opt.isCorrect);
      const correct_answer_char = correctOption ? String.fromCharCode(65 + options.indexOf(correctOption)) : null;

      if (!correct_answer_char) {
        throw new Error('Please select a correct option for the question.');
      }

      const optionsObject = options.reduce((acc, opt, idx) => {
        if (opt.text.trim() !== '') {
          acc[String.fromCharCode(65 + idx)] = opt.text;
        }
        return acc;
      }, {} as Record<string, string>);

      const query = isAdmin
        ? supabase.rpc('create_question_admin', {
            p_quiz_id: quizId,
            p_question_text: questionName,
            p_options: optionsObject,
            p_correct_answer: correct_answer_char,
            p_explanation: explanation,
            p_points: points,
            p_difficulty: difficulty,
            p_media_url: mediaUrl,
          })
        : supabase.from('questions').insert({
            quiz_id: quizId,
            question_text: questionName,
            difficulty: difficulty,
            points: points,
            media_url: mediaUrl,
            correct_answer: correct_answer_char,
            options: optionsObject,
            explanation: explanation,
          });

      const { error: questionError } = await query;

      if (questionError) {
        throw questionError;
      }

      onQuestionCreated();
      onClose();
    } catch (err: any) {
      console.error('Error creating question:', err);
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Create New Question</DialogTitle>
          <DialogDescription>
            Enter the name, options, and details for your new question.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Question Name
              </Label>
              <Input id="name" value={questionName} onChange={(e) => setQuestionName(e.target.value)} className="col-span-3" required />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="media" className="text-right">
                Image/Audio
              </Label>
              <Input id="media" type="file" onChange={handleFileChange} className="col-span-3" accept="image/*,audio/*" />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="youtube" className="text-right">
                YouTube URL
              </Label>
              <Input id="youtube" value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)} className="col-span-3" placeholder="e.g., https://www.youtube.com/watch?v=..." />
            </div>

            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="explanation" className="text-right pt-2">
                Explanation
              </Label>
              <Textarea id="explanation" value={explanation} onChange={(e) => setExplanation(e.target.value)} className="col-span-3" placeholder="Explain why the correct answer is right..." />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="difficulty" className="text-right">
                Difficulty
              </Label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select difficulty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy (2 pts)</SelectItem>
                  <SelectItem value="medium">Medium (5 pts)</SelectItem>
                  <SelectItem value="hard">Hard (10 pts)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="points" className="text-right">
                Points
              </Label>
              <Input id="points" type="number" value={points} className="col-span-3" readOnly />
            </div>

            <div className="mt-4">
              <Label>Options</Label>
              <div className="grid gap-2 mt-2">
                {options.map((option, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      placeholder={`Option ${String.fromCharCode(65 + index)}`}
                      value={option.text}
                      onChange={(e) => handleOptionChange(index, e.target.value)}
                    />
                    <input
                      type="radio"
                      name="correct-option"
                      checked={option.isCorrect}
                      onChange={() => handleCorrectOptionChange(index)}
                      className="form-radio h-5 w-5 text-indigo-600"
                    />
                    <Label>Correct</Label>
                  </div>
                ))}
              </div>
            </div>
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={uploading}>
              {uploading ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateQuestionForm;
