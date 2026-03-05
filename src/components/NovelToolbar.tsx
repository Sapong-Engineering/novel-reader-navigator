import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Download, FileText, Save, BookOpen, Loader2, CloudDownload } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';

interface NovelToolbarProps {
  title: string;
  chapterCount: number;
  savedCount: number;
  onExportPdf: () => void;
  onExportDocx: () => void;
  onSave: () => void;
  onBack: () => void;
  onFetchAll?: () => void;
  isFetchingAll?: boolean;
  fetchProgress?: { current: number; total: number };
  mobileChapterDrawer?: ReactNode;
}

const NovelToolbar = ({
  title,
  chapterCount,
  savedCount,
  onExportPdf,
  onExportDocx,
  onSave,
  onBack,
  onFetchAll,
  isFetchingAll,
  fetchProgress,
  mobileChapterDrawer,
}: NovelToolbarProps) => {
  const progressPercent = fetchProgress?.total ? (fetchProgress.current / fetchProgress.total) * 100 : 0;

  return (
    <div className="border-b border-border bg-card/80 backdrop-blur-sm">
      <div className="h-14 flex items-center px-3 sm:px-4 gap-2 sm:gap-3">
        {mobileChapterDrawer}

        <Button variant="ghost" size="sm" onClick={onBack} className="font-sans-ui hidden sm:inline-flex">
          <BookOpen className="w-4 h-4 mr-2" />
          Library
        </Button>
        <Button variant="ghost" size="icon" onClick={onBack} className="font-sans-ui sm:hidden">
          <BookOpen className="w-4 h-4" />
        </Button>

        <div className="h-5 w-px bg-border hidden sm:block" />

        <div className="flex-1 min-w-0">
          <h1 className="font-sans-ui font-semibold text-sm truncate">{title}</h1>
          <p className="text-xs text-muted-foreground font-sans-ui">
            {savedCount}/{chapterCount} chapters
          </p>
        </div>

        {onFetchAll && (
          <Button
            variant="outline"
            size="sm"
            onClick={onFetchAll}
            disabled={isFetchingAll}
            className="font-sans-ui hidden sm:inline-flex"
          >
            {isFetchingAll ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <CloudDownload className="w-4 h-4 mr-2" />
            )}
            {isFetchingAll ? `${fetchProgress?.current}/${fetchProgress?.total}` : 'Fetch All'}
          </Button>
        )}

        <Button variant="outline" size="sm" onClick={onSave} className="font-sans-ui hidden sm:inline-flex">
          <Save className="w-4 h-4 mr-2" />
          Save
        </Button>
        <Button variant="outline" size="icon" onClick={onSave} className="font-sans-ui sm:hidden">
          <Save className="w-4 h-4" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="default" size="sm" className="font-sans-ui hidden sm:inline-flex">
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
            {onFetchAll && (
              <DropdownMenuItem onClick={onFetchAll} disabled={isFetchingAll} className="font-sans-ui sm:hidden">
                <CloudDownload className="w-4 h-4 mr-2" />
                Fetch All Chapters
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Mobile export icon */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="default" size="icon" className="font-sans-ui sm:hidden">
              <Download className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onExportPdf} className="font-sans-ui">
              <FileText className="w-4 h-4 mr-2" />
              PDF
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onExportDocx} className="font-sans-ui">
              <FileText className="w-4 h-4 mr-2" />
              DOCX
            </DropdownMenuItem>
            {onFetchAll && (
              <DropdownMenuItem onClick={onFetchAll} disabled={isFetchingAll} className="font-sans-ui">
                <CloudDownload className="w-4 h-4 mr-2" />
                {isFetchingAll ? `Fetching ${fetchProgress?.current}/${fetchProgress?.total}` : 'Fetch All'}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Progress bar when fetching all */}
      {isFetchingAll && (
        <div className="px-4 pb-2">
          <Progress value={progressPercent} className="h-1.5" />
        </div>
      )}
    </div>
  );
};

export default NovelToolbar;
