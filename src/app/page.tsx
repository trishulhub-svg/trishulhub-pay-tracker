'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useTheme } from 'next-themes';
import { useAppStore, SessionUser } from '@/lib/store';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

// UI Components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';

// Icons
import {
  LayoutDashboard,
  FileText,
  Clock,
  Briefcase,
  Gift,
  Shield,
  Settings,
  LogOut,
  Sun,
  Moon,
  Menu,
  Plus,
  Edit3,
  Trash2,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Building2,
  ClipboardList,
  Star,
  Copy,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  Upload,
  Download,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  MapPin,
  Timer,
  Coffee,
  X,
} from 'lucide-react';

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

interface Company {
  id: string;
  name: string;
  userId: string;
  createdAt: string;
  _count?: { paymentRecords: number };
}

interface PaymentRecord {
  id: string;
  userId: string;
  companyId: string;
  month: number;
  year: number;
  totalExpected: number;
  totalReceived: number;
  totalHMRC: number;
  totalDue: number;
  workedHours: number;
  status: string;
  notes: string | null;
  paySlipUrl: string | null;
  paySlipName: string | null;
  company: { id: string; name: string };
}

interface Shift {
  id: string;
  userId: string;
  companyId: string;
  date: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  totalHours: number;
  shiftType: string;
  location: string | null;
  notes: string | null;
  company: { id: string; name: string };
}

// ──────────────────────────────────────────────
// Constants & Helpers
// ──────────────────────────────────────────────

const MONTH_NAMES = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function formatMonthYear(month: number, year: number): string {
  return `${MONTH_NAMES[month]} ${year}`;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount);
}

function formatHours(hours: number): string {
  return `${hours.toFixed(1)} hrs`;
}

async function apiFetch(url: string, options?: RequestInit) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Something went wrong');
  }
  return data;
}

// ──────────────────────────────────────────────
// UK Terms & Conditions Content
// ──────────────────────────────────────────────

const TERMS_AND_CONDITIONS = `
TRISHULHUB PAY TRACKER – TERMS AND CONDITIONS

Last updated: March 2025

These Terms and Conditions ("Terms") govern your use of the TrishulHub Pay Tracker application ("App") operated by TrishulHub ("we", "us", "our"). By creating an account and using the App, you agree to be bound by these Terms.

1. DEFINITIONS
"User" means any individual who registers an account on the App. "Content" means any data, files, or information uploaded or entered by the User. "Services" means the salary tracking, shift tracking, and related features provided by the App.

2. ACCEPTANCE OF TERMS
By ticking the acceptance checkbox and creating an account, you confirm that you have read, understood, and agree to be bound by these Terms. If you do not agree, you must not use the App.

3. USER ACCOUNTS
3.1 You must provide accurate and complete information when registering.
3.2 You are responsible for maintaining the confidentiality of your login credentials.
3.3 You must notify us immediately of any unauthorised use of your account.
3.4 We reserve the right to suspend or terminate accounts that violate these Terms.

4. DATA PROTECTION AND GDPR
4.1 We are committed to protecting your personal data in accordance with the UK General Data Protection Regulation (UK GDPR) and the Data Protection Act 2018.
4.2 We act as the data controller for the personal information you provide. Our lawful basis for processing is legitimate interest and contractual necessity.
4.3 Personal data collected includes: name, email address, and payment tracking data you enter.
4.4 You have the right to access, rectify, erase, restrict, or port your data. Requests should be sent to our contact email.
4.5 We will not share your personal data with third parties except where required by law or to provide the Services.
4.6 We implement appropriate technical and organisational measures to protect your data.
4.7 Data is stored within the United Kingdom.

5. USER RESPONSIBILITIES
5.1 You are solely responsible for the accuracy of payment records, shift data, and other information you enter.
5.2 You must not use the App for any unlawful purpose or in violation of any applicable regulations.
5.3 You must not attempt to gain unauthorised access to other users' accounts or our systems.
5.4 You must not upload malicious files, viruses, or content that infringes third-party rights.

6. REFERRAL PROGRAMME
6.1 The referral programme allows Users to share a unique referral code.
6.2 When a new User signs up using your referral code, you (the referrer) will be upgraded to the Premium plan.
6.3 The new User who signs up with a referral code does not receive Premium status automatically; they must refer others to unlock Premium.
6.4 We reserve the right to modify or discontinue the referral programme at any time.

7. PREMIUM AND FREE PLANS
7.1 The Free plan allows tracking of one company. The Premium plan allows tracking of multiple companies.
7.2 Premium status is granted through the referral programme.
7.3 We reserve the right to modify plan features and pricing at any time with reasonable notice.

8. INTELLECTUAL PROPERTY
8.1 All intellectual property rights in the App, including software, design, logos, and trademarks, belong to TrishulHub.
8.2 You retain ownership of the Content you upload. By using the App, you grant us a limited, non-exclusive licence to process and store your Content for the purpose of providing the Services.

9. LIMITATION OF LIABILITY
9.1 The App is provided "as is" and "as available" without warranties of any kind, whether express or implied.
9.2 We do not guarantee that the App will be uninterrupted, error-free, or completely secure.
9.3 To the maximum extent permitted by law, we shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the App.
9.4 Our total liability to you shall not exceed £100 (one hundred pounds sterling).
9.5 We are not liable for any loss of data or financial decisions made based on information in the App. The App is a tracking tool only and does not constitute financial or tax advice.

10. INDEMNITY
You agree to indemnify and hold harmless TrishulHub from any claims, damages, losses, or expenses arising from your use of the App or violation of these Terms.

11. TERMINATION
11.1 You may delete your account at any time by contacting us.
11.2 We may suspend or terminate your account if you breach these Terms.
11.3 Upon termination, your right to use the App ceases immediately. We will delete your personal data in accordance with our retention policy.

12. MODIFICATIONS TO TERMS
We may update these Terms from time to time. We will notify you of material changes via email or in-app notification. Continued use of the App after changes constitutes acceptance of the revised Terms.

13. GOVERNING LAW AND JURISDICTION
13.1 These Terms are governed by and construed in accordance with the laws of England and Wales.
13.2 Any disputes arising from these Terms shall be subject to the exclusive jurisdiction of the courts of England and Wales.

14. CONTACT
For questions about these Terms, please contact us at support@trishulhub.com.
`;

// ──────────────────────────────────────────────
// Shift Type Config
// ──────────────────────────────────────────────

const SHIFT_TYPES = [
  { value: 'REGULAR', label: 'Regular', color: 'bg-blue-500' },
  { value: 'OVERTIME', label: 'Overtime', color: 'bg-amber-500' },
  { value: 'HOLIDAY', label: 'Holiday', color: 'bg-green-500' },
  { value: 'SICK', label: 'Sick Leave', color: 'bg-red-500' },
] as const;

// ──────────────────────────────────────────────
// StatCard Component
// ──────────────────────────────────────────────

