import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { applications } from '../services/api';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Plus, FileText, CheckCircle, XCircle, Clock, DollarSign, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import NotificationLogs from '../components/NotificationLogs';

export default function Dashboard() {
  const { user } = useAuth();
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    try {
      const res = await applications.list();
      setApps(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (id: number, status: string) => {
    try {
      await applications.updateStatus(id, status);
      loadApplications();
    } catch (error) {
      console.error(error);
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

  const handlePayment = async (id: number) => {
    // Simulate payment gateway
    const confirmed = window.confirm("Proceed to payment gateway? (This is a simulation)");
    if (confirmed) {
      try {
        // In a real app, this would be a callback from the payment provider
        // For this demo, we'll just update the status to 'paid' directly, 
        // but typically this would be 'payment_pending' -> 'paid' via webhook.
        // However, since the status is ALREADY 'payment_pending', let's assume 
        // the payment gateway returns success and we update to 'paid'.
        // Wait, usually the Treasurer confirms payment. 
        // Let's make the user 'pay' which might just trigger a notification or 
        // update a 'payment_reference'. 
        // For simplicity in this role-based demo:
        // 1. Applicant clicks "Pay Now" -> enters mock details -> status becomes 'paid' (auto-verified) 
        // OR 2. Applicant clicks "Pay Now" -> uploads proof -> Treasurer verifies.
        
        // Let's go with Option 1 for smooth demo flow, or Option 2 for realism.
        // The prompt says "securely pay fees via integrated payment options".
        // Let's simulate a successful card payment.
        
        alert("Payment successful!");
        await applications.updateStatus(id, 'paid');
        loadApplications();
      } catch (error) {
        console.error(error);
        alert("Payment failed");
      }
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <div className="flex gap-2">
          {user?.role === 'admin' && (
            <Link to="/admin/notifications">
              <Button variant="outline">
                <Settings className="mr-2 h-4 w-4" /> Notification Settings
              </Button>
            </Link>
          )}
          {user?.role === 'applicant' && (
            <Link to="/apply">
              <Button>
                <Plus className="mr-2 h-4 w-4" /> New Application
              </Button>
            </Link>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{apps.length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Applications</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {apps.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No applications found.</p>
                ) : (
                  apps.map((app) => (
                    <div key={app.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <p className="font-medium leading-none">{app.business_name}</p>
                        <p className="text-sm text-muted-foreground">{app.business_type} • {new Date(app.created_at).toLocaleDateString()}</p>
                        {user?.role !== 'applicant' && (
                          <p className="text-xs text-slate-500">Applicant: {app.applicant_name}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-4">
                        <Link to={`/applications/${app.id}`}>
                          <Button variant="ghost" size="sm">View Details</Button>
                        </Link>
                        <div className={cn("px-2.5 py-0.5 rounded-full text-xs font-medium border", getStatusColor(app.status))}>
                          {app.status.replace('_', ' ').toUpperCase()}
                        </div>
                        
                        {/* Role-based Actions */}
                        {user?.role === 'staff' && app.status === 'submitted' && (
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => handleStatusUpdate(app.id, 'under_review')}>Review</Button>
                          </div>
                        )}
                        {user?.role === 'staff' && app.status === 'under_review' && (
                          <div className="flex gap-2">
                            <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleStatusUpdate(app.id, 'payment_pending')}>Approve for Payment</Button>
                            <Button size="sm" variant="destructive" onClick={() => handleStatusUpdate(app.id, 'rejected')}>Reject</Button>
                          </div>
                        )}
                        {user?.role === 'treasurer' && app.status === 'payment_pending' && (
                          <div className="flex gap-2">
                             <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => handleStatusUpdate(app.id, 'paid')}>Confirm Payment</Button>
                          </div>
                        )}
                        {user?.role === 'staff' && app.status === 'paid' && (
                          <div className="flex gap-2">
                            <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleStatusUpdate(app.id, 'approved')}>Issue Permit</Button>
                          </div>
                        )}
                        {user?.role === 'applicant' && app.status === 'payment_pending' && (
                           <Button size="sm" variant="default" onClick={() => handlePayment(app.id)}>Pay Now</Button>
                        )}
                         {user?.role === 'applicant' && app.status === 'approved' && (
                           <Button size="sm" variant="outline" onClick={() => alert("Downloading permit...")}>Download Permit</Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="md:col-span-1">
          <NotificationLogs />
        </div>
      </div>
    </div>
  );
}
