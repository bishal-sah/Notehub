/**
 * Admin duplicate detection page.
 */
import { useEffect, useState } from 'react';
import { adminNoteService } from '@/lib/services';
import type { DuplicatePair } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Copy, Loader2, CheckCircle, FileText } from 'lucide-react';

export default function Duplicates() {
  const { toast } = useToast();
  const [duplicates, setDuplicates] = useState<DuplicatePair[]>([]);
  const [loading, setLoading] = useState(true);
  const [threshold, setThreshold] = useState(0.85);

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminNoteService.duplicates(threshold);
      setDuplicates(res.data.duplicates || []);
    } catch {
      toast({ title: 'Error', description: 'Failed to detect duplicates.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Duplicate Detection</h1>
        <p className="text-muted-foreground">AI-powered detection of similar or duplicate notes.</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-end gap-4">
            <div className="space-y-2">
              <Label>Similarity Threshold</Label>
              <Input
                type="number"
                min={0.5}
                max={1}
                step={0.05}
                value={threshold}
                onChange={(e) => setThreshold(parseFloat(e.target.value))}
                className="w-32"
              />
            </div>
            <Button onClick={load} disabled={loading} className="gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
              Scan for Duplicates
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : duplicates.length === 0 ? (
        <div className="text-center py-20">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h3 className="font-semibold text-lg mb-1">No Duplicates Found</h3>
          <p className="text-muted-foreground text-sm">All notes appear to be unique at the current threshold.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{duplicates.length} potential duplicate pair{duplicates.length !== 1 ? 's' : ''} found.</p>
          {duplicates.map((pair, idx) => (
            <Card key={idx}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Copy className="h-4 w-4 text-yellow-500" />
                  Similarity: {(pair.similarity * 100).toFixed(1)}%
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="p-3 rounded border space-y-1">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm font-medium">{pair.note1_title}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">ID: {pair.note1_id}</p>
                  </div>
                  <div className="p-3 rounded border space-y-1">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm font-medium">{pair.note2_title}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">ID: {pair.note2_id}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
