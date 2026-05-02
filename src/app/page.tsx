'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  LayoutDashboard, FileText, CalendarDays, Users, Settings,
  LogOut, Plus, Edit3, Trash2, ChevronLeft, ChevronRight,
  Moon, Sun, Eye, EyeOff, Copy, Share2, Check, AlertCircle,
  Clock, Building2, TrendingUp, PoundSterling, BarChart3,
  Shield, Upload, X, Menu, UserPlus, Star, Info, ChevronDown,
  Loader2, Mail, Lock, User, KeyRound, ExternalLink, CheckCircle2,
  Phone, FileCheck, Briefcase, Calendar
} from 'lucide-react';
import { useAppStore, SessionUser } from '@/lib/store';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter, DrawerClose } from '@/components/ui/drawer';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from '@/components/ui/input-otp';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

// ============================================================
// TYPES
// ============================================================
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
  notes: string | null;
  company: { id: string; name: string };
}

interface DashboardData {
  stats: {
    totalRecords: number;
    pendingCount: number;
    paidCount: number;
    totalExpected: number;
    totalReceived: number;
    totalHMRC: number;
    totalDue: number;
    workedHours: number;
  };
  companies: Company[];
  companyStats: {
    id: string;
    name: string;
    recordCount: number;
    totals: { totalExpected: number; totalReceived: number; totalHMRC: number; totalDue: number };
    latestStatus: string | null;
  }[];
  recentRecords: PaymentRecord[];
  comparison: {
    current: PaymentRecord | null;
    previous: PaymentRecord | null;
  };
  referralInfo: {
    referralCode: string;
    referralCount: number;
    isPremium: boolean;
  };
  shiftSummary: {
    totalHours: number;
    totalShifts: number;
    totalBreakMinutes: number;
    month: number;
    year: number;
  };
}

interface ReferralData {
  referralCode: string;
  referralCount: number;
  isPremium: boolean;
  referredBy: string | null;
}

interface AdminData {
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
  recentSignups: { createdAt: string; isPremium: boolean; referredBy: string | null }[];
  monthlySignups: { month: string; count: number }[];
}

interface ShiftHoursData {
  totalHours: number;
  totalShifts: number;
  shifts: { id: string; date: string; startTime: string; endTime: string; totalHours: number; shiftType: string }[];
}

// ============================================================
// CONSTANTS
// ============================================================
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const SHIFT_TYPES = [
  { value: 'REGULAR', label: 'Regular', color: 'bg-blue-500 dark:bg-blue-400' },
  { value: 'OVERTIME', label: 'Overtime', color: 'bg-amber-500 dark:bg-amber-400' },
  { value: 'HOLIDAY', label: 'Holiday', color: 'bg-green-500 dark:bg-green-400' },
  { value: 'SICK', label: 'Sick Leave', color: 'bg-red-500 dark:bg-red-400' },
];

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  PAID: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  OVERDUE: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_NAMES_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const TERMS_AND_CONDITIONS = `
TRISHULHUB PAY TRACKER – TERMS AND CONDITIONS

Effective Date: January 2025

1. INTRODUCTION
These Terms and Conditions ("T&C") govern your use of the TrishulHub Pay Tracker application ("App"), operated by TrishulHub ("we", "us", "our"). By creating an account or using the App, you agree to be bound by these T&C. If you do not agree, please do not use the App.

2. ELIGIBILITY
You must be at least 18 years old and a resident of the United Kingdom to use this App. By using the App, you represent and warrant that you meet these eligibility requirements.

3. ACCOUNT REGISTRATION
3.1 You must provide a valid email address and create a password to register.
3.2 You are responsible for maintaining the confidentiality of your login credentials.
3.3 You must not share your account with any third party.
3.4 We reserve the right to suspend or terminate accounts that violate these T&C.

4. SERVICE DESCRIPTION
4.1 The App allows you to track salary payments, work shifts, and related financial data for companies you work for.
4.2 The App is provided for informational and organisational purposes only and does not constitute financial, legal, or tax advice.
4.3 We do not guarantee the accuracy of any calculations or data entered by you.

5. DATA PROTECTION AND PRIVACY
5.1 We are committed to protecting your personal data in accordance with the UK General Data Protection Regulation (UK GDPR) and the Data Protection Act 2018.
5.2 Our Privacy Policy, which forms part of these T&C, explains how we collect, use, store, and protect your personal data.
5.3 You have the right to access, rectify, erase, and port your personal data, subject to applicable law.
5.4 We will only process your personal data for the purposes set out in our Privacy Policy and will not sell your data to third parties.
5.5 Data is stored securely with appropriate technical and organisational measures.

6. USER RESPONSIBILITIES
6.1 You are solely responsible for the accuracy and completeness of all data you enter into the App.
6.2 You must not use the App for any unlawful purpose or in any way that could damage, disable, or impair the App.
6.3 You must not attempt to gain unauthorised access to any part of the App or its related systems.
6.4 You must not upload any content that is malicious, offensive, or infringes on the rights of others.

7. REFERRAL PROGRAMME
7.1 The App includes a referral programme where you can share a unique referral code with others.
7.2 When someone signs up using your referral code, you may be upgraded to Premium status, enabling additional features.
7.3 We reserve the right to modify or discontinue the referral programme at any time.
7.4 Referral codes must not be used for spam or unsolicited communications.

8. PREMIUM FEATURES
8.1 Free users are limited to one company. Premium users may add multiple companies.
8.2 Premium status is currently granted through the referral programme and may be subject to change.
8.3 We reserve the right to introduce paid premium plans in the future with reasonable notice.

9. INTELLECTUAL PROPERTY
9.1 All content, design, graphics, and software used in the App are the intellectual property of TrishulHub or its licensors.
9.2 You may not reproduce, distribute, modify, or create derivative works from any part of the App without our prior written consent.
9.3 The TrishulHub name, logo, and branding are protected trademarks.

10. LIMITATION OF LIABILITY
10.1 The App is provided "as is" and "as available" without warranties of any kind, whether express or implied.
10.2 To the maximum extent permitted by law, we shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the App.
10.3 Our total liability for any claim arising from these T&C or your use of the App shall not exceed £100.
10.4 We are not liable for any loss of data, income, or profits resulting from your use of the App.

11. SERVICE AVAILABILITY
11.1 We do not guarantee that the App will be available at all times or free from errors.
11.2 We may suspend access to the App for maintenance, updates, or other reasons without prior notice.
11.3 We will use reasonable efforts to minimise downtime and notify users of planned maintenance where possible.

12. TERMINATION
12.1 You may delete your account at any time by contacting us.
12.2 We may suspend or terminate your account if you breach these T&C.
12.3 Upon termination, your right to use the App ceases immediately.
12.4 Provisions relating to liability, intellectual property, and data protection shall survive termination.

13. CHANGES TO TERMS
13.1 We may update these T&C from time to time.
13.2 We will notify you of material changes via email or in-app notification.
13.3 Continued use of the App after changes constitute acceptance of the updated T&C.

14. GOVERNING LAW
14.1 These T&C are governed by and construed in accordance with the laws of England and Wales.
14.2 Any disputes arising from these T&C shall be subject to the exclusive jurisdiction of the courts of England and Wales.

15. CONTACT
For any questions or concerns regarding these T&C, please contact us at support@trishulhub.com.
`;

// ============================================================
// HELPER FUNCTIONS
// ============================================================
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount);
}

function getMonthName(month: number): string {
  return MONTHS[month - 1] || '';
}

function getWeekDates(date: Date): Date[] {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diff);
  monday.setHours(0, 0, 0, 0);
  const dates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const dayDate = new Date(monday);
    dayDate.setDate(monday.getDate() + i);
    dates.push(dayDate);
  }
  return dates;
}

function formatDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function isSameDay(d1: Date, d2: Date): boolean {
  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
}

function isToday(d: Date): boolean {
  return isSameDay(d, new Date());
}

function calculateShiftHours(startTime: string, endTime: string, breakMinutes: number): number {
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  let startMinutes = startH * 60 + startM;
  let endMinutes = endH * 60 + endM;
  if (endMinutes <= startMinutes) endMinutes += 24 * 60;
  const workedMinutes = endMinutes - startMinutes - breakMinutes;
  return Math.max(0, Math.round((workedMinutes / 60) * 100) / 100);
}

// ============================================================
// API HELPER
// ============================================================
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

// ============================================================
// ANIMATION VARIANTS
// ============================================================
const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

