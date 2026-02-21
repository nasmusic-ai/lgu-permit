import { useEffect, useState } from 'react';
import { notifications } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function NotificationTemplates() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const navigate = useNavigate();

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const res = await notifications.getTemplates();
      setTemplates(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (template: any) => {
    setEditingId(template.id);
    setEditForm(template);
  };

  const handleSave = async () => {
    try {
      await notifications.updateTemplate(editingId!, editForm);
      setEditingId(null);
      loadTemplates();
    } catch (error) {
      console.error(error);
      alert('Failed to update template');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  if (loading) return <div>Loading templates...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/dashboard')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
        </Button>
        <h1 className="text-2xl font-bold">Notification Templates</h1>
      </div>

      <div className="grid gap-6">
        {templates.map((template) => (
          <Card key={template.id}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{template.name}</CardTitle>
              {editingId !== template.id && (
                <Button variant="outline" size="sm" onClick={() => handleEdit(template)}>Edit</Button>
              )}
            </CardHeader>
            <CardContent>
              {editingId === template.id ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Email Subject</Label>
                    <Input name="email_subject" value={editForm.email_subject} onChange={handleChange} />
                  </div>
                  <div className="space-y-2">
                    <Label>Email Body Template</Label>
                    <textarea 
                      name="email_body" 
                      className="flex min-h-[100px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950"
                      value={editForm.email_body} 
                      onChange={handleChange} 
                    />
                    <p className="text-xs text-muted-foreground">Available variables: {'{{full_name}}, {{business_name}}, {{application_id}}'}</p>
                  </div>
                  <div className="space-y-2">
                    <Label>SMS Body Template</Label>
                    <Input name="sms_body" value={editForm.sms_body} onChange={handleChange} />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                    <Button onClick={handleSave}>Save Changes</Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 text-sm">
                  <div>
                    <span className="font-semibold">Email Subject:</span> {template.email_subject}
                  </div>
                  <div>
                    <span className="font-semibold">Email Body:</span>
                    <pre className="mt-1 whitespace-pre-wrap font-sans text-slate-600 bg-slate-50 p-2 rounded">{template.email_body}</pre>
                  </div>
                  <div>
                    <span className="font-semibold">SMS:</span> {template.sms_body}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
