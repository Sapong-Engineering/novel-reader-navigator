import { useCallback, useRef, useState } from 'react';
import { FileUp, Loader2, UploadCloud } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PdfUploadInputProps {
  onSelectFile: (file: File) => Promise<void>;
  isLoading: boolean;
  progress?: {
    stage: string;
    current: number;
    total: number;
    message: string;
  } | null;
}

const PdfUploadInput = ({ onSelectFile, isLoading, progress }: PdfUploadInputProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = useCallback(async (files: FileList | null) => {
    const file = files?.[0];
    if (!file || isLoading) return;
    await onSelectFile(file);
  }, [isLoading, onSelectFile]);

  return (
    <div
      className={`rounded-2xl border border-dashed p-6 sm:p-8 bg-card/70 transition-colors ${
        isDragging ? 'border-primary bg-primary/5' : 'border-border'
      }`}
      onDragOver={(event) => {
        event.preventDefault();
        if (!isLoading) setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragging(false);
        void handleFiles(event.dataTransfer.files);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(event) => {
          void handleFiles(event.target.files);
          event.target.value = '';
        }}
      />

      <div className="flex flex-col items-center text-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center">
          {isLoading ? (
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          ) : (
            <UploadCloud className="w-6 h-6 text-primary" />
          )}
        </div>

        <div className="space-y-1.5">
          <h3 className="font-sans-ui font-semibold text-lg text-foreground">
            Upload a PDF
          </h3>
          <p className="font-sans-ui text-sm text-muted-foreground max-w-lg">
            Drop a PDF here or browse from your device. This first slice stores the file locally and prepares it for the upcoming page-faithful reader, OCR, and audio pipeline.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <Button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={isLoading}
            className="font-sans-ui"
          >
            <FileUp className="w-4 h-4 mr-2" />
            Choose PDF
          </Button>
          <p className="font-sans-ui text-xs text-muted-foreground">
            PDF only, up to 50 MB for the first release
          </p>
        </div>

        {progress && (
          <div className="w-full max-w-md rounded-xl border border-border bg-background/80 px-4 py-3 text-left">
            <p className="font-sans-ui text-sm text-foreground">{progress.message}</p>
            <p className="font-sans-ui text-xs text-muted-foreground mt-1">
              Step {progress.current} of {progress.total} · {progress.stage}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PdfUploadInput;