// ============================================================
// MAIN APP COMPONENT
// ============================================================
export default function TrishulHubPayTracker() {
  const {
    authView, setAuthView, user, setUser, isLoading, setIsLoading,
    currentView, setCurrentView, sidebarOpen, setSidebarOpen,
    selectedRecordId, setSelectedRecordId,
    selectedCompanyId, setSelectedCompanyId,
    selectedShiftId, setSelectedShiftId,
    logout: storeLogout,
  } = useAppStore();

  const { theme, setTheme } = useTheme();
  const isMobile = useIsMobile();
  const [hydrated, setHydrated] = useState(false);

  // Referral param from URL - read on initial render
  const [referralParam] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    return params.get('ref');
  });

  // Initialize on mount: check URL params and session
  useEffect(() => {
    const ref = referralParam;
    // Check session
    apiFetch('/api/auth/session')
      .then((data) => {
        if (data.user) setUser(data.user);
      })
      .catch(() => setUser(null))
      .finally(() => {
        setHydrated(true);
        if (ref) setAuthView('signup');
      });
  }, []);

  const handleLogout = async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch { /* ignore */ }
    storeLogout();
    toast.success('Logged out successfully');
  };

  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-green-600 flex items-center justify-center animate-pulse">
            <PoundSterling className="w-6 h-6 text-white" />
          </div>
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, show auth views
  if (!user) {
    return (
      <AuthView
        authView={authView}
        setAuthView={setAuthView}
        setUser={setUser}
        referralParam={referralParam}
      />
    );
  }

  // Authenticated layout
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Desktop sidebar + main content */}
      <div className="flex flex-1">
        {!isMobile && <DesktopSidebar currentView={currentView} setCurrentView={setCurrentView} onLogout={handleLogout} user={user} theme={theme} setTheme={setTheme} />}

        {/* Main content area */}
        <main className="flex-1 min-h-screen pb-20 md:pb-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {currentView === 'dashboard' && <DashboardView user={user} setCurrentView={setCurrentView} />}
              {currentView === 'records' && <RecordsView />}
              {currentView === 'add-record' && <RecordFormView />}
              {currentView === 'edit-record' && <RecordFormView isEdit />}
              {currentView === 'companies' && <CompaniesView />}
              {currentView === 'add-company' && <CompanyFormView />}
              {currentView === 'shifts' && <ShiftsView />}
              {currentView === 'add-shift' && <ShiftFormView />}
              {currentView === 'edit-shift' && <ShiftFormView isEdit />}
              {currentView === 'referrals' && <ReferralsView user={user} />}
              {currentView === 'settings' && <SettingsView user={user} onLogout={handleLogout} theme={theme} setTheme={setTheme} />}
              {currentView === 'admin' && <AdminView />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Mobile bottom navigation */}
      {isMobile && (
        <MobileBottomNav currentView={currentView} setCurrentView={setCurrentView} user={user} />
      )}
    </div>
  );
}

// ============================================================
// AUTH VIEW
// ============================================================
function AuthView({
  authView, setAuthView, setUser, referralParam,
}: {
  authView: 'login' | 'signup';
  setAuthView: (v: 'login' | 'signup') => void;
  setUser: (u: SessionUser | null) => void;
  referralParam: string | null;
}) {
  const [forgotPassword, setForgotPassword] = useState(false);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-green-50 dark:from-background dark:via-background dark:to-background p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-green-600 mb-4">
            <PoundSterling className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
            TrishulHub Pay Tracker
          </h1>
          <p className="text-muted-foreground mt-1">Track your salary payments — Free forever</p>
        </motion.div>

        <AnimatePresence mode="wait">
          {forgotPassword ? (
            <motion.div key="forgot" variants={pageVariants} initial="initial" animate="animate" exit="exit">
              <ForgotPasswordView onBack={() => setForgotPassword(false)} />
            </motion.div>
          ) : authView === 'login' ? (
            <motion.div key="login" variants={pageVariants} initial="initial" animate="animate" exit="exit">
              <LoginForm
                onSwitchToSignup={() => setAuthView('signup')}
                setUser={setUser}
                onForgotPassword={() => setForgotPassword(true)}
              />
            </motion.div>
          ) : (
            <motion.div key="signup" variants={pageVariants} initial="initial" animate="animate" exit="exit">
              <SignupForm
                onSwitchToLogin={() => setAuthView('login')}
                setUser={setUser}
                referralParam={referralParam}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ============================================================
// LOGIN FORM
// ============================================================
function LoginForm({
  onSwitchToSignup, setUser, onForgotPassword,
}: {
  onSwitchToSignup: () => void;
  setUser: (u: SessionUser | null) => void;
  onForgotPassword: () => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
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

  return (
    <Card className="border-border shadow-lg">
      <CardHeader className="space-y-1 pb-4">
        <CardTitle className="text-xl text-center">Sign In</CardTitle>
        <CardDescription className="text-center">Enter your credentials to access your account</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="login-email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="login-email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 h-12"
                autoComplete="email"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="login-password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10 h-12"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onForgotPassword}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Forgot Password?
            </button>
          </div>
          <Button
            type="submit"
            className="w-full h-12 bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white"
            disabled={loading}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Lock className="h-4 w-4 mr-2" />}
            Sign In
          </Button>
        </form>
      </CardContent>
      <CardFooter className="justify-center pb-6">
        <p className="text-sm text-muted-foreground">
          Don&apos;t have an account?{' '}
          <button onClick={onSwitchToSignup} className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
            Sign Up
          </button>
        </p>
      </CardFooter>
    </Card>
  );
}

// ============================================================
// SIGNUP FORM (OTP-based, 3 steps)
// ============================================================
function SignupForm({
  onSwitchToLogin, setUser, referralParam,
}: {
  onSwitchToLogin: () => void;
  setUser: (u: SessionUser | null) => void;
  referralParam: string | null;
}) {
  // Step 1: Details
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [referralCode, setReferralCode] = useState(referralParam || '');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  // Step 2: OTP
  const [otpCode, setOtpCode] = useState('');
  const [devCode, setDevCode] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);

  // Step tracking
  const [step, setStep] = useState(1); // 1=Details, 2=Verify, 3=Done
  const [loading, setLoading] = useState(false);

  // Auto-fill referral from param
  useEffect(() => {
    if (referralParam) {
      setReferralCode(referralParam);
    }
  }, [referralParam]);

  // Send OTP
  const handleSendOtp = async () => {
    if (!name || !email || !password) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (!termsAccepted) {
      toast.error('Please accept the Terms and Conditions');
      return;
    }
    setLoading(true);
    try {
      const data = await apiFetch('/api/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({ email, type: 'SIGNUP' }),
      });
      if (data.devCode) {
        setDevCode(data.devCode);
      }
      setOtpSent(true);
      setStep(2);
      toast.success('Verification code sent to your email');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to send code');
    } finally {
      setLoading(false);
    }
  };

  // Verify OTP
  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.length < 6) {
      toast.error('Please enter the 6-digit code');
      return;
    }
    setLoading(true);
    try {
      await apiFetch('/api/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ email, code: otpCode, type: 'SIGNUP' }),
      });
      setOtpVerified(true);
      toast.success('Email verified successfully!');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Invalid code');
    } finally {
      setLoading(false);
    }
  };

  // Create Account
  const handleSignup = async () => {
    if (!otpVerified) {
      toast.error('Please verify your email first');
      return;
    }
    setLoading(true);
    try {
      const data = await apiFetch('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          name, email, password,
          referralCode: referralCode || undefined,
          termsAccepted,
          otpCode,
        }),
      });
      setUser(data.user);
      setStep(3);
      toast.success('Account created successfully!');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  const stepLabels = ['Details', 'Verify', 'Done'];
  const stepProgress = step === 1 ? 33 : step === 2 ? 66 : 100;

  return (
    <Card className="border-border shadow-lg">
      <CardHeader className="space-y-1 pb-4">
        <CardTitle className="text-xl text-center">Create Account</CardTitle>
        <CardDescription className="text-center">Sign up to start tracking your payments</CardDescription>
        {/* Step indicator */}
        <div className="pt-2">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            {stepLabels.map((label, i) => (
              <span key={label} className={i + 1 <= step ? 'text-blue-600 dark:text-blue-400 font-medium' : ''}>
                Step {i + 1}: {label}
              </span>
            ))}
          </div>
          <Progress value={stepProgress} className="h-2" />
        </div>
      </CardHeader>
      <CardContent>
        {/* DEV MODE banner */}
        {devCode && (
          <div className="mb-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              DEV MODE: Your verification code is <span className="font-mono text-lg">{devCode}</span>
            </p>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="signup-name">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="signup-name" placeholder="John Doe" value={name} onChange={(e) => setName(e.target.value)} className="pl-10 h-12" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="signup-email" type="email" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10 h-12" autoComplete="email" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="signup-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 h-12"
                  autoComplete="new-password"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-referral">Referral Code (Optional)</Label>
              <div className="relative">
                <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="signup-referral" placeholder="TRISHUL-XXXXXX" value={referralCode} onChange={(e) => setReferralCode(e.target.value.toUpperCase())} className="pl-10 h-12" />
              </div>
              {referralParam && (
                <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Referral code applied!
                </p>
              )}
            </div>
            <div className="flex items-start gap-2 pt-1">
              <Checkbox id="terms" checked={termsAccepted} onCheckedChange={(c) => setTermsAccepted(!!c)} className="mt-1" />
              <label htmlFor="terms" className="text-sm text-muted-foreground leading-snug cursor-pointer">
                I agree to the{' '}
                <button type="button" onClick={() => setShowTerms(true)} className="text-blue-600 dark:text-blue-400 hover:underline">
                  Terms and Conditions
                </button>
              </label>
            </div>
            <Button
              onClick={handleSendOtp}
              className="w-full h-12 bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white"
              disabled={loading || !termsAccepted}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
              Send Verification Code
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-3">
                <Mail className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
              <p className="text-sm text-muted-foreground">
                We sent a 6-digit code to <span className="font-medium text-foreground">{email}</span>
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-center block">Verification Code</Label>
              <div className="flex justify-center">
                <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} className="h-14 w-12 text-xl" />
                    <InputOTPSlot index={1} className="h-14 w-12 text-xl" />
                    <InputOTPSlot index={2} className="h-14 w-12 text-xl" />
                  </InputOTPGroup>
                  <InputOTPSeparator />
                  <InputOTPGroup>
                    <InputOTPSlot index={3} className="h-14 w-12 text-xl" />
                    <InputOTPSlot index={4} className="h-14 w-12 text-xl" />
                    <InputOTPSlot index={5} className="h-14 w-12 text-xl" />
                  </InputOTPGroup>
                </InputOTP>
              </div>
            </div>
            {!otpVerified ? (
              <Button
                onClick={handleVerifyOtp}
                className="w-full h-12 bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white"
                disabled={loading || otpCode.length < 6}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                Verify Code
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0" />
                  <p className="text-sm text-green-700 dark:text-green-300">Email verified! Click below to create your account.</p>
                </div>
                <Button
                  onClick={handleSignup}
                  className="w-full h-12 bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white"
                  disabled={loading}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                  Create Account
                </Button>
              </div>
            )}
            <button
              type="button"
              onClick={handleSendOtp}
              className="w-full text-sm text-muted-foreground hover:text-foreground text-center"
              disabled={loading}
            >
              Didn&apos;t get a code? Resend
            </button>
            <button
              type="button"
              onClick={() => { setStep(1); setOtpSent(false); setOtpVerified(false); setOtpCode(''); }}
              className="w-full text-sm text-muted-foreground hover:text-foreground text-center"
            >
              ← Back to details
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="text-center space-y-4 py-4">
            <div className="mx-auto w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-xl font-semibold text-foreground">Account Created!</h3>
            <p className="text-muted-foreground">Welcome to TrishulHub Pay Tracker. Start tracking your payments now.</p>
          </div>
        )}
      </CardContent>
      {step < 3 && (
        <CardFooter className="justify-center pb-6">
          <p className="text-sm text-muted-foreground">
            Already have an account?{' '}
            <button onClick={onSwitchToLogin} className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
              Sign In
            </button>
          </p>
        </CardFooter>
      )}

      {/* T&C Dialog */}
      <Dialog open={showTerms} onOpenChange={setShowTerms}>
        <DialogContent className="max-w-lg max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Terms and Conditions</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[60vh] pr-4">
            <div className="text-sm text-muted-foreground whitespace-pre-wrap">{TERMS_AND_CONDITIONS}</div>
          </ScrollArea>
          <DialogFooter>
            <Button onClick={() => setShowTerms(false)} className="bg-gradient-to-r from-blue-600 to-green-600 text-white">I Understand</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ============================================================
