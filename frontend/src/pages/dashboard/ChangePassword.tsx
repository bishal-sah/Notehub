/**
 * Change password page.
 */
import { useState } from 'react';
import { profileService } from '@/lib/services';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Lock, Loader2 } from 'lucide-react';

export default function ChangePassword() {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ old_password: '', new_password: '', new_password_confirm: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.new_password !== form.new_password_confirm) {
      toast({ title: 'Error', description: 'New passwords do not match.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      await profileService.changePassword(form);
      toast({ title: 'Password changed', description: 'Your password has been updated successfully.' });
      setForm({ old_password: '', new_password: '', new_password_confirm: '' });
    } catch (err: any) {
      const data = err?.response?.data;
      const message = data ? (typeof data === 'string' ? data : Object.values(data).flat().join(' ')) : 'Failed to change password.';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Change Password</h1>
        <p className="text-muted-foreground">Update your account password.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Lock className="h-5 w-5" /> New Password</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="old_password">Current Password</Label>
              <Input id="old_password" type="password" required value={form.old_password} onChange={(e) => setForm({ ...form, old_password: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new_password">New Password</Label>
              <Input id="new_password" type="password" required placeholder="Min 8 characters" value={form.new_password} onChange={(e) => setForm({ ...form, new_password: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new_password_confirm">Confirm New Password</Label>
              <Input id="new_password_confirm" type="password" required value={form.new_password_confirm} onChange={(e) => setForm({ ...form, new_password_confirm: e.target.value })} />
            </div>
            <Button type="submit" className="w-full gap-2" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} Update Password
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
