/**
 * Donate / Support NoteHub — Payment page with eSewa & Khalti options.
 * Beautiful, modern UI showcasing both Nepali payment methods.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import {
  Heart,
  Copy,
  Check,
  Sparkles,
  BookOpen,
  Users,
  Server,
  Coffee,
  GraduationCap,
  ArrowRight,
  Star,
  Zap,
  Shield,
  QrCode,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { QRCodeSVG } from 'qrcode.react';

/* ── Payment Info ─────────────────────────────────── */
const PAYMENT_METHODS = [
  {
    id: 'esewa',
    name: 'eSewa',
    tagline: 'Nepal\'s Leading Digital Wallet',
    phone: '9819702145',
    holder: 'Bishal Kumar Sah',
    qrImage: '/payments/esewa-qr.png',
    color: 'from-green-500 to-emerald-600',
    bgColor: 'bg-green-50 dark:bg-green-950/30',
    borderColor: 'border-green-200 dark:border-green-800',
    textColor: 'text-green-700 dark:text-green-400',
    badgeColor: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    buttonColor: 'bg-green-600 hover:bg-green-700 text-white',
    logo: (
      <div className="flex items-center gap-1.5">
        <div className="h-8 w-8 rounded-lg bg-green-600 flex items-center justify-center text-white font-bold text-sm">e</div>
        <span className="font-bold text-xl">
          <span className="text-green-600">e</span>Sewa
        </span>
      </div>
    ),
  },
  {
    id: 'khalti',
    name: 'Khalti',
    tagline: 'Digital Wallet for Nepal',
    phone: '9807000750',
    holder: 'Hansel Mandal',
    qrImage: '/payments/khalti-qr.png',
    color: 'from-purple-500 to-indigo-600',
    bgColor: 'bg-purple-50 dark:bg-purple-950/30',
    borderColor: 'border-purple-200 dark:border-purple-800',
    textColor: 'text-purple-700 dark:text-purple-400',
    badgeColor: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
    buttonColor: 'bg-purple-600 hover:bg-purple-700 text-white',
    logo: (
      <div className="flex items-center gap-1.5">
        <div className="h-8 w-8 rounded-lg bg-purple-600 flex items-center justify-center text-white font-bold text-sm">K</div>
        <span className="font-bold text-xl">
          <span className="text-purple-600">Khalti</span>
        </span>
      </div>
    ),
  },
] as const;

const SUGGESTED_AMOUNTS = [50, 100, 200, 500, 1000];

const IMPACT_ITEMS = [
  { icon: Server, label: 'Server & Hosting', desc: 'Keep NoteHub online 24/7 for all students', amount: 'Rs. 500/mo' },
  { icon: BookOpen, label: 'Content Quality', desc: 'Review and verify uploaded study materials', amount: 'Rs. 200/mo' },
  { icon: Users, label: 'Community Growth', desc: 'Reach more students across Nepal', amount: 'Rs. 300/mo' },
  { icon: Coffee, label: 'Developer Fuel', desc: 'Late-night coding sessions need chai!', amount: 'Rs. 100/mo' },
];

const TESTIMONIALS = [
  { name: 'Sailendra Yadav', faculty: 'BE Computer', text: 'NoteHub saved my semester! Found all the notes I needed for exams.' },
  { name: 'Priya Shrestha', faculty: 'BBA', text: 'Amazing platform. The community here is so helpful for sharing resources.' },
  { name: 'RamKumar Thapa', faculty: 'BE Civil', text: 'Best notes platform in Nepal. I donated because I believe in this mission.' },
];

