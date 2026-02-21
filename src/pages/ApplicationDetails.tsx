import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { applications } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { ArrowLeft, FileText, Clock, CheckCircle, XCircle, User, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ApplicationDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [app, setApp] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadApplication();
  }, [id]);

  const loadApplication = async () => {
    try {
      const res = await applications.get(Number(id));
      setApp(res.data);
    } catch (error) {
      console.error(error);
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'text-green-600 bg-green-50 border-green-200';
      case 'rejected': return 'text-red-600 bg-red-50 border-red-200';
      case 'paid': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'payment_pending': return 'text-orange-600 bg-orange-50 border-orange-200';
      default: return 'text-slate-600 bg-slate-50 border-slate-200';
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!app) return <div>Application not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/dashboard')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
        </Button>
        <h1 className="text-2xl font-bold">Application Details</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Column: Application Info */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-xl">{app.business_name}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">{app.business_type}</p>
                </div>
                <div className={cn("px-3 py-1 rounded-full text-sm font-medium border", getStatusColor(app.status))}>
                  {app.status.replace('_', ' ').toUpperCase()}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-500">Reference ID</label>
                  <p className="font-medium">{app.id}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-500">Date Applied</label>
                  <p className="font-medium">{new Date(app.created_at).toLocaleDateString()}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-500">Owner Name</label>
                  <p className="font-medium">{app.form_data.owner_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-500">Contact Number</label>
                  <p className="font-medium">{app.form_data.contact_number}</p>
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium text-slate-500">Address</label>
                  <p className="font-medium">{app.address}</p>
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium text-slate-500">Line of Business</label>
                  <p className="font-medium">{app.form_data.line_of_business}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-500">Capital Investment</label>
                  <p className="font-medium">PHP {app.form_data.capital_investment}</p>
                </div>
              </div>

              <div className="pt-6 border-t">
                <h3 className="text-lg font-medium mb-4">Submitted Documents</h3>
                <div className="grid gap-2">
                  {app.documents && app.documents.length > 0 ? (
                    app.documents.map((doc: any) => (
                      <div key={doc.id} className="flex items-center justify-between p-3 border rounded-md bg-slate-50">
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-blue-600" />
                          <div>
                            <p className="font-medium text-sm capitalize">{doc.type.replace('_', ' ')}</p>
                            <p className="text-xs text-muted-foreground">{doc.filename}</p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" className="text-blue-600">View</Button>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No documents uploaded.</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Timeline */}
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Application History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative border-l border-slate-200 ml-3 space-y-8 py-2">
                {app.history && app.history.map((log: any, index: number) => (
                  <div key={log.id} className="relative pl-6">
                    <span className={cn(
                      "absolute -left-[5px] top-1 h-2.5 w-2.5 rounded-full border border-white ring-4 ring-white",
                      index === 0 ? "bg-blue-600" : "bg-slate-300"
                    )} />
                    <div className="flex flex-col gap-1">
                      <p className="text-sm font-medium leading-none capitalize">
                        {log.status.replace('_', ' ')}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(log.created_at).toLocaleString()}
                      </p>
                      {log.changed_by_name && (
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {log.changed_by_name}
                        </p>
                      )}
                      {log.notes && (
                        <p className="text-xs text-slate-600 mt-1 bg-slate-50 p-2 rounded border">
                          {log.notes}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
