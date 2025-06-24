import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Zap, Target, Star } from 'lucide-react';

interface Option {
  text: string;
}

interface CreateQuestionFormProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateQuestion: (
    questionName: string,
    difficulty: 'easy' | 'medium' | 'hard',
    points: number,
    options: string[],
    correctIndex: number
  ) => void;
}

export function CreateQuestionForm({ isOpen, onClose, onCreateQuestion }: CreateQuestionFormProps) {
  const [questionName, setQuestionName] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [points, setPoints] = useState(3); // Default points for medium difficulty
  const [options, setOptions] = useState<Option[]>(
    [
      { text: '' },
      { text: '' },
      { text: '' },
      { text: '' },
    ]
  );
  const [correctIndex, setCorrectIndex] = useState(0);

  const getDifficultyIcon = (diff: string) => {
    switch (diff) {
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

  const handleDifficultyChange = (value: 'easy' | 'medium' | 'hard') => {
    setDifficulty(value);
    if (value === 'easy') setPoints(2);
    else if (value === 'medium') setPoints(3);
    else if (value === 'hard') setPoints(5);
  };

  const handleOptionChange = (idx: number, value: string) => {
    setOptions((prev) => prev.map((opt, i) => (i === idx ? { text: value } : opt)));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      questionName.trim() &&
      options.every((opt) => opt.text.trim() !== '') &&
      correctIndex >= 0 &&
      correctIndex < options.length
    ) {
      onCreateQuestion(
        questionName,
        difficulty,
        points,
        options.map((o) => o.text),
        correctIndex
      );
      setQuestionName('');
      setDifficulty('medium');
      setPoints(3);
      setOptions([{ text: '' }, { text: '' }, { text: '' }, { text: '' }]);
      setCorrectIndex(0);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Question</DialogTitle>
          <DialogDescription>
            Enter the name, options, and details for your new question.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="questionName" className="text-right">
              Question Name
            </Label>
            <Input
              id="questionName"
              value={questionName}
              onChange={(e) => setQuestionName(e.target.value)}
              className="col-span-3"
              placeholder="Enter question name"
              required
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="difficulty" className="text-right">
              Difficulty
            </Label>
            <Select
              value={difficulty}
              onValueChange={handleDifficultyChange}
            >
              <SelectTrigger className="col-span-3">
                <div className="flex items-center gap-2">
                  {getDifficultyIcon(difficulty)}
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="easy">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-green-500" />
                    Easy (2 pts)
                  </div>
                </SelectItem>
                <SelectItem value="medium">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-yellow-500" />
                    Medium (3 pts)
                  </div>
                </SelectItem>
                <SelectItem value="hard">
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-red-500" />
                    Hard (5 pts)
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="points" className="text-right">
              Points
            </Label>
            <Input
              id="points"
              type="number"
              value={points}
              onChange={(e) => setPoints(parseInt(e.target.value))}
              className="col-span-3"
              min={1}
              required
              readOnly // Points are derived from difficulty
            />
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
            <Label className="text-right pt-2">Options</Label>
            <div className="col-span-3 flex flex-col gap-2">
              {options.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    type="text"
                    value={opt.text}
                    onChange={(e) => handleOptionChange(idx, e.target.value)}
                    placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                    required
                  />
                  <input
                    type="radio"
                    name="correctOption"
                    checked={correctIndex === idx}
                    onChange={() => setCorrectIndex(idx)}
                    className="accent-blue-600"
                  />
                  <span className="text-xs">Correct</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Create</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
