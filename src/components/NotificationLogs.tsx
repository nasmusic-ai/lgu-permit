import { useEffect, useState } from 'react';
import { notifications } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Mail, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function NotificationLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      const res = await notifications.getLogs();
      setLogs(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading notifications...</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No notifications found.</p>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="flex items-start gap-4 p-4 border rounded-lg bg-white">
                <div className={cn("p-2 rounded-full", log.channel === 'email' ? "bg-blue-100 text-blue-600" : "bg-green-100 text-green-600")}>
                  {log.channel === 'email' ? <Mail className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}
                </div>
                <div className="space-y-1 flex-1">
                  <div className="flex justify-between">
                    <p className="font-medium text-sm capitalize">{log.trigger_event.replace(/_/g, ' ')}</p>
                    <span className="text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-sm text-slate-600 whitespace-pre-wrap">{log.content}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
