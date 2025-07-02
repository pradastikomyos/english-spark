import { useState, useEffect } from 'react';

import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, CheckCircle, Clock, Star, Video, Headphones, FileText, BookOpen, AlertCircle } from 'lucide-react';

interface MaterialViewerProps {
  materialId: string;
  onBack: () => void;
}

interface MaterialDetails {
  id: string;
  title: string;
  description: string;
  type: string;
  category: string;
  difficulty: string;
  estimated_time: number;
  rating: number;
  url?: string;
  content?: string;
  is_completed: boolean;
}

export function MaterialViewer({ materialId, onBack }: MaterialViewerProps) {
  const { toast } = useToast();
  const [material, setMaterial] = useState<MaterialDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMaterial = async () => {
      if (!materialId) return;
      try {
        setLoading(true);
        const { data, error } = await supabase
          .rpc('get_study_material_details', { p_material_id: materialId })
          .single();

        if (error) throw error;
        if (data) {
          setMaterial(data as MaterialDetails);
        } else {
          setError('Material not found.');
        }
      } catch (err: any) {
        setError(err.message);
        console.error('Error fetching material:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMaterial();
  }, [materialId]);

  const handleMarkAsComplete = async () => {
    if (!materialId || !material) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase.from('user_material_status').upsert({
        user_id: user.id,
        material_id: materialId,
        is_completed: true,
      });

      if (error) throw error;

      setMaterial({ ...material, is_completed: true });
      toast({
        title: 'Congratulations!',
        description: 'You have completed this material.',
        className: 'bg-green-100 text-green-800',
      });
    } catch (err: any) {
      toast({
        title: 'Error',
        description: `Failed to mark as complete: ${err.message}`,
        variant: 'destructive',
      });
    }
  };

  const renderContent = () => {
    if (!material) return null;

    switch (material.type) {
      case 'video':
        return (
          <div className="aspect-w-16 aspect-h-9">
            <iframe
              src={material.url?.replace('watch?v=', 'embed/')}
              title={material.title}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full rounded-lg"
            ></iframe>
          </div>
        );
      case 'audio':
        return <audio controls src={material.url} className="w-full">Your browser does not support the audio element.</audio>;
      case 'pdf':
        return <a href={material.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Download or view PDF</a>;
      case 'article':
      case 'interactive':
        return <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: material.content || '' }} />;
      default:
        return <p>Unsupported material type.</p>;
    }
  };

  if (loading) return <div className="text-center p-10">Loading material...</div>;
  if (error) return <div className="text-center p-10 text-red-600 flex items-center justify-center"><AlertCircle className='mr-2' />Error: {error}</div>;
  if (!material) return <div className="text-center p-10">Material not found.</div>;

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <button onClick={onBack} className="flex items-center text-sm text-gray-600 hover:text-gray-900">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to all materials
      </button>

      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-bold">{material.title}</CardTitle>
          <CardDescription className="text-lg pt-2">{material.description}</CardDescription>
          <div className="flex items-center flex-wrap gap-4 pt-4 text-sm text-gray-600">
            <Badge variant="outline">{material.category}</Badge>
            <Badge variant="secondary">{material.difficulty}</Badge>
            <div className="flex items-center gap-1"><Clock className="h-4 w-4" /> {material.estimated_time} min</div>
            <div className="flex items-center gap-1"><Star className="h-4 w-4 text-yellow-400" /> {material.rating}</div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-50 p-4 rounded-lg">
            {renderContent()}
          </div>
        </CardContent>
      </Card>

      <div className="text-center">
        <Button 
          onClick={handleMarkAsComplete} 
          disabled={material.is_completed}
          size="lg"
          className={material.is_completed ? 'bg-green-600' : ''}
        >
          <CheckCircle className="h-5 w-5 mr-2" />
          {material.is_completed ? 'Completed!' : 'Mark as Complete'}
        </Button>
      </div>
    </div>
  );
}