// FORGOT PASSWORD VIEW
// ============================================================
function ForgotPasswordView({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState(1); // 1=email, 2=otp, 3=new password
  const [loading, setLoading] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);

  const handleSendOtp = async () => {
    if (!email) { toast.error('Please enter your email'); return; }
    setLoading(true);
    try {
      const data = await apiFetch('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      if (data.devCode) setDevCode(data.devCode);
      setStep(2);
      toast.success('If this email is registered, you will receive a verification code');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to send code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.length < 6) { toast.error('Please enter the 6-digit code'); return; }
    setLoading(true);
    try {
      await apiFetch('/api/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ email, code: otpCode, type: 'PASSWORD_RESET' }),
      });
      setStep(3);
      toast.success('Code verified!');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Invalid code');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      await apiFetch('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email, code: otpCode, newPassword }),
      });
      toast.success('Password reset successfully! Please sign in.');
      onBack();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-border shadow-lg">
      <CardHeader className="space-y-1 pb-4">
        <CardTitle className="text-xl text-center">Reset Password</CardTitle>
        <CardDescription className="text-center">
          {step === 1 ? 'Enter your email to receive a code' : step === 2 ? 'Enter the verification code' : 'Set your new password'}
        </CardDescription>
        <div className="pt-2">
          <Progress value={step === 1 ? 33 : step === 2 ? 66 : 100} className="h-2" />
        </div>
      </CardHeader>
      <CardContent>
        {devCode && (
          <div className="mb-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              DEV MODE: Your verification code is <span className="font-mono text-lg">{devCode}</span>
            </p>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="forgot-email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="forgot-email" type="email" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10 h-12" />
              </div>
            </div>
            <Button onClick={handleSendOtp} className="w-full h-12 bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
              Send Code
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-3">Enter the 6-digit code sent to <span className="font-medium text-foreground">{email}</span></p>
            </div>
            <div className="flex justify-center">
              <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode}>
                <InputOTPGroup>
                  <InputOTPSlot index={0} className="h-14 w-12 text-xl" />
                  <InputOTPSlot index={1} className="h-14 w-12 text-xl" />
                  <InputOTPSlot index={2} className="h-14 w-12 text-xl" />
                </InputOTPGroup>
                <InputOTPSeparator />
                <InputOTPGroup>
                  <InputOTPSlot index={3} className="h-14 w-12 text-xl" />
                  <InputOTPSlot index={4} className="h-14 w-12 text-xl" />
                  <InputOTPSlot index={5} className="h-14 w-12 text-xl" />
                </InputOTPGroup>
              </InputOTP>
            </div>
            <Button onClick={handleVerifyOtp} className="w-full h-12 bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white" disabled={loading || otpCode.length < 6}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
              Verify Code
            </Button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pl-10 pr-10 h-12"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button onClick={handleResetPassword} className="w-full h-12 bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <KeyRound className="h-4 w-4 mr-2" />}
              Reset Password
            </Button>
          </div>
        )}
      </CardContent>
      <CardFooter className="justify-center pb-6">
        <button onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to Sign In
        </button>
      </CardFooter>
    </Card>
  );
}

// ============================================================
// DESKTOP SIDEBAR
// ============================================================
function DesktopSidebar({
  currentView, setCurrentView, onLogout, user, theme, setTheme,
}: {
  currentView: string;
  setCurrentView: (v: string) => void;
  onLogout: () => void;
  user: SessionUser;
  theme: string | undefined;
  setTheme: (t: string) => void;
}) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'records', label: 'Records', icon: FileText },
    { id: 'shifts', label: 'Shifts', icon: CalendarDays },
    { id: 'referrals', label: 'Referrals', icon: Users },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  if (user.role === 'ADMIN') {
    navItems.push({ id: 'admin', label: 'Admin', icon: Shield });
  }

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 border-r border-border bg-card">
      <div className="flex items-center gap-3 px-6 py-5 border-b border-border">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-600 to-green-600 flex items-center justify-center">
          <PoundSterling className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="font-bold text-sm text-foreground">TrishulHub</h2>
          <p className="text-xs text-muted-foreground">Pay Tracker</p>
        </div>
        {user.isPremium && (
          <Badge className="ml-auto bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] px-1.5">
            <Star className="h-3 w-3 mr-0.5" /> PRO
          </Badge>
        )}
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </button>
          );
        })}
      </nav>
      <div className="px-3 py-4 border-t border-border space-y-2">
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-sm text-muted-foreground">Theme</span>
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
        <div className="px-3 py-1">
          <p className="text-sm font-medium text-foreground truncate">{user.name}</p>
          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}

