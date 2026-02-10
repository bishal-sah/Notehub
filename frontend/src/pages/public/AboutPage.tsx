/**
 * About page describing the NoteHub platform.
 */
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { BookOpen, Target, Heart, Users } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        {/* Hero */}
        <section className="bg-gradient-to-br from-primary/5 via-background to-primary/10 py-16">
          <div className="container text-center space-y-4">
            <h1 className="text-4xl font-bold">About NoteHub</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              NoteHub is a centralized academic notes-sharing platform designed to help students
              across all faculties collaborate and succeed together.
            </p>
          </div>
        </section>

        {/* Mission & Vision */}
        <section className="py-16">
          <div className="container">
            <div className="grid md:grid-cols-3 gap-8">
              <Card>
                <CardContent className="pt-6 text-center space-y-3">
                  <Target className="h-10 w-10 text-primary mx-auto" />
                  <h3 className="text-xl font-semibold">Our Mission</h3>
                  <p className="text-sm text-muted-foreground">
                    To democratize access to quality academic resources by providing a free,
                    organized, and reliable platform for students to share and discover notes.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center space-y-3">
                  <BookOpen className="h-10 w-10 text-primary mx-auto" />
                  <h3 className="text-xl font-semibold">What We Do</h3>
                  <p className="text-sm text-muted-foreground">
                    We provide a structured platform where students can upload, browse, and download
                    academic notes organized by faculty, semester, and subject.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center space-y-3">
                  <Heart className="h-10 w-10 text-primary mx-auto" />
                  <h3 className="text-xl font-semibold">Our Values</h3>
                  <p className="text-sm text-muted-foreground">
                    Quality, accessibility, and community. Every note is reviewed before publishing
                    to ensure students get the best resources.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Features Detail */}
        <section className="py-16 bg-muted/30">
          <div className="container max-w-3xl space-y-8">
            <h2 className="text-3xl font-bold text-center">Key Features</h2>
            <div className="space-y-6">
              {[
                { title: 'Faculty-Based Organization', desc: 'Notes are categorized by faculty, semester, and subject for easy navigation.' },
                { title: 'Quality Assurance', desc: 'All uploaded notes go through an admin approval process before being published.' },
                { title: 'AI-Powered Search', desc: 'Semantic search helps you find exactly what you need using natural language queries.' },
                { title: 'Duplicate Detection', desc: 'Our AI system detects duplicate uploads to maintain a clean and unique note library.' },
                { title: 'Role-Based Access', desc: 'Different access levels for guests, registered users, and administrators.' },
                { title: 'Responsive Design', desc: 'Works seamlessly on desktop, tablet, and mobile devices.' },
              ].map((item) => (
                <div key={item.title} className="flex gap-4">
                  <div className="w-2 bg-primary rounded-full shrink-0" />
                  <div>
                    <h3 className="font-semibold">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Team */}
        <section className="py-16">
          <div className="container text-center space-y-6">
            <Users className="h-12 w-12 text-primary mx-auto" />
            <h2 className="text-3xl font-bold">Built by Students, for Students</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              NoteHub is a final-year project built with modern technologies including
              Django, React, TypeScript, and Tailwind CSS. It aims to solve the real problem
              of fragmented academic resources.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
