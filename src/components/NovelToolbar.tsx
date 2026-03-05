import { Button } from '@/components/ui/button';
import { Download, FileText, Save, Trash2, BookOpen } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface NovelToolbarProps {
  title: string;
  chapterCount: number;
  savedCount: number;
  onExportPdf: () => void;
  onExportDocx: () => void;
  onSave: () => void;
  onBack: () => void;
}

const NovelToolbar = ({
  title,
  chapterCount,
  savedCount,
  onExportPdf,
  onExportDocx,
  onSave,
  onBack,
}: NovelToolbarProps) => {
  return (
    <div className="h-14 border-b border-border bg-card/80 backdrop-blur-sm flex items-center px-4 gap-3">
      <Button variant="ghost" size="sm" onClick={onBack} className="font-sans-ui">
        <BookOpen className="w-4 h-4 mr-2" />
        Library
      </Button>

      <div className="h-5 w-px bg-border" />

      <div className="flex-1 min-w-0">
        <h1 className="font-sans-ui font-semibold text-sm truncate">{title}</h1>
        <p className="text-xs text-muted-foreground font-sans-ui">
          {savedCount}/{chapterCount} chapters saved
        </p>
      </div>

      <Button variant="outline" size="sm" onClick={onSave} className="font-sans-ui">
        <Save className="w-4 h-4 mr-2" />
        Save
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="default" size="sm" className="font-sans-ui">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onExportPdf} className="font-sans-ui">
            <FileText className="w-4 h-4 mr-2" />
            Download as PDF
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onExportDocx} className="font-sans-ui">
            <FileText className="w-4 h-4 mr-2" />
            Download as DOCX
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default NovelToolbar;
