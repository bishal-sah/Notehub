/**
 * Landing page with hero section, features, and CTA.
 */
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import {
  BookOpen, Upload, Search, Shield, Users, GraduationCap,
  ArrowRight, CheckCircle, Sparkles,
} from 'lucide-react';

const features = [
  { icon: <Upload className="h-8 w-8 text-primary" />, title: 'Easy Upload', description: 'Upload your notes in PDF, DOC, or PPT format with just a few clicks.' },
  { icon: <Search className="h-8 w-8 text-primary" />, title: 'Smart Search', description: 'AI-powered semantic search to find exactly the notes you need.' },
  { icon: <Shield className="h-8 w-8 text-primary" />, title: 'Quality Assured', description: 'All notes are reviewed and approved by administrators before publishing.' },
  { icon: <Users className="h-8 w-8 text-primary" />, title: 'Community Driven', description: 'Built by students, for students. Share knowledge across faculties.' },
  { icon: <GraduationCap className="h-8 w-8 text-primary" />, title: 'Faculty Organized', description: 'Notes organized by faculty, semester, and subject for easy navigation.' },
  { icon: <Sparkles className="h-8 w-8 text-primary" />, title: 'Duplicate Detection', description: 'AI detects duplicate uploads to maintain a clean, unique note library.' },
];

const stats = [
  { value: '500+', label: 'Notes Shared' },
  { value: '50+', label: 'Subjects Covered' },
  { value: '1000+', label: 'Active Students' },
  { value: '10+', label: 'Faculties' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-primary/10 py-20 lg:py-32">
        <div className="container relative z-10">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium bg-background shadow-sm">
              <BookOpen className="h-4 w-4 text-primary" />
              Academic Notes Sharing Platform
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
              Share Knowledge,{' '}
              <span className="text-primary">Ace Together</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              NoteHub is the centralized platform where students upload, discover, and download
              high-quality academic notes across all faculties and semesters.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link to="/notes">
                <Button size="lg" className="gap-2">
                  Browse Notes <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/register">
                <Button size="lg" variant="outline" className="gap-2">
                  Get Started Free
                </Button>
              </Link>
            </div>
          </div>
        </div>
        {/* Decorative blobs */}
        <div className="absolute top-0 left-0 w-72 h-72 bg-primary/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl translate-x-1/3 translate-y-1/3" />
      </section>

      {/* Stats Section */}
      <section className="py-12 border-b bg-muted/30">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-3xl md:text-4xl font-bold text-primary">{stat.value}</p>
                <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold">Why NoteHub?</h2>
            <p className="text-muted-foreground mt-2 max-w-xl mx-auto">
              Everything you need to share and discover academic resources in one place.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <Card key={feature.title} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="mb-4">{feature.icon}</div>
                  <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-muted/30">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold">How It Works</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { step: '1', title: 'Create Account', desc: 'Sign up for free and join the student community.' },
              { step: '2', title: 'Upload Notes', desc: 'Share your notes — they\'ll be reviewed and published.' },
              { step: '3', title: 'Browse & Download', desc: 'Find notes by faculty, semester, or keyword search.' },
            ].map((item) => (
              <div key={item.step} className="text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold mx-auto">
                  {item.step}
                </div>
                <h3 className="font-semibold text-lg">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container">
          <div className="bg-primary rounded-2xl p-8 md:p-12 text-center text-primary-foreground">
            <h2 className="text-3xl font-bold mb-4">Ready to Start Sharing?</h2>
            <p className="text-primary-foreground/80 mb-6 max-w-xl mx-auto">
              Join thousands of students already using NoteHub to excel in their studies.
            </p>
            <Link to="/register">
              <Button size="lg" variant="secondary" className="gap-2">
                <CheckCircle className="h-4 w-4" /> Create Free Account
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
