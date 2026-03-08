import { useState, useRef, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 60_000; // 1 minute lockout

const Auth = () => {
  const { user, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { signIn, signUp } = useAuth();

  // Rate limiting state
  const attemptsRef = useRef(0);
  const lockoutUntilRef = useRef(0);

  const checkRateLimit = useCallback((): boolean => {
    const now = Date.now();
    if (lockoutUntilRef.current > now) {
      const secsLeft = Math.ceil((lockoutUntilRef.current - now) / 1000);
      toast.error(`Too many attempts. Try again in ${secsLeft}s.`);
      return false;
    }
    attemptsRef.current += 1;
    if (attemptsRef.current > MAX_ATTEMPTS) {
      lockoutUntilRef.current = now + LOCKOUT_MS;
      attemptsRef.current = 0;
      toast.error('Too many attempts. Please wait 1 minute.');
      return false;
    }
    return true;
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (user) return <Navigate to="/" replace />;

  const validatePassword = (pw: string): string | null => {
    if (pw.length < 8) return 'Password must be at least 8 characters';
    if (!/[A-Z]/.test(pw)) return 'Password must contain an uppercase letter';
    if (!/[a-z]/.test(pw)) return 'Password must contain a lowercase letter';
    if (!/[0-9]/.test(pw)) return 'Password must contain a number';
    return null;
  };

  const handleSubmit = async (mode: 'login' | 'signup') => {
    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }
    if (mode === 'signup') {
      const pwError = validatePassword(password);
      if (pwError) {
        toast.error(pwError);
        return;
      }
    } else if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    if (!checkRateLimit()) return;

    setIsSubmitting(true);
    try {
      const result = mode === 'login'
        ? await signIn(email, password)
        : await signUp(email, password);
      if (result.error) {
        toast.error(result.error);
      } else if (mode === 'signup') {
        toast.success('Check your email to confirm your account!');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLockedOut = lockoutUntilRef.current > Date.now();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <BookOpen className="w-10 h-10 text-primary mx-auto" aria-hidden="true" />
          <h1 className="text-2xl font-bold text-foreground">Novel Reader</h1>
          <p className="text-sm text-muted-foreground">Sign in to sync your library across devices</p>
        </div>

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="login-email">Email</Label>
              <Input id="login-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="login-password">Password</Label>
              <Input id="login-password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" />
            </div>
            <Button className="w-full" onClick={() => handleSubmit('login')} disabled={isSubmitting || isLockedOut}>
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Sign In
            </Button>
          </TabsContent>

          <TabsContent value="signup" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="signup-email">Email</Label>
              <Input id="signup-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-password">Password</Label>
              <Input id="signup-password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" autoComplete="new-password" />
              <p className="text-xs text-muted-foreground">Min 8 chars, uppercase, lowercase, and a number</p>
            </div>
            <Button className="w-full" onClick={() => handleSubmit('signup')} disabled={isSubmitting || isLockedOut}>
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Create Account
            </Button>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Auth;
