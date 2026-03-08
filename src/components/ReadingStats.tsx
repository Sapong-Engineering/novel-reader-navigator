import { useState, useEffect } from 'react';
import { BarChart3, Flame, BookOpen, Type, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface DayStat {
  date: string;
  reading_seconds: number;
  chapters_read: number;
  words_read: number;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  return remMins > 0 ? `${hrs}h ${remMins}m` : `${hrs}h`;
}

function getIntensity(seconds: number): number {
  if (seconds === 0) return 0;
  if (seconds < 300) return 1;
  if (seconds < 1200) return 2;
  if (seconds < 3600) return 3;
  return 4;
}

const intensityColors = [
  'bg-muted/40',
  'bg-primary/20',
  'bg-primary/40',
  'bg-primary/60',
  'bg-primary/80',
];

const ReadingStats = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DayStat[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const from = new Date();
    from.setDate(from.getDate() - 83); // 12 weeks
    supabase
      .from('reading_stats')
      .select('date, reading_seconds, chapters_read, words_read')
      .eq('user_id', user.id)
      .gte('date', from.toISOString().slice(0, 10))
      .order('date', { ascending: true })
      .then(({ data }) => {
        setStats((data as DayStat[]) ?? []);
        setLoading(false);
      });
  }, [user]);

  if (!user) return null;

  const statsByDate = new Map(stats.map(s => [s.date, s]));

  // Build 12-week grid
  const today = new Date();
  const days: { date: string; stat: DayStat | null }[] = [];
  for (let i = 83; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push({ date: key, stat: statsByDate.get(key) ?? null });
  }

  // Calculate streak
  let streak = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i].stat && days[i].stat!.reading_seconds > 0) streak++;
    else break;
  }

  // Totals
  const totalSeconds = stats.reduce((s, d) => s + d.reading_seconds, 0);
  const totalChapters = stats.reduce((s, d) => s + d.chapters_read, 0);
  const totalWords = stats.reduce((s, d) => s + d.words_read, 0);
  const todayStat = statsByDate.get(today.toISOString().slice(0, 10));

  // Grid: 7 rows (days of week), ~12 cols (weeks)
  const weeks: typeof days[] = [];
  let weekBuf: typeof days = [];
  // Pad start to align to Sunday
  const firstDay = new Date(days[0].date).getDay();
  for (let i = 0; i < firstDay; i++) weekBuf.push({ date: '', stat: null });
  for (const d of days) {
    weekBuf.push(d);
    if (weekBuf.length === 7) {
      weeks.push(weekBuf);
      weekBuf = [];
    }
  }
  if (weekBuf.length) weeks.push(weekBuf);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Reading stats">
          <BarChart3 className="w-4 h-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-sans-ui flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" /> Reading Stats
          </SheetTitle>
        </SheetHeader>

        {loading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading...</div>
        ) : (
          <div className="mt-6 space-y-6">
            {/* Streak & Today */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-secondary/50 p-4 text-center">
                <Flame className="w-6 h-6 text-primary mx-auto mb-1" />
                <p className="text-2xl font-bold font-sans-ui">{streak}</p>
                <p className="text-xs text-muted-foreground font-sans-ui">Day Streak</p>
              </div>
              <div className="rounded-xl bg-secondary/50 p-4 text-center">
                <Clock className="w-6 h-6 text-primary mx-auto mb-1" />
                <p className="text-2xl font-bold font-sans-ui">{formatDuration(todayStat?.reading_seconds ?? 0)}</p>
                <p className="text-xs text-muted-foreground font-sans-ui">Today</p>
              </div>
            </div>

            {/* Totals */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-muted/30 p-3 text-center">
                <Clock className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
                <p className="text-sm font-bold font-sans-ui">{formatDuration(totalSeconds)}</p>
                <p className="text-[10px] text-muted-foreground font-sans-ui">Total Time</p>
              </div>
              <div className="rounded-lg bg-muted/30 p-3 text-center">
                <BookOpen className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
                <p className="text-sm font-bold font-sans-ui">{totalChapters.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground font-sans-ui">Chapters</p>
              </div>
              <div className="rounded-lg bg-muted/30 p-3 text-center">
                <Type className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
                <p className="text-sm font-bold font-sans-ui">{totalWords >= 1000 ? `${(totalWords / 1000).toFixed(1)}k` : totalWords}</p>
                <p className="text-[10px] text-muted-foreground font-sans-ui">Words</p>
              </div>
            </div>

            {/* Contribution Grid */}
            <div>
              <p className="text-xs text-muted-foreground font-sans-ui mb-2">Last 12 weeks</p>
              <TooltipProvider delayDuration={200}>
                <div className="flex gap-[3px]">
                  {weeks.map((week, wi) => (
                    <div key={wi} className="flex flex-col gap-[3px]">
                      {week.map((day, di) => {
                        if (!day.date) return <div key={di} className="w-3 h-3" />;
                        const intensity = getIntensity(day.stat?.reading_seconds ?? 0);
                        return (
                          <Tooltip key={di}>
                            <TooltipTrigger asChild>
                              <div className={`w-3 h-3 rounded-sm ${intensityColors[intensity]} transition-colors`} />
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs font-sans-ui">
                              <p className="font-semibold">{day.date}</p>
                              <p>{formatDuration(day.stat?.reading_seconds ?? 0)} · {day.stat?.chapters_read ?? 0} ch</p>
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </TooltipProvider>
              {/* Legend */}
              <div className="flex items-center gap-1 mt-2">
                <span className="text-[10px] text-muted-foreground font-sans-ui">Less</span>
                {intensityColors.map((c, i) => (
                  <div key={i} className={`w-3 h-3 rounded-sm ${c}`} />
                ))}
                <span className="text-[10px] text-muted-foreground font-sans-ui">More</span>
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default ReadingStats;
