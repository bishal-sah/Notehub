/**
 * Admin platform settings page.
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { Settings as SettingsIcon, Loader2 } from 'lucide-react';

export default function Settings() {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    siteName: 'NoteHub',
    allowRegistration: true,
    requireApproval: true,
    maxFileSize: 10,
    allowedFileTypes: 'pdf,doc,docx,ppt,pptx',
    duplicateThreshold: 0.85,
  });

  const handleSave = async () => {
    setSaving(true);
    // In production, this would POST to a settings endpoint
    setTimeout(() => {
      setSaving(false);
      toast({ title: 'Settings saved', description: 'Platform settings have been updated.' });
    }, 1000);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Platform Settings</h1>
        <p className="text-muted-foreground">Configure platform-wide settings.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><SettingsIcon className="h-5 w-5" /> General</CardTitle>
          <CardDescription>Basic platform configuration.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="siteName">Site Name</Label>
            <Input id="siteName" value={settings.siteName} onChange={(e) => setSettings({ ...settings, siteName: e.target.value })} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Allow Registration</p>
              <p className="text-xs text-muted-foreground">Allow new users to create accounts.</p>
            </div>
            <Switch checked={settings.allowRegistration} onCheckedChange={(v) => setSettings({ ...settings, allowRegistration: v })} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Require Note Approval</p>
              <p className="text-xs text-muted-foreground">Notes must be approved by admin before publishing.</p>
            </div>
            <Switch checked={settings.requireApproval} onCheckedChange={(v) => setSettings({ ...settings, requireApproval: v })} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Upload Settings</CardTitle>
          <CardDescription>Control file upload behavior.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="maxFileSize">Max File Size (MB)</Label>
            <Input id="maxFileSize" type="number" min={1} max={100} value={settings.maxFileSize} onChange={(e) => setSettings({ ...settings, maxFileSize: parseInt(e.target.value) })} className="w-32" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="allowedFileTypes">Allowed File Types (comma-separated)</Label>
            <Input id="allowedFileTypes" value={settings.allowedFileTypes} onChange={(e) => setSettings({ ...settings, allowedFileTypes: e.target.value })} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="duplicateThreshold">Duplicate Detection Threshold</Label>
            <Input id="duplicateThreshold" type="number" min={0.5} max={1} step={0.05} value={settings.duplicateThreshold} onChange={(e) => setSettings({ ...settings, duplicateThreshold: parseFloat(e.target.value) })} className="w-32" />
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} className="w-full gap-2" disabled={saving}>
        {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save Settings
      </Button>
    </div>
  );
}
