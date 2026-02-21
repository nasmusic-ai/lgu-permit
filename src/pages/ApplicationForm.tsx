import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { applications } from '../services/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { ArrowLeft, Upload } from 'lucide-react';

export default function ApplicationForm() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    business_name: '',
    business_type: 'Sole Proprietorship',
    address: '',
    owner_name: '',
    contact_number: '',
    email: '',
    line_of_business: '',
    capital_investment: '',
  });
  const [files, setFiles] = useState<{ [key: string]: File | null }>({
    dti_reg: null,
    barangay_clearance: null,
    lease_contract: null,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
    if (e.target.files && e.target.files[0]) {
      setFiles({ ...files, [type]: e.target.files[0] });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // 1. Create Application
      const res = await applications.create({
        business_name: formData.business_name,
        business_type: formData.business_type,
        address: formData.address,
        form_data: formData,
      });
      const appId = res.data.id;

      // 2. Upload Documents
      const uploadPromises = Object.entries(files).map(([type, file]) => {
        if (!file) return Promise.resolve();
        const data = new FormData();
        data.append('application_id', appId.toString());
        data.append('type', type);
        data.append('file', file);
        return applications.uploadDocument(data);
      });

      await Promise.all(uploadPromises);

      // 3. Submit (Update status to submitted)
      await applications.updateStatus(appId, 'submitted');

      navigate('/dashboard');
    } catch (error) {
      console.error(error);
      alert('Failed to submit application');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/dashboard')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <h1 className="text-2xl font-bold">New Business Permit Application</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Business Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="business_name">Business Name</Label>
                <Input id="business_name" value={formData.business_name} onChange={handleChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="business_type">Business Type</Label>
                <select
                  id="business_type"
                  className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950"
                  value={formData.business_type}
                  onChange={handleChange}
                >
                  <option>Sole Proprietorship</option>
                  <option>Partnership</option>
                  <option>Corporation</option>
                  <option>Cooperative</option>
                </select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address">Business Address</Label>
                <Input id="address" value={formData.address} onChange={handleChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="owner_name">Owner's Name</Label>
                <Input id="owner_name" value={formData.owner_name} onChange={handleChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_number">Contact Number</Label>
                <Input id="contact_number" value={formData.contact_number} onChange={handleChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="line_of_business">Line of Business</Label>
                <Input id="line_of_business" value={formData.line_of_business} onChange={handleChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="capital_investment">Capital Investment (PHP)</Label>
                <Input id="capital_investment" type="number" value={formData.capital_investment} onChange={handleChange} required />
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t">
              <h3 className="text-lg font-medium">Required Documents</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>DTI/SEC Registration</Label>
                  <Input type="file" onChange={(e) => handleFileChange(e, 'dti_reg')} required />
                </div>
                <div className="space-y-2">
                  <Label>Barangay Clearance</Label>
                  <Input type="file" onChange={(e) => handleFileChange(e, 'barangay_clearance')} required />
                </div>
                <div className="space-y-2">
                  <Label>Lease Contract / Title</Label>
                  <Input type="file" onChange={(e) => handleFileChange(e, 'lease_contract')} required />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={loading}>
                {loading ? 'Submitting...' : 'Submit Application'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
