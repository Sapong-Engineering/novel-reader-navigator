import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, Trash2, Info, CheckCircle2, AlertTriangle, XCircle, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  type AppNotification,
  type NotificationType,
  getNotificationHistory,
  getUnreadCount,
  markAllRead,
  clearNotificationHistory,
  subscribeNotifications,
} from '@/lib/notify';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface ChapterUpdate {
  id: string;
  novel_id: string;
  novel_title: string;
  chapter_count: number;
  discovered_at: string;
  seen: boolean;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

const typeIcon: Record<NotificationType, typeof Info> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
};

const typeColor: Record<NotificationType, string> = {
  info: 'text-primary',
  success: 'text-green-500',
  warning: 'text-yellow-500',
  error: 'text-destructive',
};

const NotificationCenter = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>(getNotificationHistory);
  const [unread, setUnread] = useState(getUnreadCount);
  const [chapterUpdates, setChapterUpdates] = useState<ChapterUpdate[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    return subscribeNotifications(() => {
      setNotifications(getNotificationHistory());
      setUnread(getUnreadCount());
    });
  }, []);

  // Fetch chapter updates
  useEffect(() => {
    if (!user) return;
    supabase
      .from('chapter_updates')
      .select('id, novel_id, novel_title, chapter_count, discovered_at, seen')
      .eq('user_id', user.id)
      .eq('seen', false)
      .order('discovered_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        setChapterUpdates((data as ChapterUpdate[]) ?? []);
      });
  }, [user, open]);

  const totalUnread = unread + chapterUpdates.length;

  const handleOpen = useCallback((isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && unread > 0) {
      markAllRead();
    }
  }, [unread]);

  const handleClear = useCallback(() => {
    clearNotificationHistory();
  }, []);

  const handleChapterUpdateClick = useCallback(async (update: ChapterUpdate) => {
    // Mark as seen
    await supabase
      .from('chapter_updates')
      .update({ seen: true })
      .eq('id', update.id);
    setChapterUpdates(prev => prev.filter(u => u.id !== update.id));
    setOpen(false);
    // Navigate to reader - novel_id is the DB uuid, but we need local id
    // For simplicity navigate to library and let user click
    navigate('/');
  }, [navigate]);

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="w-4 h-4" />
          {totalUnread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
              {totalUnread > 9 ? '9+' : totalUnread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(320px,90vw)] p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold font-sans-ui">Notifications</h3>
          <div className="flex gap-1">
            {(notifications.length > 0 || chapterUpdates.length > 0) && (
              <>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => markAllRead()} aria-label="Mark all read">
                  <Check className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={handleClear} aria-label="Clear all">
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </>
            )}
          </div>
        </div>
        <ScrollArea className="max-h-80">
          {/* Chapter update notifications */}
          {chapterUpdates.map(update => (
            <button
              key={update.id}
              className="flex gap-3 px-4 py-3 w-full text-left bg-accent/30 hover:bg-accent/50 transition-colors border-b border-border"
              onClick={() => handleChapterUpdateClick(update)}
            >
              <BookOpen className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-sans-ui text-foreground leading-snug">
                  <strong>{update.chapter_count}</strong> new chapter{update.chapter_count > 1 ? 's' : ''} for <strong className="truncate">{update.novel_title || 'a novel'}</strong>
                </p>
                <p className="text-xs text-muted-foreground font-sans-ui mt-0.5">{formatTime(update.discovered_at)}</p>
              </div>
            </button>
          ))}

          {notifications.length === 0 && chapterUpdates.length === 0 ? (
            <div className="py-8 text-center">
              <Bell className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground font-sans-ui">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map(n => {
                const Icon = typeIcon[n.type];
                return (
                  <div
                    key={n.id}
                    className={`flex gap-3 px-4 py-3 ${!n.read ? 'bg-accent/30' : ''}`}
                  >
                    <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${typeColor[n.type]}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-sans-ui text-foreground leading-snug">{n.message}</p>
                      <p className="text-xs text-muted-foreground font-sans-ui mt-0.5">{formatTime(n.timestamp)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationCenter;