// ============================================================
// MOBILE BOTTOM NAV
// ============================================================
function MobileBottomNav({
  currentView, setCurrentView, user,
}: {
  currentView: string;
  setCurrentView: (v: string) => void;
  user: SessionUser;
}) {
  const navItems = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { id: 'records', label: 'Records', icon: FileText },
    { id: 'shifts', label: 'Shifts', icon: CalendarDays },
    { id: 'referrals', label: 'Referrals', icon: Users },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border safe-area-bottom md:hidden">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className={`flex flex-col items-center justify-center gap-0.5 min-w-[56px] py-1 transition-colors ${
                isActive ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

// ============================================================
// DASHBOARD VIEW
// ============================================================
function DashboardView({ user, setCurrentView }: { user: SessionUser; setCurrentView: (v: string) => void }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState<string>('all');

  useEffect(() => {
    fetchDashboard();
  }, [selectedCompany]);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const url = selectedCompany !== 'all' ? `/api/dashboard?companyId=${selectedCompany}` : '/api/dashboard';
      const d = await apiFetch(url);
      setData(d);
    } catch (err: unknown) {
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading || !data) {
    return <LoadingSkeleton />;
  }

  const { stats, companies, recentRecords, referralInfo, shiftSummary, comparison } = data;

  return (
    <div className="p-4 md:p-6 md:ml-64 space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Welcome back, {user.name.split(' ')[0]}!</h1>
          <p className="text-muted-foreground">Here&apos;s your payment overview</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedCompany} onValueChange={setSelectedCompany}>
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

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <StatCard
          title="Total Expected"
          value={formatCurrency(stats.totalExpected)}
          icon={PoundSterling}
          gradient="from-blue-600 to-blue-700 dark:from-blue-700 dark:to-blue-800"
        />
        <StatCard
          title="Total Received"
          value={formatCurrency(stats.totalReceived)}
          icon={TrendingUp}
          gradient="from-green-600 to-green-700 dark:from-green-700 dark:to-green-800"
        />
        <StatCard
          title="Total Due"
          value={formatCurrency(stats.totalDue)}
          icon={AlertCircle}
          gradient="from-amber-600 to-amber-700 dark:from-amber-700 dark:to-amber-800"
        />
        <StatCard
          title="HMRC Deductions"
          value={formatCurrency(stats.totalHMRC)}
          icon={BarChart3}
          gradient="from-purple-600 to-purple-700 dark:from-purple-700 dark:to-purple-800"
        />
      </div>

      {/* Payment & Shift Summary row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Payment Summary */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              Payment Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total Records</span>
              <span className="font-semibold text-foreground">{stats.totalRecords}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Pending</span>
              <Badge className={STATUS_COLORS.PENDING}>{stats.pendingCount}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Paid</span>
              <Badge className={STATUS_COLORS.PAID}>{stats.paidCount}</Badge>
            </div>
            <Separator />
            <Button variant="outline" size="sm" className="w-full" onClick={() => setCurrentView('add-record')}>
              <Plus className="h-4 w-4 mr-2" /> Add Payment Record
            </Button>
          </CardContent>
        </Card>

        {/* Shift Summary */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-green-600 dark:text-green-400" />
              Shift Summary ({getMonthName(shiftSummary.month)})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total Hours</span>
              <span className="font-semibold text-foreground">{shiftSummary.totalHours}h</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total Shifts</span>
              <span className="font-semibold text-foreground">{shiftSummary.totalShifts}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Break Minutes</span>
              <span className="font-semibold text-foreground">{shiftSummary.totalBreakMinutes}m</span>
            </div>
            <Separator />
            <Button variant="outline" size="sm" className="w-full" onClick={() => setCurrentView('shifts')}>
              <CalendarDays className="h-4 w-4 mr-2" /> View Shifts
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Companies */}
      {companies.length > 0 && (
        <Card className="border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                Companies
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setCurrentView('add-company')}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {data.companyStats.map((cs) => (
                <div key={cs.id} className="p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-foreground">{cs.name}</span>
                    {cs.latestStatus && <Badge className={STATUS_COLORS[cs.latestStatus] || ''}>{cs.latestStatus}</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div className="flex justify-between">
                      <span>Expected:</span>
                      <span className="text-foreground">{formatCurrency(cs.totals.totalExpected)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Received:</span>
                      <span className="text-green-600 dark:text-green-400">{formatCurrency(cs.totals.totalReceived)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Due:</span>
                      <span className={cs.totals.totalDue > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'}>
                        {formatCurrency(cs.totals.totalDue)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Records */}
      {recentRecords.length > 0 && (
        <Card className="border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <FileCheck className="h-4 w-4 text-muted-foreground" />
                Recent Records
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setCurrentView('records')}>
                View All <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentRecords.slice(0, 5).map((r) => (
              <div key={r.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                <div>
                  <p className="text-sm font-medium text-foreground">{r.company.name}</p>
                  <p className="text-xs text-muted-foreground">{getMonthName(r.month)} {r.year}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-foreground">{formatCurrency(r.totalExpected)}</p>
                  <Badge className={STATUS_COLORS[r.status] || ''}>{r.status}</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {companies.length === 0 && (
        <Card className="border-border">
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-1">Get Started</h3>
            <p className="text-muted-foreground mb-4">Add your first company to start tracking payments</p>
            <Button onClick={() => setCurrentView('add-company')} className="bg-gradient-to-r from-blue-600 to-green-600 text-white">
              <Plus className="h-4 w-4 mr-2" /> Add Company
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============================================================
// STAT CARD
// ============================================================
function StatCard({ title, value, icon: Icon, gradient }: { title: string; value: string; icon: React.ElementType; gradient: string }) {
  return (
    <div className={`rounded-xl bg-gradient-to-br ${gradient} p-4 text-white shadow-sm`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium opacity-90">{title}</span>
        <Icon className="h-4 w-4 opacity-80" />
      </div>
      <p className="text-lg md:text-xl font-bold">{value}</p>
    </div>
  );
}

// ============================================================
// RECORDS VIEW
// ============================================================
function RecordsView() {
  const { setCurrentView, setSelectedRecordId } = useAppStore();
  const [records, setRecords] = useState<PaymentRecord[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCompany, setFilterCompany] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => { fetchRecords(); fetchCompanies(); }, []);

  const fetchCompanies = async () => {
    try {
      const data = await apiFetch('/api/companies');
      setCompanies(data.companies);
    } catch { /* ignore */ }
  };

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterCompany !== 'all') params.set('companyId', filterCompany);
      if (filterStatus !== 'all') params.set('status', filterStatus);
      const data = await apiFetch(`/api/payment-records?${params.toString()}`);
      setRecords(data.records);
    } catch {
      toast.error('Failed to load records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRecords(); }, [filterCompany, filterStatus]);

  const handleEdit = (id: string) => {
    setSelectedRecordId(id);
    setCurrentView('edit-record');
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await apiFetch(`/api/payment-records/${deleteId}`, { method: 'DELETE' });
      toast.success('Record deleted');
      setRecords(records.filter((r) => r.id !== deleteId));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setDeleteId(null);
    }
  };

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="p-4 md:p-6 md:ml-64 space-y-4 max-w-6xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Payment Records</h1>
        <Button onClick={() => setCurrentView('add-record')} className="bg-gradient-to-r from-blue-600 to-green-600 text-white" size="sm">
          <Plus className="h-4 w-4 mr-1" /> Add
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <Select value={filterCompany} onValueChange={setFilterCompany}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="All Companies" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Companies</SelectItem>
            {companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[130px]"><SelectValue placeholder="All Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="PAID">Paid</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Records list */}
      {records.length === 0 ? (
        <Card className="border-border">
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-1">No Records</h3>
            <p className="text-muted-foreground mb-4">Add your first payment record</p>
            <Button onClick={() => setCurrentView('add-record')} className="bg-gradient-to-r from-blue-600 to-green-600 text-white">
              <Plus className="h-4 w-4 mr-2" /> Add Record
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {records.map((r) => (
            <Card key={r.id} className="border-border hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-foreground truncate">{r.company.name}</span>
                      <Badge className={STATUS_COLORS[r.status] || ''}>{r.status}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{getMonthName(r.month)} {r.year}</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Expected:</span>
                        <span className="text-foreground">{formatCurrency(r.totalExpected)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Received:</span>
                        <span className="text-green-600 dark:text-green-400">{formatCurrency(r.totalReceived)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">HMRC:</span>
                        <span className="text-foreground">{formatCurrency(r.totalHMRC)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Due:</span>
                        <span className={r.totalDue > 0 ? 'text-amber-600 dark:text-amber-400 font-medium' : 'text-foreground'}>
                          {formatCurrency(r.totalDue)}
                        </span>
                      </div>
                      {r.workedHours > 0 && (
                        <div className="flex justify-between col-span-2">
                          <span className="text-muted-foreground">Hours:</span>
                          <span className="text-foreground">{r.workedHours}h</span>
                        </div>
                      )}
                    </div>
                    {r.notes && <p className="text-xs text-muted-foreground mt-2 truncate">📝 {r.notes}</p>}
                    {r.paySlipUrl && (
                      <a href={r.paySlipUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-1 inline-flex items-center gap-1">
                        <ExternalLink className="h-3 w-3" /> {r.paySlipName || 'View Payslip'}
                      </a>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(r.id)} className="h-9 w-9">
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteId(r.id)} className="h-9 w-9 text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Record?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. This will permanently delete this payment record.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ============================================================
// RECORD FORM VIEW (Add / Edit)
// ============================================================
function RecordFormView({ isEdit = false }: { isEdit?: boolean }) {
  const { setCurrentView, selectedRecordId, setSelectedRecordId } = useAppStore();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyId, setCompanyId] = useState('');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [totalExpected, setTotalExpected] = useState('');
  const [totalReceived, setTotalReceived] = useState('');
  const [totalHMRC, setTotalHMRC] = useState('');
  const [workedHours, setWorkedHours] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('PENDING');
  const [paySlipFile, setPaySlipFile] = useState<File | null>(null);
  const [paySlipUrl, setPaySlipUrl] = useState<string | null>(null);
  const [paySlipName, setPaySlipName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [autoHoursInfo, setAutoHoursInfo] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchCompanies();
    if (isEdit && selectedRecordId) fetchRecord();
  }, []);

  const fetchCompanies = async () => {
    try {
      const data = await apiFetch('/api/companies');
      setCompanies(data.companies);
    } catch { /* ignore */ }
  };

  const fetchRecord = async () => {
    try {
      const data = await apiFetch('/api/payment-records');
      const record = data.records.find((r: PaymentRecord) => r.id === selectedRecordId);
      if (record) {
        setCompanyId(record.companyId);
        setMonth(record.month);
        setYear(record.year);
        setTotalExpected(record.totalExpected.toString());
        setTotalReceived(record.totalReceived.toString());
        setTotalHMRC(record.totalHMRC.toString());
        setWorkedHours(record.workedHours.toString());
        setNotes(record.notes || '');
        setStatus(record.status);
        setPaySlipUrl(record.paySlipUrl);
        setPaySlipName(record.paySlipName);
      }
    } catch { /* ignore */ }
  };

  // Auto-populate worked hours from shifts
  const fetchAutoHours = useCallback(async () => {
    if (!companyId || !month || !year) return;
    try {
      const data = await apiFetch(`/api/shifts/hours?companyId=${companyId}&month=${month}&year=${year}`);
      if (data.totalHours > 0) {
        setWorkedHours(data.totalHours.toString());
        setAutoHoursInfo(`Based on your shift records, you worked ${data.totalHours}h across ${data.totalShifts} shift${data.totalShifts !== 1 ? 's' : ''} this month. You can change this if needed.`);
      } else {
        setAutoHoursInfo(null);
      }
    } catch { /* ignore */ }
  }, [companyId, month, year]);

  useEffect(() => {
    if (!isEdit && companyId && month && year) {
      fetchAutoHours();
    }
  }, [companyId, month, year, isEdit, fetchAutoHours]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) { toast.error('Please select a company'); return; }
    setLoading(true);
    try {
      const body = {
        companyId,
        month,
        year,
        totalExpected: parseFloat(totalExpected) || 0,
        totalReceived: parseFloat(totalReceived) || 0,
        totalHMRC: parseFloat(totalHMRC) || 0,
        workedHours: parseFloat(workedHours) || 0,
        notes: notes || null,
        status,
      };

      if (isEdit && selectedRecordId) {
        await apiFetch(`/api/payment-records/${selectedRecordId}`, {
          method: 'PUT',
          body: JSON.stringify(body),
        });
        // Upload payslip if selected
        if (paySlipFile) {
          await uploadPayslip(selectedRecordId);
        }
        toast.success('Record updated');
      } else {
        const data = await apiFetch('/api/payment-records', {
          method: 'POST',
          body: JSON.stringify(body),
        });
        // Upload payslip if selected
        if (paySlipFile && data.record?.id) {
          await uploadPayslip(data.record.id);
        }
        toast.success('Record created');
      }
      setCurrentView('records');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save record');
    } finally {
      setLoading(false);
    }
  };

  const uploadPayslip = async (recordId: string) => {
    if (!paySlipFile) return;
    const formData = new FormData();
    formData.append('file', paySlipFile);
    formData.append('recordId', recordId);
    await fetch('/api/upload-payslip', { method: 'POST', body: formData });
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  return (
    <div className="p-4 md:p-6 md:ml-64 space-y-4 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setCurrentView('records')}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold text-foreground">{isEdit ? 'Edit Record' : 'Add Record'}</h1>
      </div>

      <Card className="border-border">
        <CardContent className="p-4 md:p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Company</Label>
              <Select value={companyId} onValueChange={setCompanyId}>
                <SelectTrigger className="h-12"><SelectValue placeholder="Select company" /></SelectTrigger>
                <SelectContent>
                  {companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {companies.length === 0 && (
                <p className="text-xs text-muted-foreground">No companies yet. <button type="button" onClick={() => setCurrentView('add-company')} className="text-blue-600 dark:text-blue-400 underline">Add one first</button></p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Month</Label>
                <Select value={month.toString()} onValueChange={(v) => setMonth(parseInt(v))}>
                  <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m, i) => <SelectItem key={i} value={(i + 1).toString()}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Year</Label>
                <Select value={year.toString()} onValueChange={(v) => setYear(parseInt(v))}>
                  <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {years.map((y) => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {autoHoursInfo && (
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 flex items-start gap-2">
                <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                <p className="text-sm text-blue-700 dark:text-blue-300">{autoHoursInfo}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Total Expected (£)</Label>
                <div className="relative">
                  <PoundSterling className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input type="number" step="0.01" placeholder="0.00" value={totalExpected} onChange={(e) => setTotalExpected(e.target.value)} className="pl-10 h-12" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Total Received (£)</Label>
                <div className="relative">
                  <PoundSterling className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input type="number" step="0.01" placeholder="0.00" value={totalReceived} onChange={(e) => setTotalReceived(e.target.value)} className="pl-10 h-12" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>HMRC Deductions (£)</Label>
                <div className="relative">
                  <PoundSterling className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input type="number" step="0.01" placeholder="0.00" value={totalHMRC} onChange={(e) => setTotalHMRC(e.target.value)} className="pl-10 h-12" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Worked Hours</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input type="number" step="0.5" placeholder="0" value={workedHours} onChange={(e) => setWorkedHours(e.target.value)} className="pl-10 h-12" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="PAID">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea placeholder="Optional notes..." value={notes} onChange={(e) => setNotes(e.target.value)} className="min-h-[80px]" />
            </div>

            {/* Payslip */}
            <div className="space-y-2">
              <Label>Payslip</Label>
              {paySlipUrl && (
                <div className="flex items-center gap-2 p-2 rounded-lg border border-border bg-muted/50">
                  <FileCheck className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <a href={paySlipUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 dark:text-blue-400 hover:underline truncate">
                    {paySlipName || 'View Payslip'}
                  </a>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={(e) => setPaySlipFile(e.target.files?.[0] || null)}
                  className="h-12"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setCurrentView('records')} className="flex-1 h-12">Cancel</Button>
              <Button type="submit" disabled={loading} className="flex-1 h-12 bg-gradient-to-r from-blue-600 to-green-600 text-white">
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                {isEdit ? 'Update' : 'Create'} Record
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// COMPANIES VIEW
// ============================================================
function CompaniesView() {
  const { setCurrentView, setSelectedCompanyId } = useAppStore();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  useEffect(() => { fetchCompanies(); }, []);

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/api/companies');
      setCompanies(data.companies);
    } catch {
      toast.error('Failed to load companies');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (c: Company) => {
    setEditId(c.id);
    setEditName(c.name);
  };

  const handleUpdate = async () => {
    if (!editId || !editName.trim()) return;
    try {
      await apiFetch(`/api/companies/${editId}`, {
        method: 'PUT',
        body: JSON.stringify({ name: editName }),
      });
      toast.success('Company updated');
      setEditId(null);
      fetchCompanies();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await apiFetch(`/api/companies/${deleteId}`, { method: 'DELETE' });
      toast.success('Company deleted');
      setCompanies(companies.filter((c) => c.id !== deleteId));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setDeleteId(null);
    }
  };

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="p-4 md:p-6 md:ml-64 space-y-4 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Companies</h1>
        <Button onClick={() => setCurrentView('add-company')} className="bg-gradient-to-r from-blue-600 to-green-600 text-white" size="sm">
          <Plus className="h-4 w-4 mr-1" /> Add
        </Button>
      </div>

      {companies.length === 0 ? (
        <Card className="border-border">
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-1">No Companies</h3>
            <p className="text-muted-foreground mb-4">Add a company to start tracking payments</p>
            <Button onClick={() => setCurrentView('add-company')} className="bg-gradient-to-r from-blue-600 to-green-600 text-white">
              <Plus className="h-4 w-4 mr-2" /> Add Company
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {companies.map((c) => (
            <Card key={c.id} className="border-border hover:shadow-sm transition-shadow">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-green-600 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c._count?.paymentRecords || 0} records</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(c)} className="h-9 w-9">
                    <Edit3 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setDeleteId(c.id)} className="h-9 w-9 text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit dialog */}
      <Dialog open={!!editId} onOpenChange={() => setEditId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Company</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Company Name</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-12" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditId(null)}>Cancel</Button>
            <Button onClick={handleUpdate} className="bg-gradient-to-r from-blue-600 to-green-600 text-white">Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Company?</AlertDialogTitle>
            <AlertDialogDescription>This will also delete all associated payment records and shifts. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ============================================================
// COMPANY FORM VIEW
// ============================================================
function CompanyFormView() {
  const { setCurrentView } = useAppStore();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error('Please enter a company name'); return; }
    setLoading(true);
    try {
      await apiFetch('/api/companies', {
        method: 'POST',
        body: JSON.stringify({ name }),
      });
      toast.success('Company added!');
      setCurrentView('companies');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to add company');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-6 md:ml-64 space-y-4 max-w-md">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setCurrentView('companies')}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold text-foreground">Add Company</h1>
      </div>
      <Card className="border-border">
        <CardContent className="p-4 md:p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Company Name</Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="e.g. ABC Solutions Ltd" value={name} onChange={(e) => setName(e.target.value)} className="pl-10 h-12" autoFocus />
              </div>
            </div>
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => setCurrentView('companies')} className="flex-1 h-12">Cancel</Button>
              <Button type="submit" disabled={loading} className="flex-1 h-12 bg-gradient-to-r from-blue-600 to-green-600 text-white">
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                Add Company
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// SHIFTS VIEW (WEEKLY CALENDAR)
// ============================================================
function ShiftsView() {
  const { setCurrentView, setSelectedShiftId } = useAppStore();
  const isMobile = useIsMobile();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekStart, setWeekStart] = useState<Date>(() => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now);
    monday.setDate(diff);
    monday.setHours(0, 0, 0, 0);
    return monday;
  });
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [editShift, setEditShift] = useState<Shift | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => { fetchShifts(); fetchCompanies(); }, [weekStart]);

  const fetchCompanies = async () => {
    try {
      const data = await apiFetch('/api/companies');
      setCompanies(data.companies);
    } catch { /* ignore */ }
  };

  const fetchShifts = async () => {
    setLoading(true);
    try {
      const weekDates = getWeekDates(weekStart);
      const startDate = formatDateStr(weekDates[0]);
      const endDate = formatDateStr(weekDates[6]);
      // Fetch all shifts for broader range then filter client-side
      const data = await apiFetch('/api/shifts');
      setShifts(data.shifts || []);
    } catch {
      toast.error('Failed to load shifts');
    } finally {
      setLoading(false);
    }
  };

  const weekDates = getWeekDates(weekStart);

  const getShiftsForDay = (date: Date) => {
    const dateStr = formatDateStr(date);
    return shifts.filter((s) => s.date === dateStr);
  };

  const prevWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    setWeekStart(d);
  };

  const nextWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    setWeekStart(d);
  };

  const goThisWeek = () => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now);
    monday.setDate(diff);
    monday.setHours(0, 0, 0, 0);
    setWeekStart(monday);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await apiFetch(`/api/shifts/${deleteId}`, { method: 'DELETE' });
      toast.success('Shift deleted');
      setShifts(shifts.filter((s) => s.id !== deleteId));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setDeleteId(null);
    }
  };

  // Weekly summary
  const weekShifts = weekDates.flatMap((d) => getShiftsForDay(d));
  const totalWeekHours = weekShifts.reduce((acc, s) => acc + s.totalHours, 0);
  const totalWeekShifts = weekShifts.length;
  const avgHoursPerDay = totalWeekShifts > 0 ? (totalWeekHours / 7).toFixed(1) : '0';

  const isCurrentWeek = (() => {
    const currentWeekDates = getWeekDates(new Date());
    return formatDateStr(weekDates[0]) === formatDateStr(currentWeekDates[0]);
  })();

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="p-4 md:p-6 md:ml-64 space-y-4 max-w-6xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Shifts</h1>
        <Button
          onClick={() => {
            setSelectedShiftId(null);
            setCurrentView('add-shift');
          }}
          className="bg-gradient-to-r from-blue-600 to-green-600 text-white"
          size="sm"
        >
          <Plus className="h-4 w-4 mr-1" /> Add Shift
        </Button>
      </div>

      {/* Week Summary Card */}
      <Card className="border-border">
        <CardContent className="p-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-foreground">{totalWeekHours.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">Total Hours</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{totalWeekShifts}</p>
              <p className="text-xs text-muted-foreground">Total Shifts</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{avgHoursPerDay}</p>
              <p className="text-xs text-muted-foreground">Avg Hours/Day</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Week Navigation */}
      <div className="flex items-center justify-between gap-2">
        <Button variant="outline" size="icon" onClick={prevWeek} className="h-10 w-10">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex flex-col items-center">
          <span className="text-sm font-medium text-foreground">
            {weekDates[0].toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – {weekDates[6].toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
          {!isCurrentWeek && (
            <button onClick={goThisWeek} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
              Go to this week
            </button>
          )}
        </div>
        <Button variant="outline" size="icon" onClick={nextWeek} className="h-10 w-10">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Weekly Calendar Grid */}
      <div className="space-y-2">
        {weekDates.map((date, idx) => {
          const dayShifts = getShiftsForDay(date);
          const isCurrentDay = isToday(date);
          const isWeekend = idx >= 5;

          return (
            <motion.div
              key={formatDateStr(date)}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
            >
              <Card className={`border-border ${isCurrentDay ? 'ring-2 ring-blue-500/30 dark:ring-blue-400/30' : ''} ${isWeekend ? 'bg-muted/30' : ''}`}>
                <CardContent className="p-3 md:p-4">
                  {/* Day header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium px-2 py-1 rounded-md ${isCurrentDay ? 'bg-blue-600 text-white' : 'bg-muted text-muted-foreground'}`}>
                        {DAY_NAMES[idx]}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </span>
                      {isCurrentDay && <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 text-[10px]">Today</Badge>}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
                        setSelectedShiftId(null);
                        setSelectedDay(date);
                      }}
                    >
                      <Plus className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>

                  {/* Shifts for this day */}
                  {dayShifts.length === 0 ? (
                    <p className="text-xs text-muted-foreground pl-1">No shift</p>
                  ) : (
                    <div className="space-y-2">
                      {dayShifts.map((shift) => {
                        const shiftType = SHIFT_TYPES.find((t) => t.value === shift.shiftType) || SHIFT_TYPES[0];
                        return (
                          <div
                            key={shift.id}
                            className="flex items-center gap-3 p-2 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer"
                            onClick={() => setEditShift(shift)}
                          >
                            <div className={`w-1.5 h-10 rounded-full ${shiftType.color}`} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-foreground truncate">{shift.company.name}</span>
                                <Badge variant="outline" className="text-[10px]">{shiftType.label}</Badge>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                <span>{shift.startTime} – {shift.endTime}</span>
                                <span>•</span>
                                <span>{shift.totalHours}h</span>
                                {shift.breakMinutes > 0 && <span>• {shift.breakMinutes}m break</span>}
                              </div>
                              {shift.notes && <p className="text-xs text-muted-foreground mt-0.5 truncate">📝 {shift.notes}</p>}
                            </div>
                            <div className="flex gap-1 shrink-0">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={(e) => { e.stopPropagation(); setDeleteId(shift.id); }}
                              >
                                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Add shift from day + button */}
      <ShiftDaySheet
        date={selectedDay}
        open={!!selectedDay}
        onClose={() => setSelectedDay(null)}
        companies={companies}
        onSaved={() => { fetchShifts(); setSelectedDay(null); }}
      />

      {/* Edit shift sheet */}
      <ShiftEditSheet
        shift={editShift}
        companies={companies}
        onClose={() => setEditShift(null)}
        onSaved={() => { fetchShifts(); setEditShift(null); }}
        onDelete={(id) => { setDeleteId(id); setEditShift(null); }}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Shift?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ============================================================
// SHIFT DAY SHEET (add shift for specific day)
// ============================================================
function ShiftDaySheet({
  date, open, onClose, companies, onSaved,
}: {
  date: Date | null;
  open: boolean;
  onClose: () => void;
  companies: Company[];
  onSaved: () => void;
}) {
  const [companyId, setCompanyId] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [breakMinutes, setBreakMinutes] = useState('30');
  const [shiftType, setShiftType] = useState('REGULAR');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  // Auto-calculate hours
  const totalHours = calculateShiftHours(startTime, endTime, parseInt(breakMinutes) || 0);

  const handleSubmit = async () => {
    if (!date || !companyId) { toast.error('Please select a company'); return; }
    setLoading(true);
    try {
      await apiFetch('/api/shifts', {
        method: 'POST',
        body: JSON.stringify({
          companyId,
          date: formatDateStr(date),
          startTime,
          endTime,
          breakMinutes: parseInt(breakMinutes) || 0,
          shiftType,
          notes: notes || null,
        }),
      });
      toast.success('Shift added!');
      onSaved();
      resetForm();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to add shift');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setCompanyId('');
    setStartTime('09:00');
    setEndTime('17:00');
    setBreakMinutes('30');
    setShiftType('REGULAR');
    setNotes('');
  };

  if (!date) return null;

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) { onClose(); resetForm(); } }}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Add Shift – {date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</SheetTitle>
          <SheetDescription>Add a new shift for this day</SheetDescription>
        </SheetHeader>
        <div className="space-y-4 p-4">
          <div className="space-y-2">
            <Label>Company</Label>
            <Select value={companyId} onValueChange={setCompanyId}>
              <SelectTrigger className="h-12"><SelectValue placeholder="Select company" /></SelectTrigger>
              <SelectContent>
                {companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Start Time</Label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="h-12" />
            </div>
            <div className="space-y-2">
              <Label>End Time</Label>
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="h-12" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Break (minutes)</Label>
              <Input type="number" value={breakMinutes} onChange={(e) => setBreakMinutes(e.target.value)} className="h-12" />
            </div>
            <div className="space-y-2">
              <Label>Total Hours</Label>
              <div className="h-12 flex items-center px-3 rounded-md border border-border bg-muted/50">
                <span className="text-foreground font-medium">{totalHours}h</span>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Shift Type</Label>
            <Select value={shiftType} onValueChange={setShiftType}>
              <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
              <SelectContent>
                {SHIFT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea placeholder="Optional notes..." value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <Button
            onClick={handleSubmit}
            disabled={loading || !companyId}
            className="w-full h-12 bg-gradient-to-r from-blue-600 to-green-600 text-white"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
            Add Shift
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ============================================================
// SHIFT EDIT SHEET
// ============================================================
function ShiftEditSheet({
  shift, companies, onClose, onSaved, onDelete,
}: {
  shift: Shift | null;
  companies: Company[];
  onClose: () => void;
  onSaved: () => void;
  onDelete: (id: string) => void;
}) {
  const [companyId, setCompanyId] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [breakMinutes, setBreakMinutes] = useState('30');
  const [shiftType, setShiftType] = useState('REGULAR');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (shift) {
      setCompanyId(shift.companyId);
      setStartTime(shift.startTime);
      setEndTime(shift.endTime);
      setBreakMinutes(shift.breakMinutes.toString());
      setShiftType(shift.shiftType);
      setNotes(shift.notes || '');
    }
  }, [shift]);

  const totalHours = calculateShiftHours(startTime, endTime, parseInt(breakMinutes) || 0);

  const handleSubmit = async () => {
    if (!shift) return;
    setLoading(true);
    try {
      await apiFetch(`/api/shifts/${shift.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          companyId,
          startTime,
          endTime,
          breakMinutes: parseInt(breakMinutes) || 0,
          shiftType,
          notes: notes || null,
        }),
      });
      toast.success('Shift updated!');
      onSaved();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update shift');
    } finally {
      setLoading(false);
    }
  };

  if (!shift) return null;

  return (
    <Sheet open={!!shift} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Edit Shift – {new Date(shift.date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</SheetTitle>
          <SheetDescription>Update shift details</SheetDescription>
        </SheetHeader>
        <div className="space-y-4 p-4">
          <div className="space-y-2">
            <Label>Company</Label>
            <Select value={companyId} onValueChange={setCompanyId}>
              <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
              <SelectContent>
                {companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Start Time</Label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="h-12" />
            </div>
            <div className="space-y-2">
              <Label>End Time</Label>
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="h-12" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Break (minutes)</Label>
              <Input type="number" value={breakMinutes} onChange={(e) => setBreakMinutes(e.target.value)} className="h-12" />
            </div>
            <div className="space-y-2">
              <Label>Total Hours</Label>
              <div className="h-12 flex items-center px-3 rounded-md border border-border bg-muted/50">
                <span className="text-foreground font-medium">{totalHours}h</span>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Shift Type</Label>
            <Select value={shiftType} onValueChange={setShiftType}>
              <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
              <SelectContent>
                {SHIFT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea placeholder="Optional notes..." value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div className="flex gap-3">
            <Button
              variant="destructive"
              onClick={() => onDelete(shift.id)}
              className="h-12"
            >
              <Trash2 className="h-4 w-4 mr-2" /> Delete
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 h-12 bg-gradient-to-r from-blue-600 to-green-600 text-white"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
              Update Shift
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ============================================================
// SHIFT FORM VIEW (standalone add)
// ============================================================
function ShiftFormView({ isEdit = false }: { isEdit?: boolean }) {
  const { setCurrentView, selectedShiftId } = useAppStore();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyId, setCompanyId] = useState('');
  const [date, setDate] = useState(formatDateStr(new Date()));
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [breakMinutes, setBreakMinutes] = useState('30');
  const [shiftType, setShiftType] = useState('REGULAR');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCompanies();
    if (isEdit && selectedShiftId) fetchShift();
  }, []);

  const fetchCompanies = async () => {
    try {
      const data = await apiFetch('/api/companies');
      setCompanies(data.companies);
    } catch { /* ignore */ }
  };

  const fetchShift = async () => {
    try {
      const data = await apiFetch('/api/shifts');
      const shift = data.shifts.find((s: Shift) => s.id === selectedShiftId);
      if (shift) {
        setCompanyId(shift.companyId);
        setDate(shift.date);
        setStartTime(shift.startTime);
        setEndTime(shift.endTime);
        setBreakMinutes(shift.breakMinutes.toString());
        setShiftType(shift.shiftType);
        setNotes(shift.notes || '');
      }
    } catch { /* ignore */ }
  };

  const totalHours = calculateShiftHours(startTime, endTime, parseInt(breakMinutes) || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !date || !startTime || !endTime) { toast.error('Please fill in required fields'); return; }
    setLoading(true);
    try {
      const body = { companyId, date, startTime, endTime, breakMinutes: parseInt(breakMinutes) || 0, shiftType, notes: notes || null };
      if (isEdit && selectedShiftId) {
        await apiFetch(`/api/shifts/${selectedShiftId}`, { method: 'PUT', body: JSON.stringify(body) });
        toast.success('Shift updated');
      } else {
        await apiFetch('/api/shifts', { method: 'POST', body: JSON.stringify(body) });
        toast.success('Shift added');
      }
      setCurrentView('shifts');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save shift');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-6 md:ml-64 space-y-4 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setCurrentView('shifts')}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold text-foreground">{isEdit ? 'Edit Shift' : 'Add Shift'}</h1>
      </div>

      <Card className="border-border">
        <CardContent className="p-4 md:p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Company</Label>
              <Select value={companyId} onValueChange={setCompanyId}>
                <SelectTrigger className="h-12"><SelectValue placeholder="Select company" /></SelectTrigger>
                <SelectContent>
                  {companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-12" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="h-12" />
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="h-12" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Break (minutes)</Label>
                <Input type="number" value={breakMinutes} onChange={(e) => setBreakMinutes(e.target.value)} className="h-12" />
              </div>
              <div className="space-y-2">
                <Label>Total Hours</Label>
                <div className="h-12 flex items-center px-3 rounded-md border border-border bg-muted/50">
                  <span className="text-foreground font-medium">{totalHours}h</span>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Shift Type</Label>
              <Select value={shiftType} onValueChange={setShiftType}>
                <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SHIFT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea placeholder="Optional notes..." value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setCurrentView('shifts')} className="flex-1 h-12">Cancel</Button>
              <Button type="submit" disabled={loading} className="flex-1 h-12 bg-gradient-to-r from-blue-600 to-green-600 text-white">
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                {isEdit ? 'Update' : 'Add'} Shift
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// REFERRALS VIEW
// ============================================================
function ReferralsView({ user }: { user: SessionUser }) {
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => { fetchReferrals(); }, []);

  const fetchReferrals = async () => {
    setLoading(true);
    try {
      const d = await apiFetch('/api/referrals');
      setData(d);
    } catch {
      toast.error('Failed to load referrals');
    } finally {
      setLoading(false);
    }
  };

  const referralLink = typeof window !== 'undefined' ? `${window.location.origin}/?ref=${user.referralCode}` : '';

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopiedLink(true);
      toast.success('Link copied!');
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(user.referralCode);
      setCopiedCode(true);
      toast.success('Code copied!');
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const shareLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'TrishulHub Pay Tracker',
          text: `Track your salary payments with TrishulHub! Use my referral code: ${user.referralCode}`,
          url: referralLink,
        });
      } catch { /* user cancelled */ }
    } else {
      copyLink();
    }
  };

  if (loading || !data) return <LoadingSkeleton />;

  return (
    <div className="p-4 md:p-6 md:ml-64 space-y-6 max-w-2xl">
      <h1 className="text-xl font-bold text-foreground">Referrals</h1>

      {/* Premium status */}
      <Card className={`border-border ${data.isPremium ? 'ring-2 ring-amber-500/30' : ''}`}>
        <CardContent className="p-4 md:p-6 text-center">
          {data.isPremium ? (
            <>
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center mx-auto mb-3">
                <Star className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Premium Member</h3>
              <p className="text-sm text-muted-foreground mt-1">You have access to multiple companies and premium features</p>
            </>
          ) : (
            <>
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Refer & Unlock Premium</h3>
              <p className="text-sm text-muted-foreground mt-1">Refer a friend to unlock Premium and add multiple companies</p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Referral Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="border-border">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{data.referralCount}</p>
            <p className="text-xs text-muted-foreground">Successful Referrals</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{data.isPremium ? '✓' : '—'}</p>
            <p className="text-xs text-muted-foreground">Premium Status</p>
          </CardContent>
        </Card>
      </div>

      {/* Referral Code */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Your Referral Code</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 p-3 rounded-lg border border-border bg-muted/50">
            <span className="font-mono text-lg font-bold text-foreground flex-1 text-center">{user.referralCode}</span>
            <Button variant="outline" size="sm" onClick={copyCode}>
              {copiedCode ? <Check className="h-4 w-4 text-green-600 dark:text-green-400" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Share Link */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Share Your Link</CardTitle>
          <CardDescription>Share this link with friends — they get a signup, you get Premium!</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 p-3 rounded-lg border border-border bg-muted/50">
            <span className="text-sm text-foreground truncate flex-1">{referralLink}</span>
            <Button variant="outline" size="sm" onClick={copyLink}>
              {copiedLink ? <Check className="h-4 w-4 text-green-600 dark:text-green-400" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <Button onClick={shareLink} className="w-full h-12 bg-gradient-to-r from-blue-600 to-green-600 text-white">
            <Share2 className="h-4 w-4 mr-2" /> Share Link
          </Button>
        </CardContent>
      </Card>

      {/* How it works */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">How It Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-blue-600 dark:text-blue-400">1</span>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Share your link or code</p>
              <p className="text-xs text-muted-foreground">Send it to friends who want to track their pay</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-green-600 dark:text-green-400">2</span>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">They sign up with your code</p>
              <p className="text-xs text-muted-foreground">They enter your code during registration</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-amber-600 dark:text-amber-400">3</span>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">You get Premium!</p>
              <p className="text-xs text-muted-foreground">Add unlimited companies and unlock premium features</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// SETTINGS VIEW
// ============================================================
function SettingsView({ user, onLogout, theme, setTheme }: { user: SessionUser; onLogout: () => void; theme: string | undefined; setTheme: (t: string) => void }) {
  const { setCurrentView } = useAppStore();

  return (
    <div className="p-4 md:p-6 md:ml-64 space-y-6 max-w-2xl">
      <h1 className="text-xl font-bold text-foreground">Settings</h1>

      {/* Profile */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-600 to-green-600 flex items-center justify-center">
              <span className="text-xl font-bold text-white">{user.name.charAt(0).toUpperCase()}</span>
            </div>
            <div>
              <p className="font-medium text-foreground">{user.name}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <div className="flex items-center gap-2 mt-1">
                {user.isPremium && <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px]"><Star className="h-3 w-3 mr-0.5" /> PRO</Badge>}
                <Badge variant="outline">{user.role}</Badge>
              </div>
            </div>
          </div>
          <div className="pt-2 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Referral Code</span>
              <span className="font-mono text-foreground">{user.referralCode}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sun className="h-4 w-4 text-muted-foreground" />
            Appearance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Dark Mode</p>
              <p className="text-xs text-muted-foreground">Toggle between light and dark theme</p>
            </div>
            <Switch
              checked={theme === 'dark'}
              onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
            />
          </div>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Quick Links</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button variant="ghost" className="w-full justify-start h-12" onClick={() => setCurrentView('companies')}>
            <Building2 className="h-4 w-4 mr-3 text-muted-foreground" /> Manage Companies
          </Button>
          <Button variant="ghost" className="w-full justify-start h-12" onClick={() => setCurrentView('referrals')}>
            <Users className="h-4 w-4 mr-3 text-muted-foreground" /> Referral Programme
          </Button>
        </CardContent>
      </Card>

      {/* Sign Out */}
      <Card className="border-border">
        <CardContent className="p-4">
          <Button variant="destructive" className="w-full h-12" onClick={onLogout}>
            <LogOut className="h-4 w-4 mr-2" /> Sign Out
          </Button>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="text-center text-xs text-muted-foreground pb-4">
        <p>TrishulHub Pay Tracker v1.0</p>
        <p>Made with ❤️ in the UK</p>
      </div>
    </div>
  );
}

// ============================================================
// ADMIN VIEW
// ============================================================
function AdminView() {
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchAdmin(); }, []);

  const fetchAdmin = async () => {
    setLoading(true);
    try {
      const d = await apiFetch('/api/admin');
      setData(d);
    } catch {
      toast.error('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  if (loading || !data) return <LoadingSkeleton />;

  const { stats, recentSignups, monthlySignups } = data;

  return (
    <div className="p-4 md:p-6 md:ml-64 space-y-6 max-w-4xl">
      <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
        <Shield className="h-5 w-5" /> Admin Dashboard
      </h1>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard title="Total Users" value={stats.totalUsers.toString()} icon={Users} gradient="from-blue-600 to-blue-700 dark:from-blue-700 dark:to-blue-800" />
        <StatCard title="Premium Users" value={stats.premiumUsers.toString()} icon={Star} gradient="from-amber-600 to-amber-700 dark:from-amber-700 dark:to-amber-800" />
        <StatCard title="Total Companies" value={stats.totalCompanies.toString()} icon={Building2} gradient="from-green-600 to-green-700 dark:from-green-700 dark:to-green-800" />
        <StatCard title="Total Shifts" value={stats.totalShifts.toString()} icon={CalendarDays} gradient="from-purple-600 to-purple-700 dark:from-purple-700 dark:to-purple-800" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card className="border-border">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{stats.signupsThisMonth}</p>
            <p className="text-xs text-muted-foreground">Signups This Month</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{stats.signupsLastMonth}</p>
            <p className="text-xs text-muted-foreground">Signups Last Month</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{stats.referralConversions}</p>
            <p className="text-xs text-muted-foreground">Referral Conversions</p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly signups */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Monthly Signups</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {monthlySignups.map((ms) => (
              <div key={ms.month} className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground w-28 shrink-0">{ms.month}</span>
                <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 to-green-600 rounded-full"
                    style={{ width: `${Math.min(100, (ms.count / Math.max(...monthlySignups.map((m) => m.count), 1)) * 100)}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-foreground w-8 text-right">{ms.count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent signups */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recent Signups</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {recentSignups.map((s, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded-lg border border-border">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    <span className="text-xs font-medium text-muted-foreground">U{i + 1}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {new Date(s.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {s.isPremium && <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 text-[10px]"><Star className="h-3 w-3 mr-0.5" /> Premium</Badge>}
                  {s.referredBy && <Badge variant="outline" className="text-[10px]">Referred</Badge>}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// LOADING SKELETON
// ============================================================
function LoadingSkeleton() {
  return (
    <div className="p-4 md:p-6 md:ml-64 space-y-4 max-w-6xl">
      <div className="h-8 w-48 bg-muted rounded-lg animate-pulse" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="h-48 bg-muted rounded-xl animate-pulse" />
        <div className="h-48 bg-muted rounded-xl animate-pulse" />
      </div>
    </div>
  );
}
