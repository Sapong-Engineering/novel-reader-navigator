import { useState, useEffect } from 'react';
import { adminApi, type AdminStats } from '@/lib/api/admin';
import { Loader2, Users, BookOpen, FileText } from 'lucide-react';
import { Card } from '@/components/ui/card';

const Analytics = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getStats()
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!stats) return <p className="text-muted-foreground text-sm">Failed to load stats.</p>;

  const cards = [
    { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'text-primary' },
    { label: 'Total Novels', value: stats.totalNovels, icon: BookOpen, color: 'text-accent' },
    { label: 'Total Chapters', value: stats.totalChapters, icon: FileText, color: 'text-muted-foreground' },
  ];

  return (
    <div className="space-y-6">
      <h2 className="font-sans-ui font-semibold text-foreground">Dashboard</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {cards.map((c) => (
          <Card key={c.label} className="p-5 flex items-center gap-4">
            <div className={`p-3 rounded-lg bg-muted ${c.color}`}>
              <c.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold font-sans-ui text-foreground">{c.value.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground font-sans-ui">{c.label}</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Analytics;
