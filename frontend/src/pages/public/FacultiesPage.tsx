/**
 * Public faculties listing page.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { academicService } from '@/lib/services';
import { Faculty } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { GraduationCap, Loader2, BookOpen } from 'lucide-react';

export default function FacultiesPage() {
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await academicService.faculties();
        setFaculties(res.data.results || res.data);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <section className="bg-gradient-to-br from-primary/5 via-background to-primary/10 py-16">
          <div className="container text-center space-y-4">
            <GraduationCap className="h-12 w-12 text-primary mx-auto" />
            <h1 className="text-4xl font-bold">Faculties</h1>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              Browse notes organized by faculty. Select a faculty to explore semesters and subjects.
            </p>
          </div>
        </section>

        <section className="py-12">
          <div className="container">
            {loading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : faculties.length === 0 ? (
              <div className="text-center py-20">
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No faculties found.</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {faculties.map((faculty) => (
                  <Link key={faculty.id} to={`/notes?faculty=${faculty.id}`}>
                    <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">{faculty.name}</CardTitle>
                          <Badge variant="secondary">{faculty.code}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {faculty.description || 'Explore notes for this faculty.'}
                        </p>
                        {faculty.semesters_count !== undefined && (
                          <p className="text-xs text-muted-foreground mt-3">
                            {faculty.semesters_count} semester{faculty.semesters_count !== 1 ? 's' : ''}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
