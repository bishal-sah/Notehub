/**
 * Semester Packs — download full semester notes as organized ZIP files.
 */
import { useEffect, useState } from 'react';
import { semesterPackService, academicService } from '@/lib/services';
import type { SemesterPack, Faculty } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Download, FolderArchive, Loader2, FileText, HardDrive,
  GraduationCap, FolderOpen, WifiOff, ChevronDown, ChevronUp,
} from 'lucide-react';

export default function SemesterPacks() {
  const [packs, setPacks] = useState<SemesterPack[]>([]);
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [selectedFaculty, setSelectedFaculty] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    academicService.faculties()
      .then((res) => setFaculties(res.data.results || res.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const fid = selectedFaculty ? Number(selectedFaculty) : undefined;
        const res = await semesterPackService.list(fid);
        setPacks(res.data);
      } catch {
        setPacks([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [selectedFaculty]);

  const handleDownload = (pack: SemesterPack) => {
    setDownloading(pack.semester_id);
    const url = semesterPackService.downloadUrl(pack.semester_id);

    // Use a hidden link to trigger download
    const a = document.createElement('a');
    a.href = url;
    a.download = '';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Reset after a delay (we can't track actual download completion)
    setTimeout(() => setDownloading(null), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
            <FolderArchive className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Semester Packs</h2>
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              <WifiOff className="h-3.5 w-3.5" />
              Download full semester notes for offline study
            </p>
          </div>
        </div>

        <Select value={selectedFaculty} onValueChange={(v) => setSelectedFaculty(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Faculties" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Faculties</SelectItem>
            {faculties.map((f) => (
              <SelectItem key={f.id} value={String(f.id)}>{f.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Empty state */}
      {!loading && packs.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <FolderOpen className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <h3 className="font-semibold mb-1">No packs available</h3>
            <p className="text-sm text-muted-foreground">
              No approved notes found for the selected faculty.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Pack cards */}
      {!loading && packs.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {packs.map((pack) => {
            const isExpanded = expanded === pack.semester_id;
            const isDownloading = downloading === pack.semester_id;

            return (
              <Card key={pack.semester_id} className="flex flex-col hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Badge variant="outline" className="text-[10px] mb-2">
                        <GraduationCap className="h-3 w-3 mr-1" />
                        {pack.faculty_name}
                      </Badge>
                      <CardTitle className="text-base">
                        Semester {pack.semester_number}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">{pack.semester_name}</p>
                    </div>
                    <FolderArchive className="h-5 w-5 text-emerald-500 shrink-0 mt-1" />
                  </div>
                </CardHeader>

                <CardContent className="flex-1 space-y-3">
                  {/* Stats */}
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <FileText className="h-3.5 w-3.5" />
                      {pack.note_count} notes
                    </span>
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <HardDrive className="h-3.5 w-3.5" />
                      {pack.total_size_display}
                    </span>
                  </div>

                  {/* Subjects preview */}
                  <div>
                    <button
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => setExpanded(isExpanded ? null : pack.semester_id)}
                    >
                      <FolderOpen className="h-3 w-3" />
                      {pack.subjects.length} subjects
                      {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </button>

                    {isExpanded && (
                      <div className="mt-2 space-y-1 pl-1 border-l-2 border-emerald-200 dark:border-emerald-800 ml-1">
                        {pack.subjects.map((subj, i) => (
                          <div key={i} className="flex items-center justify-between text-xs pl-2 py-0.5">
                            <span className="text-foreground/80 truncate">{subj.name}</span>
                            <Badge variant="secondary" className="text-[10px] ml-2 shrink-0">
                              {subj.note_count}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Download button */}
                  <Button
                    className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => handleDownload(pack)}
                    disabled={isDownloading}
                  >
                    {isDownloading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                    {isDownloading ? 'Preparing ZIP...' : 'Download Pack'}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
