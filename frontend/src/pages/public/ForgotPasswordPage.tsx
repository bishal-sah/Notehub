/**
 * Forgot password page — sends a real password reset email via Celery.
 */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '@/lib/services';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { BookOpen, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      const res = await authService.requestPasswordReset(email.trim());
      if (res.data.token) {
        toast({ title: 'Account verified', description: 'You can now set a new password.' });
        navigate(`/reset-password?token=${res.data.token}`);
      } else {
        setSent(true);
        toast({ title: 'Error', description: 'No account found with that email.', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'No account found with that email. Please try again.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 flex items-center justify-center py-12 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-2">
              {sent ? <CheckCircle2 className="h-8 w-8 text-green-500" /> : <BookOpen className="h-8 w-8 text-primary" />}
            </div>
            <CardTitle className="text-2xl">Reset Password</CardTitle>
            <CardDescription>
              {sent
                ? 'No account was found with that email address.'
                : 'Enter your email address to verify your account and reset your password.'}
            </CardDescription>
          </CardHeader>
          {!sent ? (
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="you@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-3">
                <Button className="w-full" type="submit" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Verify & Reset Password
                </Button>
                <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 justify-center">
                  <ArrowLeft className="h-3 w-3" /> Back to Login
                </Link>
              </CardFooter>
            </form>
          ) : (
            <CardFooter className="flex flex-col gap-3">
              <Button className="w-full" variant="outline" onClick={() => { setSent(false); setEmail(''); }}>
                Send Again
              </Button>
              <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 justify-center">
                <ArrowLeft className="h-3 w-3" /> Back to Login
              </Link>
            </CardFooter>
          )}
        </Card>
      </main>
      <Footer />
    </div>
  );
}