/* ── Component ────────────────────────────────────── */
export default function DonatePage() {
  const { toast } = useToast();
  const [selectedMethod, setSelectedMethod] = useState<string>('esewa');
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(100);

  const activeMethod = PAYMENT_METHODS.find((m) => m.id === selectedMethod)!;

  const copyPhone = () => {
    navigator.clipboard.writeText(activeMethod.phone);
    setCopiedPhone(true);
    toast({ title: 'Copied!', description: `Phone number ${activeMethod.phone} copied to clipboard.` });
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">

        {/* ── Hero Section ── */}
        <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-amber-500/5 py-16 md:py-24">
          {/* Decorative blobs */}
          <div className="absolute top-10 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl animate-pulse delay-1000" />

          <div className="container relative z-10 max-w-4xl text-center space-y-6">
            <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300 px-4 py-1.5 text-sm font-medium gap-1.5">
              <Heart className="h-3.5 w-3.5" fill="currentColor" />
              Support Open Education
            </Badge>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight">
              Help Us Keep{' '}
              <span className="bg-gradient-to-r from-primary to-amber-500 bg-clip-text text-transparent">
                NoteHub
              </span>{' '}
              Free
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              NoteHub is built by students, for students. Your donation helps us maintain servers,
              improve features, and keep quality academic resources accessible to everyone in Nepal.
            </p>

            <div className="flex items-center justify-center gap-8 pt-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">10K+</p>
                <p className="text-sm text-muted-foreground">Students Helped</p>
              </div>
              <div className="h-10 w-px bg-border" />
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">500+</p>
                <p className="text-sm text-muted-foreground">Notes Shared</p>
              </div>
              <div className="h-10 w-px bg-border" />
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">100%</p>
                <p className="text-sm text-muted-foreground">Free Forever</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Payment Section ── */}
        <section className="py-16 md:py-20">
          <div className="container max-w-5xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-3">Choose Your Payment Method</h2>
              <p className="text-muted-foreground">Scan the QR code or send directly to our wallet</p>
            </div>

            {/* Method Selector Tabs */}
            <div className="flex justify-center gap-3 mb-10">
              {PAYMENT_METHODS.map((method) => (
                <button
                  key={method.id}
                  onClick={() => setSelectedMethod(method.id)}
                  className={cn(
                    'flex items-center gap-3 px-6 py-3 rounded-xl border-2 transition-all duration-300 font-medium',
                    selectedMethod === method.id
                      ? `${method.borderColor} ${method.bgColor} shadow-lg scale-105`
                      : 'border-border hover:border-muted-foreground/30 hover:bg-muted/50'
                  )}
                >
                  {method.logo}
                </button>
              ))}
            </div>

            {/* Payment Card */}
            <div className="grid md:grid-cols-2 gap-8 items-start">
              {/* QR Code Card */}
              <Card className={cn(
                'overflow-hidden border-2 transition-all duration-500',
                activeMethod.borderColor
              )}>
                {/* Gradient header */}
                <div className={cn('bg-gradient-to-r p-6 text-white', activeMethod.color)}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-bold">{activeMethod.name}</h3>
                      <p className="text-white/80 text-sm">{activeMethod.tagline}</p>
                    </div>
                    <QrCode className="h-8 w-8 text-white/60" />
                  </div>
                </div>

                <CardContent className="p-6 flex flex-col items-center">
                  {/* QR Code */}
                  <div className="bg-white p-4 rounded-2xl shadow-inner border mb-6">
                    <QRCodeSVG
                      value={activeMethod.phone}
                      size={224}
                      level="H"
                      includeMargin={false}
                      bgColor="#ffffff"
                      fgColor="#000000"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mb-4">Scan with {activeMethod.name} app to pay</p>

                  {/* Account Info */}
                  <div className="w-full space-y-3">
                    <div className={cn('flex items-center justify-between p-3 rounded-lg', activeMethod.bgColor)}>
                      <div>
                        <p className="text-xs text-muted-foreground">Account Holder</p>
                        <p className="font-semibold">{activeMethod.holder}</p>
                      </div>
                      <GraduationCap className={cn('h-5 w-5', activeMethod.textColor)} />
                    </div>

                    <div className={cn('flex items-center justify-between p-3 rounded-lg', activeMethod.bgColor)}>
                      <div>
                        <p className="text-xs text-muted-foreground">Phone Number</p>
                        <p className="font-semibold font-mono tracking-wider">{activeMethod.phone}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className={cn('h-8 gap-1.5', activeMethod.textColor)}
                        onClick={copyPhone}
                      >
                        {copiedPhone ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        {copiedPhone ? 'Copied' : 'Copy'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Instructions Card */}
              <div className="space-y-6">
                {/* Suggested Amounts */}
                <Card>
                  <CardContent className="p-6 space-y-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-amber-500" />
                      Suggested Amounts
                    </h3>
                    <div className="grid grid-cols-3 gap-2">
                      {SUGGESTED_AMOUNTS.map((amount) => (
                        <button
                          key={amount}
                          onClick={() => setSelectedAmount(amount)}
                          className={cn(
                            'py-3 px-4 rounded-lg border-2 font-semibold transition-all duration-200 text-sm',
                            selectedAmount === amount
                              ? `${activeMethod.borderColor} ${activeMethod.bgColor} ${activeMethod.textColor}`
                              : 'border-border hover:border-muted-foreground/30'
                          )}
                        >
                          Rs. {amount}
                        </button>
                      ))}
                      <button
                        onClick={() => setSelectedAmount(null)}
                        className={cn(
                          'py-3 px-4 rounded-lg border-2 font-semibold transition-all duration-200 text-sm',
                          selectedAmount === null
                            ? `${activeMethod.borderColor} ${activeMethod.bgColor} ${activeMethod.textColor}`
                            : 'border-border hover:border-muted-foreground/30'
                        )}
                      >
                        Custom
                      </button>
                    </div>
                  </CardContent>
                </Card>

                {/* Steps */}
                <Card>
                  <CardContent className="p-6 space-y-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Zap className="h-4 w-4 text-amber-500" />
                      How to Donate
                    </h3>
                    <ol className="space-y-3">
                      {[
                        `Open your ${activeMethod.name} app`,
                        'Tap "Scan & Pay" or "Send Money"',
                        `Scan the QR code or enter ${activeMethod.phone}`,
                        `Enter amount${selectedAmount ? ` (Rs. ${selectedAmount})` : ''} and confirm`,
                        'Screenshot the receipt (optional)',
                      ].map((step, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <span className={cn(
                            'shrink-0 h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold text-white',
                            `bg-gradient-to-r ${activeMethod.color}`
                          )}>
                            {i + 1}
                          </span>
                          <span className="text-sm text-muted-foreground pt-0.5">{step}</span>
                        </li>
                      ))}
                    </ol>
                  </CardContent>
                </Card>

                {/* Trust Badge */}
                <div className={cn('flex items-center gap-3 p-4 rounded-xl border', activeMethod.borderColor, activeMethod.bgColor)}>
                  <Shield className={cn('h-8 w-8 shrink-0', activeMethod.textColor)} />
                  <div>
                    <p className="font-semibold text-sm">100% goes to NoteHub</p>
                    <p className="text-xs text-muted-foreground">Every rupee directly supports server costs, development, and student resources.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Impact Section ── */}
        <section className="py-16 bg-muted/30">
          <div className="container max-w-5xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-3">Where Your Donation Goes</h2>
              <p className="text-muted-foreground">Transparency matters — here's how we use every rupee</p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {IMPACT_ITEMS.map((item) => (
                <Card key={item.label} className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                  <CardContent className="p-5 text-center space-y-3">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto group-hover:bg-primary/20 transition-colors">
                      <item.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-semibold text-sm">{item.label}</h3>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                    <Badge variant="outline" className="text-xs">{item.amount}</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* ── Testimonials ── */}
        <section className="py-16">
          <div className="container max-w-4xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-3">What Students Say</h2>
              <p className="text-muted-foreground">NoteHub is making a difference in students' lives</p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {TESTIMONIALS.map((t, i) => (
                <Card key={i} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, j) => (
                        <Star key={j} className="h-4 w-4 text-amber-400 fill-amber-400" />
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground italic">"{t.text}"</p>
                    <div className="flex items-center gap-2 pt-1">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                        {t.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{t.name}</p>
                        <p className="text-xs text-muted-foreground">{t.faculty}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA Section ── */}
        <section className="py-16 bg-gradient-to-r from-primary/10 via-background to-amber-500/10">
          <div className="container max-w-3xl text-center space-y-6">
            <Heart className="h-12 w-12 text-red-500 mx-auto animate-pulse" fill="currentColor" />
            <h2 className="text-3xl font-bold">Every Contribution Matters</h2>
            <p className="text-muted-foreground text-lg">
              Even a small donation of Rs. 50 helps us keep NoteHub running.
              Together, we can make quality education accessible to every student in Nepal.
            </p>
            <div className="flex justify-center gap-4 pt-2">
              <Button
                size="lg"
                className="gap-2"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              >
                <Heart className="h-4 w-4" fill="currentColor" />
                Donate Now
              </Button>
              <Link to="/about">
                <Button size="lg" variant="outline" className="gap-2">
                  Learn More <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </div>
  );
}
