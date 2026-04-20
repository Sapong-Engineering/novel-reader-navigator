import { lazy, Suspense, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { getNovel, isPdfNovel, type Novel } from '@/lib/novel-store';

const PdfReaderView = lazy(() => import('@/components/pdf/PdfReaderView'));
const WebReader = lazy(() => import('./WebReader'));

const Reader = () => {
  const { novelId } = useParams<{ novelId: string }>();
  const navigate = useNavigate();
  const [novel, setNovel] = useState<Novel | null>(null);

  useEffect(() => {
    if (!novelId) {
      toast.error('Novel not found in library. Please go back and try again.');
      navigate('/');
      return;
    }

    const stored = getNovel(novelId);
    if (!stored) {
      toast.error('Novel not found in library. Please go back and try again.');
      navigate('/');
      return;
    }
    setNovel(stored);
  }, [novelId, navigate]);

  if (!novel) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground font-sans-ui">Loading...</p>
      </div>
    );
  }

  return isPdfNovel(novel)
    ? (
      <Suspense fallback={null}>
        <PdfReaderView novel={novel} onBack={() => navigate('/')} />
      </Suspense>
    )
    : (
      <Suspense fallback={null}>
        <WebReader novelId={novel.id} />
      </Suspense>
    );
};

export default Reader;
