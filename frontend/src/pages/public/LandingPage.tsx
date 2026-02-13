/**
 * Landing page with hero section, 3D gradient blobs, scroll-triggered
 * animations, animated counters, floating particles, and staggered reveals.
 */
import { Link } from 'react-router-dom';
import { useEffect, useMemo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { useScrollReveal, useCountUp } from '@/hooks/useScrollReveal';
import {
  BookOpen, Upload, Search, Shield, Users, GraduationCap,
  ArrowRight, CheckCircle, Sparkles, Zap, Globe, TrendingUp,
  ChevronDown, Star,
} from 'lucide-react';

/* ─── Data ────────────────────────────────────────────── */

const features = [
  { icon: <Upload className="h-7 w-7" />, title: 'Easy Upload', description: 'Upload your notes in PDF, DOC, or PPT format with just a few clicks.', color: 'from-blue-500 to-cyan-400' },
  { icon: <Search className="h-7 w-7" />, title: 'Smart Search', description: 'AI-powered semantic search to find exactly the notes you need.', color: 'from-violet-500 to-purple-400' },
  { icon: <Shield className="h-7 w-7" />, title: 'Quality Assured', description: 'All notes are reviewed and approved by administrators before publishing.', color: 'from-emerald-500 to-green-400' },
  { icon: <Users className="h-7 w-7" />, title: 'Community Driven', description: 'Built by students, for students. Share knowledge across faculties.', color: 'from-orange-500 to-amber-400' },
  { icon: <GraduationCap className="h-7 w-7" />, title: 'Faculty Organized', description: 'Notes organized by faculty, semester, and subject for easy navigation.', color: 'from-pink-500 to-rose-400' },
  { icon: <Sparkles className="h-7 w-7" />, title: 'Duplicate Detection', description: 'AI detects duplicate uploads to maintain a clean, unique note library.', color: 'from-indigo-500 to-blue-400' },
];

const statData = [
  { target: 1000, suffix: '+', label: 'Notes Shared', icon: <BookOpen className="h-5 w-5" /> },
  { target: 200, suffix: '+', label: 'Subjects Covered', icon: <Globe className="h-5 w-5" /> },
  { target: 2000, suffix: '+', label: 'Active Students', icon: <Users className="h-5 w-5" /> },
  { target: 50, suffix: '+', label: 'Faculties', icon: <GraduationCap className="h-5 w-5" /> },
];

const steps = [
  { step: '1', title: 'Create Account', desc: 'Sign up for free and join the student community.', color: 'from-blue-500 to-cyan-400' },
  { step: '2', title: 'Upload Notes', desc: "Share your notes — they'll be reviewed and published.", color: 'from-violet-500 to-purple-400' },
  { step: '3', title: 'Browse & Download', desc: 'Find notes by faculty, semester, or keyword search.', color: 'from-emerald-500 to-green-400' },
];

/* ─── Animated Counter Sub-component ─────────────────── */

function AnimatedStat({ target, suffix, label, icon }: {
  target: number; suffix: string; label: string; icon: ReactNode;
}) {
  const { ref, count, isVisible } = useCountUp(target, { duration: 2200 });
  return (
    <div className="relative group text-center p-6 rounded-2xl glass bg-background/40 border border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5">
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="relative z-10">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary mb-3">
          {icon}
        </div>
        <p className="text-3xl md:text-4xl font-bold bg-gradient-to-b from-foreground to-foreground/70 bg-clip-text text-transparent">
          <span ref={ref}>{isVisible ? count : 0}</span>{suffix}
        </p>
        <p className="text-sm text-muted-foreground mt-1">{label}</p>
      </div>
    </div>
  );
}

/* ─── Floating Particles ─────────────────────────────── */

function FloatingParticles() {
  const particles = useMemo(() =>
    Array.from({ length: 20 }, (_, i) => ({
      id: i,
      size: Math.random() * 4 + 2,
      x: Math.random() * 100,
      y: Math.random() * 100,
      duration: Math.random() * 15 + 10,
      delay: Math.random() * 10,
      opacity: Math.random() * 0.3 + 0.1,
    })), []
  );
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full bg-primary/30"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.x}%`,
            top: `${p.y}%`,
            opacity: p.opacity,
            animation: `float ${p.duration}s ease-in-out ${p.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

/* ─── Reveal Wrapper ─────────────────────────────────── */

function Reveal({ children, className = '', direction = 'up', delay = 0 }: {
  children: ReactNode; className?: string; direction?: 'up' | 'left' | 'right' | 'scale'; delay?: number;
}) {
  const cls = direction === 'left' ? 'reveal-left' : direction === 'right' ? 'reveal-right' : direction === 'scale' ? 'reveal-scale' : 'reveal';
  const { ref, isVisible } = useScrollReveal();
  return (
    <div
      ref={ref}
      className={`${cls} ${isVisible ? 'visible' : ''} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────── */

export default function LandingPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      {/* ══════════════════ HERO ══════════════════ */}
      <section className="relative overflow-hidden min-h-[90vh] flex items-center">
        {/* Dark gradient base */}
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-background/80" />

        {/* 3D Gradient Blobs */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -left-20 w-[500px] h-[500px] bg-gradient-to-br from-blue-600/30 to-cyan-400/20 animate-blob opacity-70 blur-3xl" />
          <div className="absolute -top-10 right-0 w-[400px] h-[400px] bg-gradient-to-bl from-violet-600/25 to-purple-500/20 animate-blob animation-delay-2000 opacity-60 blur-3xl" />
          <div className="absolute top-1/3 -right-20 w-[450px] h-[450px] bg-gradient-to-tl from-pink-500/20 to-rose-400/15 animate-blob animation-delay-4000 opacity-50 blur-3xl" />
          <div className="absolute bottom-0 -left-10 w-[350px] h-[350px] bg-gradient-to-tr from-cyan-500/20 to-teal-400/15 animate-blob animation-delay-3000 opacity-60 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-indigo-500/10 to-blue-500/10 animate-pulse-glow opacity-50" />
          <div className="absolute top-20 left-1/3 w-32 h-32 bg-gradient-to-br from-amber-400/20 to-orange-500/15 rounded-full animate-float blur-2xl" />
          <div className="absolute bottom-32 right-1/4 w-24 h-24 bg-gradient-to-br from-emerald-400/25 to-green-500/15 rounded-full animate-float animation-delay-3000 blur-2xl" />
        </div>

        {/* Floating particles */}
        <FloatingParticles />

        {/* Grid overlay for depth */}
        <div
          className="absolute inset-0 opacity-[0.015] dark:opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        {/* Content */}
        <div className="container relative z-10 py-20 lg:py-32">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            {/* Badge — animated entrance */}
            <div className="hero-badge inline-flex items-center gap-2 rounded-full border border-primary/20 px-5 py-2 text-sm font-medium glass bg-background/60 shadow-lg shadow-primary/5">
              <Zap className="h-4 w-4 text-primary" />
              <span>Academic Notes Sharing Platform</span>
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>

            {/* Title — staggered reveal */}
            <h1 className="hero-title text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1]">
              Share Knowledge,{' '}
              <span className="relative inline-block">
                <span className="bg-gradient-to-r from-blue-500 via-violet-500 to-purple-500 bg-clip-text text-transparent animate-gradient-shift">
                  Achieve Excellence
                </span>
              </span>
              <br />
              <span className="bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
                Together
              </span>
            </h1>

            {/* Subtitle */}
            <p className="hero-subtitle text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              NoteHub is the centralized platform where students upload, discover, and download
              high-quality academic notes across all faculties and semesters.
            </p>

            {/* Buttons */}
            <div className="hero-buttons flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link to="/notes">
                <Button size="lg" className="gap-2 h-12 px-8 text-base shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-105 transition-all duration-300">
                  Browse Notes <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/register">
                <Button size="lg" variant="outline" className="gap-2 h-12 px-8 text-base glass bg-background/50 hover:bg-background/80 hover:scale-105 transition-all duration-300">
                  Get Started Free
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="hero-scroll-indicator absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
          <span className="text-xs text-muted-foreground/60 tracking-widest uppercase">Scroll</span>
          <ChevronDown className="h-5 w-5 text-muted-foreground/40 animate-scroll-bounce" />
        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
      </section>

      {/* ══════════════════ STATS ══════════════════ */}
      <section className="relative py-16 border-y border-border/50">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[200px] bg-gradient-to-r from-blue-500/5 via-violet-500/5 to-pink-500/5 rounded-full blur-3xl" />
        </div>

        <div className="container relative z-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {statData.map((stat, i) => (
              <Reveal key={stat.label} delay={i * 100}>
                <AnimatedStat {...stat} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════ FEATURES ══════════════════ */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-20 -left-32 w-[400px] h-[400px] bg-gradient-to-br from-violet-500/10 to-purple-500/5 animate-blob animation-delay-2000 blur-3xl" />
          <div className="absolute bottom-20 -right-32 w-[350px] h-[350px] bg-gradient-to-tl from-cyan-500/10 to-blue-500/5 animate-blob animation-delay-4000 blur-3xl" />
        </div>

        <div className="container relative z-10">
          <Reveal>
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 px-4 py-1.5 text-xs font-medium glass bg-background/60 mb-4">
                <TrendingUp className="h-3.5 w-3.5 text-primary" /> Features
              </div>
              <h2 className="text-3xl md:text-4xl font-bold">Why NoteHub?</h2>
              <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
                Everything you need to share and discover academic resources in one place.
              </p>
            </div>
          </Reveal>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <Reveal key={feature.title} delay={i * 120}>
                <Card className="group relative overflow-hidden border-border/50 hover:border-primary/30 bg-background/60 glass transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 h-full">
                  <CardContent className="pt-6 relative z-10">
                    <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} text-white mb-4 shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300`}>
                      {feature.icon}
                    </div>
                    <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                  </CardContent>
                  <div className={`absolute -bottom-20 -right-20 w-40 h-40 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-10 rounded-full blur-3xl transition-opacity duration-500`} />
                </Card>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════ HOW IT WORKS ══════════════════ */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-gradient-to-r from-emerald-500/5 via-blue-500/8 to-violet-500/5 rounded-full blur-3xl animate-pulse-glow" />
        </div>

        <div className="container relative z-10">
          <Reveal>
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 px-4 py-1.5 text-xs font-medium glass bg-background/60 mb-4">
                <Sparkles className="h-3.5 w-3.5 text-primary" /> Getting Started
              </div>
              <h2 className="text-3xl md:text-4xl font-bold">How It Works</h2>
            </div>
          </Reveal>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {steps.map((item, i) => (
              <Reveal key={item.step} delay={i * 200} direction="scale">
                <div className="relative text-center space-y-4 group">
                  <div className={`relative w-16 h-16 rounded-2xl bg-gradient-to-br ${item.color} text-white flex items-center justify-center text-2xl font-bold mx-auto shadow-lg group-hover:scale-110 group-hover:shadow-xl group-hover:-rotate-3 transition-all duration-300`}>
                    {item.step}
                    <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${item.color} opacity-20 blur-xl -z-10`} />
                  </div>
                  {/* Connector line (between step 1→2 and 2→3) */}
                  {i < steps.length - 1 && (
                    <div className="hidden md:block absolute top-8 left-[calc(50%+40px)] w-[calc(100%-80px)] h-px bg-gradient-to-r from-border to-border/30" />
                  )}
                  <h3 className="font-semibold text-lg">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════ TESTIMONIAL STRIP ═════════════ */}
      <section className="relative py-16 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-[300px] h-[300px] bg-gradient-to-br from-amber-500/8 to-orange-400/5 animate-blob animation-delay-2000 blur-3xl" />
        </div>
        <div className="container relative z-10">
          <Reveal>
            <div className="flex flex-col items-center gap-6 text-center">
              <div className="flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <blockquote className="text-xl md:text-2xl font-medium max-w-2xl italic text-foreground/80">
                "NoteHub made sharing notes effortless. I found exactly what I needed
                for my exams in seconds!"
              </blockquote>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-white font-bold text-sm">
                  S
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium">Student User</p>
                  <p className="text-xs text-muted-foreground">Computer Science, 6th Semester</p>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══════════════════ CTA ══════════════════ */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute -top-20 -left-20 w-[300px] h-[300px] bg-gradient-to-br from-blue-500/15 to-cyan-400/10 animate-blob blur-3xl" />
          <div className="absolute -bottom-20 -right-20 w-[300px] h-[300px] bg-gradient-to-tl from-violet-500/15 to-purple-400/10 animate-blob animation-delay-3000 blur-3xl" />
        </div>

        <Reveal direction="scale" className="container relative z-10">
          <div className="relative overflow-hidden rounded-3xl border border-border/50">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/90 via-blue-600/90 to-violet-600/90 animate-gradient-shift" />
            <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-gradient-to-bl from-white/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/2 animate-blob" />
            <div className="absolute bottom-0 left-0 w-[250px] h-[250px] bg-gradient-to-tr from-white/10 to-transparent rounded-full translate-y-1/2 -translate-x-1/2 animate-blob animation-delay-4000" />

            <FloatingParticles />

            <div className="relative z-10 p-10 md:p-16 text-center text-white">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Start Sharing?</h2>
              <p className="text-white/70 mb-8 max-w-xl mx-auto text-lg">
                Join thousands of students already using NoteHub to excel in their studies.
              </p>
              <Link to="/register">
                <Button size="lg" variant="secondary" className="gap-2 h-12 px-8 text-base shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300">
                  <CheckCircle className="h-4 w-4" /> Create Free Account
                </Button>
              </Link>
            </div>
          </div>
        </Reveal>
      </section>

      <Footer />
    </div>
  );
}