function StatCard({ title, value, icon: Icon, trend, trendLabel, color = 'text-primary' }: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  trend?: 'up' | 'down' | null;
  trendLabel?: string;
  color?: string;
}) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1 min-w-0">
            <p className="text-xs sm:text-sm text-muted-foreground truncate">{title}</p>
            <p className={cn("text-lg sm:text-2xl font-bold truncate", color)}>{value}</p>
            {trend && trendLabel && (
              <div className="flex items-center gap-1 text-xs">
                {trend === 'up' ? (
                  <ArrowUpRight className="h-3 w-3 text-green-500" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 text-red-500" />
                )}
                <span className={trend === 'up' ? 'text-green-500' : 'text-red-500'}>{trendLabel}</span>
              </div>
            )}
          </div>
          <div className="rounded-full bg-primary/10 p-2 sm:p-3 shrink-0">
            <Icon className={cn("h-4 w-4 sm:h-5 sm:w-5", color)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ──────────────────────────────────────────────
// TermsDialog Component
// ──────────────────────────────────────────────

function TermsDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="text-primary hover:underline text-sm font-medium">Read Terms</button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Terms & Conditions</DialogTitle>
          <DialogDescription>UK-standard terms governing your use of TrishulHub Pay Tracker</DialogDescription>
        </DialogHeader>
        <div className="overflow-y-auto max-h-[60vh] text-sm text-muted-foreground whitespace-pre-line custom-scrollbar pr-2">
          {TERMS_AND_CONDITIONS}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ──────────────────────────────────────────────
// Auth View
// ──────────────────────────────────────────────

function AuthView() {
  const { authView, setAuthView, setUser, setIsLoading } = useAppStore();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      const data = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setUser(data.user);
      toast.success('Welcome back!');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      toast.error('Please fill in all fields');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (!termsAccepted) {
      toast.error('You must accept the Terms and Conditions');
      return;
    }
    setLoading(true);
    try {
      const body: Record<string, unknown> = { name, email, password, termsAccepted: true };
      if (referralCode.trim()) {
        body.referralCode = referralCode.trim().toUpperCase();
      }
      const data = await apiFetch('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      setUser(data.user);
      toast.success('Account created! Refer a friend to unlock Premium!');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Logo & Brand */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="relative w-20 h-20 rounded-full overflow-hidden shadow-lg ring-4 ring-primary/20">
              <Image src="/logo.png" alt="TrishulHub" fill className="object-cover" priority />
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
            TrishulHub Pay Tracker
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">Track your salary payments from any company</p>
        </div>

        <Card className="shadow-xl border-0 bg-card/80 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <Tabs value={authView} onValueChange={(v) => setAuthView(v as 'login' | 'signup')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            <AnimatePresence mode="wait">
              {authView === 'login' ? (
                <motion.form
                  key="login"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  onSubmit={handleLogin}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                  <Button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white" disabled={loading}>
                    {loading ? 'Signing in...' : 'Sign In'}
                  </Button>
                </motion.form>
              ) : (
                <motion.form
                  key="signup"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  onSubmit={handleSignup}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Full Name</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="John Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="Min 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-referral">Referral Code (optional)</Label>
                    <Input
                      id="signup-referral"
                      type="text"
                      placeholder="TRISHUL-XXXXXX"
                      value={referralCode}
                      onChange={(e) => setReferralCode(e.target.value)}
                      disabled={loading}
                    />
                    <p className="text-xs text-muted-foreground">
                      Entering a referral code helps track who referred you, but won&apos;t give you Premium directly.
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Checkbox
                      id="terms"
                      checked={termsAccepted}
                      onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                      disabled={loading}
                      className="mt-1"
                    />
                    <label htmlFor="terms" className="text-sm leading-snug text-muted-foreground cursor-pointer">
                      I agree to the{' '}
                      <TermsDialog />
                      {' '}and Conditions
                    </label>
                  </div>
                  <Button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white" disabled={loading || !termsAccepted}>
                    {loading ? 'Creating account...' : 'Create Account'}
                  </Button>
                  <p className="text-xs text-center text-muted-foreground">
                    Free plan: Track 1 company. Refer a friend to unlock Premium!
                  </p>
                </motion.form>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Sidebar Navigation
// ──────────────────────────────────────────────

const NAV_ITEMS = [
  { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
  { id: 'records' as const, label: 'Payment Records', icon: FileText },
  { id: 'shifts' as const, label: 'Shifts', icon: Clock },
  { id: 'companies' as const, label: 'Companies', icon: Briefcase },
  { id: 'referrals' as const, label: 'Referrals', icon: Gift },
];

const ADMIN_NAV = { id: 'admin' as const, label: 'Admin', icon: Shield };
const SETTINGS_NAV = { id: 'settings' as const, label: 'Settings', icon: Settings };

function Sidebar() {
  const { user, currentView, setCurrentView, sidebarOpen, setSidebarOpen } = useAppStore();
  const isMobile = useIsMobile();

  const navItems = [
    ...NAV_ITEMS,
    ...(user?.role === 'ADMIN' ? [ADMIN_NAV] : []),
    SETTINGS_NAV,
  ];

  const mobileNavItems = [
    ...NAV_ITEMS,
    ...(user?.role === 'ADMIN' ? [ADMIN_NAV] : []),
  ];

  if (isMobile) {
    return (
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t safe-area-bottom">
        <div className="flex justify-around items-center h-16 px-1">
          {mobileNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={cn(
                  'flex flex-col items-center justify-center gap-0.5 px-2 py-1 rounded-lg transition-colors min-w-0 flex-1',
                  isActive
                    ? 'text-primary bg-primary/10'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px] truncate">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    );
  }

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen bg-card border-r transition-all duration-300 flex flex-col',
        sidebarOpen ? 'w-64' : 'w-16'
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b">
        <div className="relative w-9 h-9 rounded-full overflow-hidden shrink-0 ring-2 ring-primary/20">
          <Image src="/logo.png" alt="TH" fill className="object-cover" />
        </div>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="min-w-0"
          >
            <h2 className="font-bold text-sm bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent truncate">
              TrishulHub
            </h2>
            <p className="text-[10px] text-muted-foreground truncate">Pay Tracker</p>
          </motion.div>
        )}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="ml-auto p-1 rounded-md hover:bg-muted transition-colors shrink-0"
        >
          <Menu className="h-4 w-4" />
        </button>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto custom-scrollbar">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm',
                isActive
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {sidebarOpen && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="truncate"
                >
                  {item.label}
                </motion.span>
              )}
            </button>
          );
        })}
      </nav>

      {/* User Info */}
      {sidebarOpen && user && (
        <div className="p-3 border-t">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant={user.isPremium ? 'default' : 'secondary'} className="text-[10px]">
              {user.isPremium ? 'Premium' : 'Free'}
            </Badge>
            <span className="truncate">{user.name}</span>
          </div>
        </div>
      )}
    </aside>
  );
}

// ──────────────────────────────────────────────
// Dashboard View
// ──────────────────────────────────────────────

function DashboardView() {
  const { user, setCurrentView, setSelectedCompanyId } = useAppStore();
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState<string>('');

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const url = selectedCompanyFilter
        ? `/api/dashboard?companyId=${selectedCompanyFilter}`
        : '/api/dashboard';
      const result = await apiFetch(url);
      setData(result);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, [selectedCompanyFilter]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      </div>
    );
  }

  const stats = data.stats as {
    totalRecords: number;
    pendingCount: number;
    paidCount: number;
    totalExpected: number;
    totalReceived: number;
    totalHMRC: number;
    totalDue: number;
    workedHours: number;
  };
  const companies = (data.companies as Company[]) || [];
  const companyStats = (data.companyStats as Array<{
    id: string; name: string; recordCount: number;
    totals: { totalExpected: number; totalReceived: number; totalHMRC: number; totalDue: number };
    latestStatus: string | null;
  }>) || [];
  const recentRecords = (data.recentRecords as PaymentRecord[]) || [];
  const comparison = data.comparison as { current: PaymentRecord | null; previous: PaymentRecord | null };
  const referralInfo = data.referralInfo as { referralCode: string; referralCount: number; isPremium: boolean };
  const shiftSummary = data.shiftSummary as { totalHours: number; totalShifts: number; totalBreakMinutes: number; month: number; year: number };

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm">
            Welcome back, {user?.name?.split(' ')[0]}!
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedCompanyFilter} onValueChange={setSelectedCompanyFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Companies" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Companies</SelectItem>
              {companies.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Plan banner */}
      {!user?.isPremium && (
        <Card className="bg-gradient-to-r from-blue-600/10 to-green-600/10 border-primary/20">
          <CardContent className="p-4 flex items-center gap-3">
            <Star className="h-5 w-5 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Refer a friend to unlock Premium!</p>
              <p className="text-xs text-muted-foreground">Your code: <span className="font-mono font-bold text-primary">{referralInfo.referralCode}</span> — Track unlimited companies</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => setCurrentView('referrals')} className="shrink-0">
              Share
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Expected" value={formatCurrency(stats.totalExpected)} icon={DollarSign} color="text-blue-600 dark:text-blue-400" />
        <StatCard title="Total Received" value={formatCurrency(stats.totalReceived)} icon={TrendingUp} color="text-green-600 dark:text-green-400" />
        <StatCard title="Total Due" value={formatCurrency(stats.totalDue)} icon={AlertTriangle} color="text-amber-600 dark:text-amber-400" />
        <StatCard title="HMRC Deductions" value={formatCurrency(stats.totalHMRC)} icon={Building2} color="text-red-600 dark:text-red-400" />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Records" value={stats.totalRecords} icon={ClipboardList} />
        <StatCard title="Pending" value={stats.pendingCount} icon={XCircle} color="text-amber-600 dark:text-amber-400" />
        <StatCard title="Paid" value={stats.paidCount} icon={CheckCircle2} color="text-green-600 dark:text-green-400" />
        <StatCard title="Worked Hours" value={formatHours(stats.workedHours)} icon={Clock} />
      </div>

      {/* Month Comparison & Shift Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Month Comparison</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{formatMonthYear(currentMonth, currentYear)}</span>
              {comparison.current ? (
                <Badge variant={comparison.current.status === 'PAID' ? 'default' : 'secondary'}>
                  {formatCurrency(comparison.current.totalReceived)} / {formatCurrency(comparison.current.totalExpected)}
                </Badge>
              ) : (
                <span className="text-xs text-muted-foreground">No record</span>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {formatMonthYear(currentMonth === 1 ? 12 : currentMonth - 1, currentMonth === 1 ? currentYear - 1 : currentYear)}
              </span>
              {comparison.previous ? (
                <Badge variant={comparison.previous.status === 'PAID' ? 'default' : 'secondary'}>
                  {formatCurrency(comparison.previous.totalReceived)} / {formatCurrency(comparison.previous.totalExpected)}
                </Badge>
              ) : (
                <span className="text-xs text-muted-foreground">No record</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Shift Summary ({formatMonthYear(shiftSummary.month, shiftSummary.year)})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Shifts</span>
              <span className="font-semibold">{shiftSummary.totalShifts}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Hours</span>
              <span className="font-semibold">{formatHours(shiftSummary.totalHours)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Break Time</span>
              <span className="font-semibold">{Math.round(shiftSummary.totalBreakMinutes)} min</span>
            </div>
            <Button size="sm" variant="outline" className="w-full mt-2" onClick={() => setCurrentView('shifts')}>
              View All Shifts
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Company Stats */}
      {companyStats.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Company Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {companyStats.map((cs) => (
                <div
                  key={cs.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
                  onClick={() => {
                    setSelectedCompanyId(cs.id);
                    setCurrentView('records');
                  }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Building2 className="h-4 w-4 text-primary shrink-0" />
                    <span className="font-medium text-sm truncate">{cs.name}</span>
                    <Badge variant="outline" className="text-[10px] shrink-0">{cs.recordCount} records</Badge>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm text-muted-foreground">{formatCurrency(cs.totals.totalReceived)}</span>
                    <Badge variant={cs.latestStatus === 'PAID' ? 'default' : 'secondary'} className="text-[10px]">
                      {cs.latestStatus || 'N/A'}
                    </Badge>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Records */}
      {recentRecords.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Recent Records</CardTitle>
              <Button size="sm" variant="ghost" onClick={() => setCurrentView('records')}>
                View All <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentRecords.slice(0, 5).map((record) => (
                <div key={record.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{record.company.name}</p>
                    <p className="text-xs text-muted-foreground">{formatMonthYear(record.month, record.year)}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-medium">{formatCurrency(record.totalReceived)}</span>
                    <Badge variant={record.status === 'PAID' ? 'default' : 'secondary'} className="text-[10px]">
                      {record.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// Payment Records View
// ──────────────────────────────────────────────

function PaymentRecordsView() {
  const { setCurrentView, setSelectedRecordId } = useAppStore();
  const [records, setRecords] = useState<PaymentRecord[]>([]);
  const [totals, setTotals] = useState<Record<string, number>>({});
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCompany, setFilterCompany] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchRecords = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterCompany) params.set('companyId', filterCompany);
      if (filterStatus) params.set('status', filterStatus);
      const data = await apiFetch(`/api/payment-records?${params.toString()}`);
      setRecords(data.records || []);
      setTotals(data.totals || {});
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to load records');
    } finally {
      setLoading(false);
    }
  }, [filterCompany, filterStatus]);

  const fetchCompanies = useCallback(async () => {
    try {
      const data = await apiFetch('/api/companies');
      setCompanies(data.companies || []);
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const handleDelete = async (id: string) => {
    try {
      await apiFetch(`/api/payment-records/${id}`, { method: 'DELETE' });
      toast.success('Record deleted');
      fetchRecords();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete');
    }
    setDeleteId(null);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Payment Records</h1>
          <p className="text-muted-foreground text-sm">{records.length} records</p>
        </div>
        <Button onClick={() => setCurrentView('add-record')} className="bg-gradient-to-r from-blue-600 to-green-600 text-white">
          <Plus className="h-4 w-4 mr-2" /> Add Record
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Select value={filterCompany} onValueChange={setFilterCompany}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Companies" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Companies</SelectItem>
            {companies.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="PAID">Paid</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Totals Bar */}
      {records.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-lg bg-muted/50 p-3 text-center">
            <p className="text-xs text-muted-foreground">Expected</p>
            <p className="text-sm font-bold text-blue-600 dark:text-blue-400">{formatCurrency(totals.totalExpected || 0)}</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3 text-center">
            <p className="text-xs text-muted-foreground">Received</p>
            <p className="text-sm font-bold text-green-600 dark:text-green-400">{formatCurrency(totals.totalReceived || 0)}</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3 text-center">
            <p className="text-xs text-muted-foreground">Due</p>
            <p className="text-sm font-bold text-amber-600 dark:text-amber-400">{formatCurrency(totals.totalDue || 0)}</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3 text-center">
            <p className="text-xs text-muted-foreground">HMRC</p>
            <p className="text-sm font-bold text-red-600 dark:text-red-400">{formatCurrency(totals.totalHMRC || 0)}</p>
          </div>
        </div>
      )}

      {/* Records List */}
      {records.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-medium">No payment records yet</h3>
            <p className="text-sm text-muted-foreground mb-4">Add your first payment record to start tracking</p>
            <Button onClick={() => setCurrentView('add-record')} className="bg-gradient-to-r from-blue-600 to-green-600 text-white">
              <Plus className="h-4 w-4 mr-2" /> Add Record
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2 max-h-[calc(100vh-400px)] overflow-y-auto custom-scrollbar">
          {records.map((record) => (
            <Card key={record.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium text-sm">{record.company.name}</h3>
                      <Badge variant={record.status === 'PAID' ? 'default' : 'secondary'} className="text-[10px]">
                        {record.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatMonthYear(record.month, record.year)}
                      {record.workedHours > 0 && ` • ${formatHours(record.workedHours)}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <p className="text-sm font-semibold">{formatCurrency(record.totalReceived)}</p>
                      <p className="text-xs text-muted-foreground">of {formatCurrency(record.totalExpected)}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => {
                          setSelectedRecordId(record.id);
                          setCurrentView('edit-record');
                        }}
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </Button>
                      <AlertDialog open={deleteId === record.id} onOpenChange={(open) => !open && setDeleteId(null)}>
                        <AlertDialogTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(record.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Record?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete the payment record for {record.company.name} ({formatMonthYear(record.month, record.year)}).
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(record.id)} className="bg-destructive text-destructive-foreground">
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
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

// ──────────────────────────────────────────────
// Add/Edit Payment Record Form
// ──────────────────────────────────────────────

function PaymentRecordForm({ editMode }: { editMode: boolean }) {
  const { user, selectedRecordId, setCurrentView } = useAppStore();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [existingRecord, setExistingRecord] = useState<PaymentRecord | null>(null);
  const [shiftHoursInfo, setShiftHoursInfo] = useState<{ totalHours: number; totalShifts: number } | null>(null);

  const [companyId, setCompanyId] = useState('');
  const [month, setMonth] = useState<string>('');
  const [year, setYear] = useState<string>(new Date().getFullYear().toString());
  const [totalExpected, setTotalExpected] = useState('');
  const [totalReceived, setTotalReceived] = useState('');
  const [totalHMRC, setTotalHMRC] = useState('');
  const [workedHours, setWorkedHours] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('PENDING');

  // Fetch companies
  useEffect(() => {
    (async () => {
      try {
        const data = await apiFetch('/api/companies');
        setCompanies(data.companies || []);
        if (!editMode && data.companies?.length === 1) {
          setCompanyId(data.companies[0].id);
        }
      } catch {
        // silently fail
      }
    })();
  }, [editMode]);

  // Fetch existing record for edit mode
  useEffect(() => {
    if (editMode && selectedRecordId) {
      (async () => {
        try {
          const data = await apiFetch('/api/payment-records');
          const record = (data.records as PaymentRecord[])?.find((r) => r.id === selectedRecordId);
          if (record) {
            setExistingRecord(record);
            setCompanyId(record.companyId);
            setMonth(record.month.toString());
            setYear(record.year.toString());
            setTotalExpected(record.totalExpected.toString());
            setTotalReceived(record.totalReceived.toString());
            setTotalHMRC(record.totalHMRC.toString());
            setWorkedHours(record.workedHours.toString());
            setNotes(record.notes || '');
            setStatus(record.status);
          }
        } catch {
          // silently fail
        }
      })();
    }
  }, [editMode, selectedRecordId]);

  // Auto-populate shift hours when company/month/year selected
  useEffect(() => {
    if (companyId && month && year && !editMode) {
      (async () => {
        try {
          const data = await apiFetch(`/api/shifts/hours?companyId=${companyId}&month=${month}&year=${year}`);
          if (data.totalHours > 0) {
            setShiftHoursInfo({ totalHours: data.totalHours, totalShifts: data.totalShifts });
            setWorkedHours(data.totalHours.toString());
          } else {
            setShiftHoursInfo(null);
          }
        } catch {
          setShiftHoursInfo(null);
        }
      })();
    } else {
      setShiftHoursInfo(null);
    }
  }, [companyId, month, year, editMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !month || !year) {
      toast.error('Please select company, month, and year');
      return;
    }
    setLoading(true);
    try {
      const body = {
        companyId,
        month: parseInt(month),
        year: parseInt(year),
        totalExpected: parseFloat(totalExpected) || 0,
        totalReceived: parseFloat(totalReceived) || 0,
        totalHMRC: parseFloat(totalHMRC) || 0,
        workedHours: parseFloat(workedHours) || 0,
        notes: notes || null,
        status,
      };

      if (editMode && selectedRecordId) {
        await apiFetch(`/api/payment-records/${selectedRecordId}`, {
          method: 'PUT',
          body: JSON.stringify(body),
        });
        toast.success('Record updated');
      } else {
        await apiFetch('/api/payment-records', {
          method: 'POST',
          body: JSON.stringify(body),
        });
        toast.success('Record created');
      }
      setCurrentView('records');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save record');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setCurrentView('records')}>
          <ChevronRight className="h-4 w-4 rotate-180" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{editMode ? 'Edit Payment Record' : 'Add Payment Record'}</h1>
          <p className="text-muted-foreground text-sm">
            {editMode ? 'Update payment details' : 'Record a new payment entry'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
        <div className="space-y-2">
          <Label>Company *</Label>
          {companies.length === 0 ? (
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              No companies yet.{' '}
              <button type="button" onClick={() => setCurrentView('add-company')} className="text-primary hover:underline">
                Add one first
              </button>
            </div>
          ) : (
            <Select value={companyId} onValueChange={setCompanyId} disabled={editMode}>
              <SelectTrigger>
                <SelectValue placeholder="Select company" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Month *</Label>
            <Select value={month} onValueChange={setMonth} disabled={editMode}>
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {MONTH_NAMES.slice(1).map((m, i) => (
                  <SelectItem key={i} value={(i + 1).toString()}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Year *</Label>
            <Input
              type="number"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              disabled={editMode}
              placeholder="2025"
            />
          </div>
        </div>

        {/* Shift Hours Info Banner */}
        {shiftHoursInfo && (
          <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-3 flex items-start gap-2">
            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="text-blue-800 dark:text-blue-300">
                Based on your shift records, you worked <strong>{shiftHoursInfo.totalHours}</strong> hours across <strong>{shiftHoursInfo.totalShifts}</strong> shifts this month. You can change this if needed.
              </p>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label>Worked Hours</Label>
          <Input
            type="number"
            step="0.5"
            value={workedHours}
            onChange={(e) => setWorkedHours(e.target.value)}
            placeholder="0"
          />
        </div>

        <Separator />

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Total Expected (GBP)</Label>
            <Input
              type="number"
              step="0.01"
              value={totalExpected}
              onChange={(e) => setTotalExpected(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div className="space-y-2">
            <Label>Total Received (GBP)</Label>
            <Input
              type="number"
              step="0.01"
              value={totalReceived}
              onChange={(e) => setTotalReceived(e.target.value)}
              placeholder="0.00"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>HMRC Deductions (GBP)</Label>
          <Input
            type="number"
            step="0.01"
            value={totalHMRC}
            onChange={(e) => setTotalHMRC(e.target.value)}
            placeholder="0.00"
          />
        </div>

        {totalExpected && totalReceived && (
          <div className="rounded-lg bg-muted p-3 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Amount Due</span>
            <span className={cn(
              'font-bold',
              parseFloat(totalExpected) - parseFloat(totalReceived) <= 0
                ? 'text-green-600 dark:text-green-400'
                : 'text-amber-600 dark:text-amber-400'
            )}>
              {formatCurrency(Math.max(0, parseFloat(totalExpected) - parseFloat(totalReceived)))}
            </span>
          </div>
        )}

        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="PAID">Paid</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Notes</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any additional notes..."
            rows={3}
          />
        </div>

        <div className="flex gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => setCurrentView('records')}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading || !companyId || !month || !year}
            className="bg-gradient-to-r from-blue-600 to-green-600 text-white"
          >
            {loading ? 'Saving...' : editMode ? 'Update Record' : 'Create Record'}
          </Button>
        </div>
      </form>
    </div>
  );
}

// ──────────────────────────────────────────────
// Companies View
// ──────────────────────────────────────────────

function CompaniesView() {
  const { user, setCurrentView } = useAppStore();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchCompanies = useCallback(async () => {
    try {
      const data = await apiFetch('/api/companies');
      setCompanies(data.companies || []);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to load companies');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setAddLoading(true);
    try {
      await apiFetch('/api/companies', {
        method: 'POST',
        body: JSON.stringify({ name: newName.trim() }),
      });
      toast.success('Company added');
      setNewName('');
      setShowAdd(false);
      fetchCompanies();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to add company');
    } finally {
      setAddLoading(false);
    }
  };

  const handleEdit = async (id: string) => {
    if (!editName.trim()) return;
    try {
      await apiFetch(`/api/companies/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ name: editName.trim() }),
      });
      toast.success('Company updated');
      setEditId(null);
      fetchCompanies();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiFetch(`/api/companies/${id}`, { method: 'DELETE' });
      toast.success('Company deleted');
      fetchCompanies();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete');
    }
    setDeleteId(null);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-16" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Companies</h1>
          <p className="text-muted-foreground text-sm">{companies.length} companies tracked</p>
        </div>
        <div className="flex items-center gap-2">
          {!user?.isPremium && companies.length >= 1 && (
            <Badge variant="secondary" className="text-xs">
              Free: 1 company max
            </Badge>
          )}
          <Button onClick={() => setShowAdd(true)} className="bg-gradient-to-r from-blue-600 to-green-600 text-white">
            <Plus className="h-4 w-4 mr-2" /> Add Company
          </Button>
        </div>
      </div>

      {/* Add Form */}
      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card>
              <CardContent className="p-4">
                <form onSubmit={handleAdd} className="flex gap-2">
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Company name"
                    disabled={addLoading}
                    className="flex-1"
                  />
                  <Button type="submit" disabled={addLoading || !newName.trim()} className="bg-gradient-to-r from-blue-600 to-green-600 text-white">
                    {addLoading ? 'Adding...' : 'Add'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => { setShowAdd(false); setNewName(''); }}>
                    Cancel
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Companies List */}
      {companies.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-medium">No companies yet</h3>
            <p className="text-sm text-muted-foreground mb-4">Add a company to start tracking payments</p>
            <Button onClick={() => setShowAdd(true)} className="bg-gradient-to-r from-blue-600 to-green-600 text-white">
              <Plus className="h-4 w-4 mr-2" /> Add Company
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {companies.map((company) => (
            <Card key={company.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                {editId === company.id ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleEdit(company.id);
                    }}
                    className="flex items-center gap-2"
                  >
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1"
                    />
                    <Button type="submit" size="sm">Save</Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setEditId(null)}>
                      Cancel
                    </Button>
                  </form>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <Building2 className="h-5 w-5 text-primary shrink-0" />
                      <div className="min-w-0">
                        <h3 className="font-medium truncate">{company.name}</h3>
                        <p className="text-xs text-muted-foreground">
                          {company._count?.paymentRecords || 0} payment records
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => {
                          setEditId(company.id);
                          setEditName(company.name);
                        }}
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </Button>
                      <AlertDialog open={deleteId === company.id} onOpenChange={(open) => !open && setDeleteId(null)}>
                        <AlertDialogTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(company.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Company?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete {company.name} and all its payment records. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(company.id)} className="bg-destructive text-destructive-foreground">
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Premium Upgrade Notice */}
      {!user?.isPremium && companies.length >= 1 && (
        <Card className="bg-gradient-to-r from-blue-600/10 to-green-600/10 border-primary/20">
          <CardContent className="p-4 flex items-center gap-3">
            <Star className="h-5 w-5 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Want to track more companies?</p>
              <p className="text-xs text-muted-foreground">Refer a friend to unlock Premium and add unlimited companies!</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => setCurrentView('referrals')} className="shrink-0">
              Refer Now
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// Shifts View
// ──────────────────────────────────────────────

function ShiftsView() {
  const { setCurrentView, setSelectedShiftId } = useAppStore();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [totals, setTotals] = useState({ totalHours: 0, totalBreakMinutes: 0, totalShifts: 0 });
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCompany, setFilterCompany] = useState<string>('');
  const [filterMonth, setFilterMonth] = useState<string>('');
  const [filterYear, setFilterYear] = useState<string>('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchShifts = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterCompany) params.set('companyId', filterCompany);
      if (filterMonth) params.set('month', filterMonth);
      if (filterYear) params.set('year', filterYear);
      const data = await apiFetch(`/api/shifts?${params.toString()}`);
      setShifts(data.shifts || []);
      setTotals(data.totals || { totalHours: 0, totalBreakMinutes: 0, totalShifts: 0 });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to load shifts');
    } finally {
      setLoading(false);
    }
  }, [filterCompany, filterMonth, filterYear]);

  const fetchCompanies = useCallback(async () => {
    try {
      const data = await apiFetch('/api/companies');
      setCompanies(data.companies || []);
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  useEffect(() => {
    fetchShifts();
  }, [fetchShifts]);

  const handleDelete = async (id: string) => {
    try {
      await apiFetch(`/api/shifts/${id}`, { method: 'DELETE' });
      toast.success('Shift deleted');
      fetchShifts();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete');
    }
    setDeleteId(null);
  };

  const getShiftTypeBadge = (type: string) => {
    const config = SHIFT_TYPES.find((t) => t.value === type);
    const label = config?.label || type;
    const colorClass = type === 'REGULAR' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
      : type === 'OVERTIME' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
      : type === 'HOLIDAY' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    return <Badge className={cn('text-[10px]', colorClass)}>{label}</Badge>;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Shifts</h1>
          <p className="text-muted-foreground text-sm">Track your work shifts and hours</p>
        </div>
        <Button onClick={() => setCurrentView('add-shift')} className="bg-gradient-to-r from-blue-600 to-green-600 text-white">
          <Plus className="h-4 w-4 mr-2" /> Add Shift
        </Button>
      </div>

      {/* Summary Stats */}
      {totals.totalShifts > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-lg bg-muted/50 p-3 text-center">
            <p className="text-xs text-muted-foreground">Total Shifts</p>
            <p className="text-lg font-bold">{totals.totalShifts}</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3 text-center">
            <p className="text-xs text-muted-foreground">Total Hours</p>
            <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{formatHours(totals.totalHours)}</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3 text-center">
            <p className="text-xs text-muted-foreground">Break Time</p>
            <p className="text-lg font-bold">{Math.round(totals.totalBreakMinutes)} min</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3 text-center">
            <p className="text-xs text-muted-foreground">Avg Hours/Shift</p>
            <p className="text-lg font-bold">{totals.totalShifts > 0 ? (totals.totalHours / totals.totalShifts).toFixed(1) : '0.0'} hrs</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Select value={filterCompany} onValueChange={setFilterCompany}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Companies" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Companies</SelectItem>
            {companies.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterMonth} onValueChange={setFilterMonth}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="All Months" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Months</SelectItem>
            {MONTH_NAMES.slice(1).map((m, i) => (
              <SelectItem key={i} value={(i + 1).toString()}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterYear} onValueChange={setFilterYear}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="All Years" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Years</SelectItem>
            {[2025, 2024, 2023, 2022].map((y) => (
              <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Shifts List */}
      {shifts.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-medium">No shifts recorded yet</h3>
            <p className="text-sm text-muted-foreground mb-4">Add your first shift to start tracking hours</p>
            <Button onClick={() => setCurrentView('add-shift')} className="bg-gradient-to-r from-blue-600 to-green-600 text-white">
              <Plus className="h-4 w-4 mr-2" /> Add Shift
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2 max-h-[calc(100vh-400px)] overflow-y-auto custom-scrollbar">
          {shifts.map((shift) => (
            <Card key={shift.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium text-sm">{shift.company.name}</h3>
                      {getShiftTypeBadge(shift.shiftType)}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> {shift.date}
                      </span>
                      <span className="flex items-center gap-1">
                        <Timer className="h-3 w-3" /> {shift.startTime} – {shift.endTime}
                      </span>
                      <span className="flex items-center gap-1">
                        <Coffee className="h-3 w-3" /> {shift.breakMinutes} min break
                      </span>
                      {shift.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {shift.location}
                        </span>
                      )}
                    </div>
                    {shift.notes && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">{shift.notes}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="font-bold text-sm text-blue-600 dark:text-blue-400">{formatHours(shift.totalHours)}</span>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => {
                          setSelectedShiftId(shift.id);
                          setCurrentView('edit-shift');
                        }}
                      >
                        <Edit3 className="h-3 w-3" />
                      </Button>
                      <AlertDialog open={deleteId === shift.id} onOpenChange={(open) => !open && setDeleteId(null)}>
                        <AlertDialogTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(shift.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Shift?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Delete the shift on {shift.date} ({shift.startTime} – {shift.endTime})?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(shift.id)} className="bg-destructive text-destructive-foreground">
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
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

// ──────────────────────────────────────────────
// Add/Edit Shift Form
// ──────────────────────────────────────────────

function ShiftForm({ editMode }: { editMode: boolean }) {
  const { selectedShiftId, setCurrentView } = useAppStore();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingShift, setFetchingShift] = useState(false);

  const [companyId, setCompanyId] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [breakMinutes, setBreakMinutes] = useState('0');
  const [shiftType, setShiftType] = useState('REGULAR');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');

  const [calculatedHours, setCalculatedHours] = useState<number | null>(null);

  // Auto-calculate hours
  useEffect(() => {
    if (startTime && endTime) {
      const [startH, startM] = startTime.split(':').map(Number);
      const [endH, endM] = endTime.split(':').map(Number);
      let startMin = startH * 60 + startM;
      let endMin = endH * 60 + endM;
      if (endMin <= startMin) endMin += 24 * 60; // overnight shift
      const worked = endMin - startMin - (parseInt(breakMinutes) || 0);
      setCalculatedHours(Math.max(0, worked / 60));
    } else {
      setCalculatedHours(null);
    }
  }, [startTime, endTime, breakMinutes]);

  // Fetch companies
  useEffect(() => {
    (async () => {
      try {
        const data = await apiFetch('/api/companies');
        setCompanies(data.companies || []);
        if (!editMode && data.companies?.length === 1) {
          setCompanyId(data.companies[0].id);
        }
      } catch {
        // silently fail
      }
    })();
  }, [editMode]);

  // Fetch existing shift for edit mode
  useEffect(() => {
    if (editMode && selectedShiftId) {
      setFetchingShift(true);
      (async () => {
        try {
          const data = await apiFetch('/api/shifts');
          const shift = (data.shifts as Shift[])?.find((s) => s.id === selectedShiftId);
          if (shift) {
            setCompanyId(shift.companyId);
            setDate(shift.date);
            setStartTime(shift.startTime);
            setEndTime(shift.endTime);
            setBreakMinutes(shift.breakMinutes.toString());
            setShiftType(shift.shiftType);
            setLocation(shift.location || '');
            setNotes(shift.notes || '');
          }
        } catch {
          // silently fail
        } finally {
          setFetchingShift(false);
        }
      })();
    }
  }, [editMode, selectedShiftId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !date || !startTime || !endTime) {
      toast.error('Please fill in all required fields');
      return;
    }
    setLoading(true);
    try {
      const body = {
        companyId,
        date,
        startTime,
        endTime,
        breakMinutes: parseInt(breakMinutes) || 0,
        shiftType,
        location: location || null,
        notes: notes || null,
      };

      if (editMode && selectedShiftId) {
        await apiFetch(`/api/shifts/${selectedShiftId}`, {
          method: 'PUT',
          body: JSON.stringify(body),
        });
        toast.success('Shift updated');
      } else {
        await apiFetch('/api/shifts', {
          method: 'POST',
          body: JSON.stringify(body),
        });
        toast.success('Shift added');
      }
      setCurrentView('shifts');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save shift');
    } finally {
      setLoading(false);
    }
  };

  if (fetchingShift) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-10" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setCurrentView('shifts')}>
          <ChevronRight className="h-4 w-4 rotate-180" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{editMode ? 'Edit Shift' : 'Add Shift'}</h1>
          <p className="text-muted-foreground text-sm">
            {editMode ? 'Update shift details' : 'Record a new work shift'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
        <div className="space-y-2">
          <Label>Company *</Label>
          {companies.length === 0 ? (
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              No companies yet.{' '}
              <button type="button" onClick={() => setCurrentView('add-company')} className="text-primary hover:underline">
                Add one first
              </button>
            </div>
          ) : (
            <Select value={companyId} onValueChange={setCompanyId}>
              <SelectTrigger>
                <SelectValue placeholder="Select company" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="space-y-2">
          <Label>Date *</Label>
          <Input
            type="text"
            placeholder="YYYY-MM-DD"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            pattern="\d{4}-\d{2}-\d{2}"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Start Time *</Label>
            <Input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>End Time *</Label>
            <Input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Break (minutes)</Label>
            <Input
              type="number"
              value={breakMinutes}
              onChange={(e) => setBreakMinutes(e.target.value)}
              min="0"
            />
          </div>
          <div className="space-y-2">
            <Label>Shift Type</Label>
            <Select value={shiftType} onValueChange={setShiftType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SHIFT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Calculated Hours Preview */}
        {calculatedHours !== null && (
          <div className="rounded-lg bg-muted p-3 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total Hours</span>
            <span className="font-bold text-blue-600 dark:text-blue-400">{formatHours(calculatedHours)}</span>
          </div>
        )}

        {endTime && startTime && parseInt(endTime.split(':')[0]) < parseInt(startTime.split(':')[0]) && (
          <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3 flex items-start gap-2">
            <Info className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-800 dark:text-amber-300">This looks like an overnight shift. Hours will be calculated across midnight.</p>
          </div>
        )}

        <div className="space-y-2">
          <Label>Location</Label>
          <Input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. London Office"
          />
        </div>

        <div className="space-y-2">
          <Label>Notes</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any additional notes..."
            rows={2}
          />
        </div>

        <div className="flex gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => setCurrentView('shifts')}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading || !companyId || !date || !startTime || !endTime}
            className="bg-gradient-to-r from-blue-600 to-green-600 text-white"
          >
            {loading ? 'Saving...' : editMode ? 'Update Shift' : 'Add Shift'}
          </Button>
        </div>
      </form>
    </div>
  );
}

// ──────────────────────────────────────────────
// Referrals View
// ──────────────────────────────────────────────

function ReferralsView() {
  const { user } = useAppStore();
  const [referralCode, setReferralCode] = useState(user?.referralCode || '');
  const [referralCount, setReferralCount] = useState(0);
  const [isPremium, setIsPremium] = useState(user?.isPremium || false);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await apiFetch('/api/referrals');
        setReferralCode(data.referralCode);
        setReferralCount(data.referralCount);
        setIsPremium(data.isPremium);
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Failed to load referrals');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    toast.success('Referral code copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Referrals</h1>
        <p className="text-muted-foreground text-sm">Refer a friend to unlock Premium!</p>
      </div>

      {/* Status Card */}
      <Card className={isPremium ? 'bg-gradient-to-r from-green-600/10 to-emerald-600/10 border-green-500/30' : 'bg-gradient-to-r from-blue-600/10 to-green-600/10 border-primary/20'}>
        <CardContent className="p-6 text-center">
          {isPremium ? (
            <>
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-xl font-bold text-green-700 dark:text-green-400">Premium Active!</h2>
              <p className="text-sm text-muted-foreground mt-1">You can track unlimited companies</p>
              <p className="text-sm mt-2">You&apos;ve referred <strong>{referralCount}</strong> {referralCount === 1 ? 'friend' : 'friends'}</p>
            </>
          ) : (
            <>
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Star className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-xl font-bold">Refer a Friend to Unlock Premium!</h2>
              <p className="text-sm text-muted-foreground mt-1">When someone signs up with your code, YOU get Premium</p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Referral Code */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Your Referral Code</CardTitle>
          <CardDescription>Share this code with friends — when they sign up with it, you get Premium!</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <div className="flex-1 rounded-lg bg-muted p-3 text-center">
              <span className="font-mono text-lg font-bold tracking-wider">{referralCode}</span>
            </div>
            <Button onClick={handleCopy} variant="outline" size="icon" className="shrink-0">
              {copied ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* How It Works */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">How Referrals Work</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-blue-600 dark:text-blue-400">1</span>
            </div>
            <div>
              <p className="text-sm font-medium">Share your referral code</p>
              <p className="text-xs text-muted-foreground">Send your unique code to a friend</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-green-600 dark:text-green-400">2</span>
            </div>
            <div>
              <p className="text-sm font-medium">They sign up with your code</p>
              <p className="text-xs text-muted-foreground">Your friend enters your code during signup</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-amber-600 dark:text-amber-400">3</span>
            </div>
            <div>
              <p className="text-sm font-medium">You get Premium!</p>
              <p className="text-xs text-muted-foreground">As the referrer, you unlock Premium and can track unlimited companies</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard title="Friends Referred" value={referralCount} icon={Users} />
        <StatCard title="Plan" value={isPremium ? 'Premium' : 'Free'} icon={Star} color={isPremium ? 'text-green-600 dark:text-green-400' : undefined} />
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Admin Dashboard View
// ──────────────────────────────────────────────

function AdminView() {
  const { user } = useAppStore();
  const [data, setData] = useState<{
    stats: {
      totalUsers: number;
      premiumUsers: number;
      freeUsers: number;
      totalCompanies: number;
      totalPaymentRecords: number;
      totalShifts: number;
      signupsThisMonth: number;
      signupsLastMonth: number;
      referralConversions: number;
    };
    recentSignups: Array<{ createdAt: string; isPremium: boolean; referredBy: string | null }>;
    monthlySignups: Array<{ month: string; count: number }>;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role !== 'ADMIN') return;
    (async () => {
      try {
        const result = await apiFetch('/api/admin');
        setData(result);
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Failed to load admin data');
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.role]);

  if (user?.role !== 'ADMIN') {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-medium">Access Denied</h3>
          <p className="text-sm text-muted-foreground">Admin access required</p>
        </CardContent>
      </Card>
    );
  }

  if (loading || !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      </div>
    );
  }

  const { stats, recentSignups, monthlySignups } = data;
  const signupTrend = stats.signupsLastMonth > 0
    ? Math.round(((stats.signupsThisMonth - stats.signupsLastMonth) / stats.signupsLastMonth) * 100)
    : stats.signupsThisMonth > 0 ? 100 : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground text-sm">Platform analytics and overview</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Signups"
          value={stats.totalUsers}
          icon={Users}
          trend={signupTrend >= 0 ? 'up' : 'down'}
          trendLabel={`${Math.abs(signupTrend)}% vs last month`}
        />
        <StatCard
          title="Premium Users"
          value={stats.premiumUsers}
          icon={Star}
          color="text-green-600 dark:text-green-400"
        />
        <StatCard
          title="Free Users"
          value={stats.freeUsers}
          icon={Users}
          color="text-muted-foreground"
        />
        <StatCard
          title="Total Companies"
          value={stats.totalCompanies}
          icon={Building2}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Payment Records"
          value={stats.totalPaymentRecords}
          icon={ClipboardList}
        />
        <StatCard
          title="Total Shifts"
          value={stats.totalShifts}
          icon={Clock}
        />
        <StatCard
          title="Signups This Month"
          value={stats.signupsThisMonth}
          icon={TrendingUp}
          color="text-blue-600 dark:text-blue-400"
        />
        <StatCard
          title="Referral Conversions"
          value={stats.referralConversions}
          icon={Gift}
          color="text-green-600 dark:text-green-400"
        />
      </div>

      {/* Monthly Signups Trend */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Monthly Signups (Last 6 Months)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {monthlySignups.map((ms) => {
              const maxCount = Math.max(...monthlySignups.map((m) => m.count), 1);
              const widthPercent = (ms.count / maxCount) * 100;
              return (
                <div key={ms.month} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-24 shrink-0">{ms.month}</span>
                  <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-600 to-green-600 rounded-full transition-all duration-500"
                      style={{ width: `${widthPercent}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium w-8 text-right">{ms.count}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recent Signups */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recent Signups</CardTitle>
          <CardDescription>No personal data shown — just metadata</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Referred</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentSignups.map((signup, i) => (
                <TableRow key={i}>
                  <TableCell className="text-sm">
                    {new Date(signup.createdAt).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </TableCell>
                  <TableCell>
                    <Badge variant={signup.isPremium ? 'default' : 'secondary'} className="text-[10px]">
                      {signup.isPremium ? 'Premium' : 'Free'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {signup.referredBy ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <X className="h-4 w-4 text-muted-foreground" />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ──────────────────────────────────────────────
// Settings View
// ──────────────────────────────────────────────

function SettingsView() {
  const { user, logout } = useAppStore();
  const { theme, setTheme } = useTheme();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
      logout();
      toast.success('Logged out');
    } catch {
      logout();
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm">Manage your account and preferences</p>
      </div>

      {/* Profile Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Name</span>
            <span className="text-sm font-medium">{user?.name}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Email</span>
            <span className="text-sm font-medium">{user?.email}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Plan</span>
            <Badge variant={user?.isPremium ? 'default' : 'secondary'}>
              {user?.isPremium ? 'Premium' : 'Free'}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Role</span>
            <Badge variant="outline">{user?.role || 'USER'}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Referral Code</span>
            <span className="text-sm font-mono font-bold text-primary">{user?.referralCode}</span>
          </div>
        </CardContent>
      </Card>

      {/* Theme */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Appearance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {theme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              <span className="text-sm">Dark Mode</span>
            </div>
            <div className="flex items-center gap-2">
              <Select value={theme} onValueChange={setTheme}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-destructive">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full sm:w-auto"
          >
            <LogOut className="h-4 w-4 mr-2" />
            {loggingOut ? 'Logging out...' : 'Log Out'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ──────────────────────────────────────────────
// Main App Layout
// ──────────────────────────────────────────────

function MainApp() {
  const { user, currentView, sidebarOpen } = useAppStore();
  const isMobile = useIsMobile();

  useEffect(() => {
    // Check session on mount
    (async () => {
      try {
        const data = await apiFetch('/api/auth/session');
        if (data.user) {
          useAppStore.getState().setUser(data.user);
        } else {
          useAppStore.getState().logout();
        }
      } catch {
        useAppStore.getState().logout();
      }
    })();
  }, []);

  if (!user) return null;

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <DashboardView />;
      case 'records':
        return <PaymentRecordsView />;
      case 'add-record':
        return <PaymentRecordForm editMode={false} />;
      case 'edit-record':
        return <PaymentRecordForm editMode={true} />;
      case 'companies':
      case 'add-company':
        return <CompaniesView />;
      case 'shifts':
        return <ShiftsView />;
      case 'add-shift':
        return <ShiftForm editMode={false} />;
      case 'edit-shift':
        return <ShiftForm editMode={true} />;
      case 'referrals':
        return <ReferralsView />;
      case 'admin':
        return <AdminView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main
        className={cn(
          'transition-all duration-300',
          isMobile ? 'pb-20 pt-4 px-4' : 'pt-6 px-6',
          !isMobile && 'ml-16'
        )}
        style={!isMobile ? { marginLeft: sidebarOpen ? '16rem' : '4rem' } : undefined}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentView}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {renderView()}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

// ──────────────────────────────────────────────
// Home (Root)
// ──────────────────────────────────────────────

export default function Home() {
  const { user, setUser } = useAppStore();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await apiFetch('/api/auth/session');
        if (data.user) {
          setUser(data.user);
        }
      } catch {
        // Not authenticated
      } finally {
        setChecking(false);
      }
    })();
  }, [setUser]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="relative w-16 h-16 rounded-full overflow-hidden mx-auto mb-4 ring-4 ring-primary/20">
            <Image src="/logo.png" alt="TrishulHub" fill className="object-cover" priority />
          </div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthView />;
  }

  return <MainApp />;
}
