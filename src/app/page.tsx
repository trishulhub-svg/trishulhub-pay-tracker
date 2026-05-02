'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, FileText, LogOut, Menu, X,
  Wallet, TrendingUp, Building2, AlertCircle, Plus, Pencil,
  Trash2, Download, Moon, Sun,
  ArrowUpRight, ArrowDownRight, CheckCircle2, HourglassIcon,
  Mail, Loader2, Copy, Gift, Users, Settings,
  Crown, Briefcase, Star, Shield
} from 'lucide-react';
import { useAppStore, SessionUser } from '@/lib/store';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import Image from 'next/image';

// ===================== HELPERS =====================
const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function formatMonthYear(month: number, year: number): string {
  return `${MONTH_NAMES[month]} ${year}`;
}

function formatCurrency(amount: number): string {
  return `£${amount.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatHours(hours: number): string {
  return `${hours.toFixed(1)} hrs`;
}

// ===================== API HELPERS =====================
async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Something went wrong');
  }
  return data;
}

// ===================== COMPANY TYPE =====================
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

// ===================== AUTH VIEW =====================
function AuthView() {
  const { setUser, setAuthView, authView } = useAppStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [loading, setLoading] = useState(false);

  const isSignup = authView === 'signup';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (isSignup && !name) {
      toast.error('Please enter your name');
      return;
    }
    setLoading(true);
    try {
      const endpoint = isSignup ? '/api/auth/signup' : '/api/auth/login';
      const body = isSignup
        ? { name, email, password, referralCode: referralCode || undefined }
        : { email, password };
      const data = await apiFetch<{ user: SessionUser; message: string }>(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      setUser(data.user);
      toast.success(isSignup ? 'Account created! Welcome to TrishulHub!' : `Welcome back, ${data.user.name}!`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-green-50 dark:from-background dark:via-background dark:to-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="shadow-xl border-0 dark:border">
          <CardHeader className="text-center pb-2">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.2 }}
              className="mx-auto mb-4"
            >
              <Image
                src="/logo.png"
                alt="TrishulHub"
                width={64}
                height={64}
                className="mx-auto rounded-xl shadow-lg"
              />
            </motion.div>
            <CardTitle className="text-2xl font-bold">
              <span className="bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">TrishulHub</span>
              <span className="text-foreground"> Pay Tracker</span>
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {isSignup ? 'Create your free account' : 'Sign in to your account'}
            </CardDescription>
            <Badge variant="secondary" className="mx-auto mt-1 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
              Free forever
            </Badge>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignup && (
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <div className="relative">
                    <Users className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="name"
                      type="text"
                      placeholder="Your full name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pl-9"
                      disabled={loading}
                    />
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9"
                    disabled={loading}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Shield className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder={isSignup ? 'At least 6 characters' : 'Enter your password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9"
                    disabled={loading}
                  />
                </div>
              </div>
              {isSignup && (
                <div className="space-y-2">
                  <Label htmlFor="referralCode">Referral Code <span className="text-muted-foreground">(optional)</span></Label>
                  <div className="relative">
                    <Gift className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="referralCode"
                      type="text"
                      placeholder="TRISHUL-XXXXXX"
                      value={referralCode}
                      onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                      className="pl-9"
                      disabled={loading}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Use a referral code to help a friend unlock Premium!</p>
                </div>
              )}
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-md"
                disabled={loading}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {loading ? (isSignup ? 'Creating account...' : 'Signing in...') : (isSignup ? 'Create Account' : 'Sign In')}
              </Button>
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setAuthView(isSignup ? 'login' : 'signup')}
                  className="text-sm text-blue-600 hover:text-blue-700 hover:underline dark:text-blue-400"
                >
                  {isSignup ? 'Already have an account? Sign In' : "Don't have an account? Sign Up Free"}
                </button>
              </div>
              <div className="mt-4 p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground space-y-1">
                <p className="font-medium">Demo Account:</p>
                <p>demo@trishulhub.com / demo123</p>
              </div>
            </form>
          </CardContent>
        </Card>
        <p className="text-center text-xs text-muted-foreground mt-4">
          Track your salary payments from any company
        </p>
      </motion.div>
    </div>
  );
}

// ===================== SIDEBAR =====================
function Sidebar() {
  const { currentView, setCurrentView, user, sidebarOpen, setSidebarOpen, logout } = useAppStore();
  const { theme, setTheme } = useTheme();

  const navItems = [
    { key: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
    { key: 'records' as const, label: 'Payment Records', icon: FileText },
    { key: 'companies' as const, label: 'Companies', icon: Briefcase },
    { key: 'referrals' as const, label: 'Referrals', icon: Gift },
    { key: 'settings' as const, label: 'Settings', icon: Settings },
  ];

  const handleLogout = async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    logout();
    toast.success('Logged out successfully');
  };

  const handleNav = (key: typeof navItems[number]['key']) => {
    setCurrentView(key);
    setSidebarOpen(false);
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:flex-col md:w-64 bg-sidebar-background border-r border-sidebar-border h-screen sticky top-0">
        <div className="p-4 flex items-center gap-3 border-b border-sidebar-border">
          <Image src="/logo.png" alt="TrishulHub" width={40} height={40} className="rounded-xl shadow-md" />
          <div>
            <h1 className="font-bold text-lg">
              <span className="bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">TrishulHub</span>
            </h1>
            <p className="text-xs text-muted-foreground">Pay Tracker</p>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => handleNav(item.key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                currentView === item.key
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-md'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              }`}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-sidebar-border">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-blue-100 text-blue-700 text-xs dark:bg-blue-900 dark:text-blue-300">
                {user?.name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name}</p>
              <div className="flex items-center gap-1">
                {user?.isPremium && (
                  <Badge className="text-[10px] px-1 py-0 bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">
                    <Crown className="h-3 w-3 mr-0.5" /> Premium
                  </Badge>
                )}
                {!user?.isPremium && (
                  <span className="text-xs text-muted-foreground">Free</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="flex-1"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="flex-1 text-destructive hover:text-destructive"
            >
              <LogOut className="h-4 w-4 mr-1" />
              Logout
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b">
        <div className="flex items-center justify-between p-3">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="TrishulHub" width={32} height={32} className="rounded-lg" />
            <h1 className="font-bold text-sm">
              <span className="bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">TrishulHub</span>
            </h1>
          </div>
          <div className="flex items-center gap-1">
            {user?.isPremium && (
              <Badge className="text-[10px] px-1.5 py-0 bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">
                <Crown className="h-3 w-3 mr-0.5" /> Pro
              </Badge>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-t safe-area-bottom">
        <div className="flex items-center justify-around py-2 px-1">
          {navItems.slice(0, 4).map((item) => (
            <button
              key={item.key}
              onClick={() => handleNav(item.key)}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-[10px] font-medium transition-all ${
                currentView === item.key
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-muted-foreground'
              }`}
            >
              <item.icon className="h-5 w-5" />
              {item.label === 'Payment Records' ? 'Records' : item.label === 'Companies' ? 'Cos' : item.label}
            </button>
          ))}
          <button
            onClick={() => handleNav('settings')}
            className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-[10px] font-medium transition-all ${
              currentView === 'settings'
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-muted-foreground'
            }`}
          >
            <Settings className="h-5 w-5" />
            Settings
          </button>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              className="md:hidden fixed inset-0 bg-black z-50"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25 }}
              className="md:hidden fixed left-0 top-0 bottom-0 w-72 bg-background z-50 shadow-xl"
            >
              <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-2">
                  <Image src="/logo.png" alt="TrishulHub" width={32} height={32} className="rounded-lg" />
                  <span className="font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
                    TrishulHub
                  </span>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <div className="p-3 space-y-1">
                {navItems.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => handleNav(item.key)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      currentView === item.key
                        ? 'bg-primary text-primary-foreground shadow-md'
                        : 'text-foreground hover:bg-accent'
                    }`}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.label}
                  </button>
                ))}
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-4 border-t">
                <div className="flex items-center gap-3 mb-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-blue-100 text-blue-700 text-xs dark:bg-blue-900 dark:text-blue-300">
                      {user?.name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{user?.name}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

// ===================== STAT CARD =====================
function StatCard({
  title, value, icon: Icon, gradient, trend, trendValue,
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  gradient: string;
  trend?: 'up' | 'down' | null;
  trendValue?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
    >
      <Card className="overflow-hidden border-0 shadow-md hover:shadow-lg transition-shadow">
        <div className={`${gradient} p-4 text-white`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium opacity-90">{title}</p>
              <p className="text-2xl font-bold mt-1">{value}</p>
              {trend && trendValue && (
                <div className="flex items-center gap-1 mt-1">
                  {trend === 'up' ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  <span className="text-xs opacity-90">{trendValue}</span>
                </div>
              )}
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Icon className="h-6 w-6" />
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

// ===================== DASHBOARD VIEW =====================
function DashboardView() {
  const { user, setCurrentView, setSelectedCompanyId } = useAppStore();
  const [stats, setStats] = useState<Record<string, unknown> | null>(null);
  const [recentRecords, setRecentRecords] = useState<PaymentRecord[]>([]);
  const [comparison, setComparison] = useState<Record<string, unknown> | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [referralInfo, setReferralInfo] = useState<{ referralCode: string; referralCount: number; isPremium: boolean } | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  const fetchDashboard = useCallback(async () => {
    try {
      const params = selectedCompany !== 'all' ? `?companyId=${selectedCompany}` : '';
      const data = await apiFetch<Record<string, unknown>>(`/api/dashboard${params}`);
      setStats(data.stats as Record<string, unknown>);
      setRecentRecords(data.recentRecords as PaymentRecord[]);
      if (data.comparison) setComparison(data.comparison as Record<string, unknown>);
      if (data.companies) setCompanies(data.companies as Company[]);
      if (data.referralInfo) setReferralInfo(data.referralInfo as { referralCode: string; referralCount: number; isPremium: boolean });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, [selectedCompany]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  const hasNoCompanies = companies.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">
            Welcome back, {user?.name}! 👋
          </h2>
          <p className="text-muted-foreground">Here&apos;s your payment overview</p>
        </div>
        {companies.length > 0 && (
          <Select value={selectedCompany} onValueChange={setSelectedCompany}>
            <SelectTrigger className="w-48">
              <Briefcase className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="All Companies" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Companies</SelectItem>
              {companies.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* No Companies Prompt */}
      {hasNoCompanies && (
        <Card className="border-2 border-dashed border-blue-300 dark:border-blue-700 shadow-md">
          <CardContent className="p-8 text-center">
            <Briefcase className="h-16 w-16 text-blue-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">Add Your First Company</h3>
            <p className="text-muted-foreground mb-4">Start tracking your salary payments by adding the company you work for.</p>
            <Button
              onClick={() => {
                setSelectedCompanyId(null);
                setCurrentView('add-company');
              }}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-md"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Company
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Premium Upsell Banner */}
      {!user?.isPremium && !hasNoCompanies && (
        <Card className="border-2 border-amber-300 dark:border-amber-700 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30">
          <CardContent className="p-4 flex flex-col sm:flex-row items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900 rounded-xl flex items-center justify-center">
                <Crown className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="font-bold text-sm">Want to track multiple companies?</p>
                <p className="text-xs text-muted-foreground">Refer a friend to unlock Premium — unlimited companies!</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentView('referrals')}
              className="border-amber-300 dark:border-amber-700 whitespace-nowrap"
            >
              <Gift className="h-4 w-4 mr-1" />
              Get Premium
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Expected"
          value={formatCurrency(Number(stats?.totalExpected || 0))}
          icon={Wallet}
          gradient="bg-gradient-to-br from-blue-600 to-blue-700"
        />
        <StatCard
          title="Total Received"
          value={formatCurrency(Number(stats?.totalReceived || 0))}
          icon={TrendingUp}
          gradient="bg-gradient-to-br from-green-600 to-green-700"
        />
        <StatCard
          title="Total HMRC"
          value={formatCurrency(Number(stats?.totalHMRC || 0))}
          icon={Building2}
          gradient="bg-gradient-to-br from-rose-500 to-pink-600"
        />
        <StatCard
          title="Total Due"
          value={formatCurrency(Number(stats?.totalDue || 0))}
          icon={AlertCircle}
          gradient="bg-gradient-to-br from-amber-500 to-orange-600"
        />
      </div>

      {/* Monthly Comparison */}
      {comparison && (
        <Card className="shadow-md border-0 dark:border">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Monthly Comparison</CardTitle>
            <CardDescription>Current month vs previous month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-muted/50 rounded-xl">
                <p className="text-sm text-muted-foreground mb-1">
                  {comparison.current
                    ? formatMonthYear(
                        Number((comparison.current as Record<string, unknown>)?.month),
                        Number((comparison.current as Record<string, unknown>)?.year)
                      )
                    : 'Current Month'}
                </p>
                <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                  {comparison.current
                    ? formatCurrency(Number((comparison.current as Record<string, unknown>)?.totalReceived || 0))
                    : '£0.00'}
                </p>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-xl">
                <p className="text-sm text-muted-foreground mb-1">
                  {comparison.previous
                    ? formatMonthYear(
                        Number((comparison.previous as Record<string, unknown>)?.month),
                        Number((comparison.previous as Record<string, unknown>)?.year)
                      )
                    : 'Previous Month'}
                </p>
                <p className="text-xl font-bold text-muted-foreground">
                  {comparison.previous
                    ? formatCurrency(Number((comparison.previous as Record<string, unknown>)?.totalReceived || 0))
                    : '£0.00'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Button
          onClick={() => setCurrentView('add-record')}
          className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-md"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Payment Record
        </Button>
        <Button
          variant="outline"
          onClick={() => setCurrentView('companies')}
          className="border-blue-200 dark:border-blue-800"
        >
          <Briefcase className="h-4 w-4 mr-2" />
          Manage Companies
        </Button>
      </div>

      {/* Recent Records */}
      <Card className="shadow-md border-0 dark:border">
        <CardHeader>
          <CardTitle className="text-lg">Recent Payment Records</CardTitle>
          <CardDescription>Your recent payment records</CardDescription>
        </CardHeader>
        <CardContent>
          {recentRecords.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No payment records found</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setCurrentView('add-record')}
              >
                <Plus className="h-4 w-4 mr-2" /> Add Your First Record
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead>Month</TableHead>
                    <TableHead>Expected</TableHead>
                    <TableHead>Received</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentRecords.map((record) => (
                    <TableRow key={record.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                          {record.company?.name || 'N/A'}
                        </div>
                      </TableCell>
                      <TableCell>{formatMonthYear(record.month, record.year)}</TableCell>
                      <TableCell>{formatCurrency(record.totalExpected)}</TableCell>
                      <TableCell>{formatCurrency(record.totalReceived)}</TableCell>
                      <TableCell>
                        <Badge
                          variant={record.status === 'PAID' ? 'default' : 'secondary'}
                          className={
                            record.status === 'PAID'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'
                          }
                        >
                          {record.status === 'PAID' ? (
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                          ) : (
                            <HourglassIcon className="h-3 w-3 mr-1" />
                          )}
                          {record.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}

// ===================== PAYMENT RECORDS VIEW =====================
function PaymentRecordsView() {
  const { setCurrentView, setSelectedRecordId } = useAppStore();
  const [records, setRecords] = useState<PaymentRecord[]>([]);
  const [totals, setTotals] = useState<Record<string, number>>({});
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCompanyId, setFilterCompanyId] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterYear, setFilterYear] = useState<string>('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchRecords = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterCompanyId !== 'all') params.set('companyId', filterCompanyId);
      if (filterStatus !== 'all') params.set('status', filterStatus);
      if (filterYear !== 'all') params.set('year', filterYear);

      const data = await apiFetch<Record<string, unknown>>(`/api/payment-records?${params.toString()}`);
      setRecords(data.records as PaymentRecord[]);
      setTotals(data.totals as Record<string, number>);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to load records');
    } finally {
      setLoading(false);
    }
  }, [filterCompanyId, filterStatus, filterYear]);

  const fetchCompanies = useCallback(async () => {
    try {
      const data = await apiFetch<{ companies: Company[] }>('/api/companies');
      setCompanies(data.companies);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchRecords();
    fetchCompanies();
  }, [fetchRecords, fetchCompanies]);

  const handleEdit = (id: string) => {
    setSelectedRecordId(id);
    setCurrentView('edit-record');
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await apiFetch(`/api/payment-records/${deleteId}`, { method: 'DELETE' });
      toast.success('Payment record deleted');
      setDeleteId(null);
      fetchRecords();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  const years = [...new Set(records.map((r) => r.year))].sort((a, b) => b - a);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Payment Records</h2>
          <p className="text-muted-foreground">View and manage all your payment records</p>
        </div>
        <Button
          onClick={() => setCurrentView('add-record')}
          className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-md"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Record
        </Button>
      </div>

      {/* Filters */}
      <Card className="shadow-sm border-0 dark:border">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1">
              <Label className="text-xs">Company</Label>
              <Select value={filterCompanyId} onValueChange={setFilterCompanyId}>
                <SelectTrigger className="w-48">
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
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="PAID">Paid</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Year</Label>
              <Select value={filterYear} onValueChange={setFilterYear}>
                <SelectTrigger className="w-28">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {years.map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setFilterCompanyId('all');
                setFilterStatus('all');
                setFilterYear('all');
              }}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Records Table */}
      <Card className="shadow-md border-0 dark:border">
        <CardContent className="p-0">
          {records.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-lg font-medium text-muted-foreground">No payment records found</p>
              <p className="text-sm text-muted-foreground">Try adjusting your filters or add a new record</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead>Month</TableHead>
                    <TableHead className="text-right">Expected</TableHead>
                    <TableHead className="text-right">Received</TableHead>
                    <TableHead className="text-right">HMRC</TableHead>
                    <TableHead className="text-right">Due</TableHead>
                    <TableHead className="text-right">Hours</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Pay Slip</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record) => (
                    <TableRow key={record.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                          {record.company?.name || 'N/A'}
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatMonthYear(record.month, record.year)}
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(record.totalExpected)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(record.totalReceived)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(record.totalHMRC)}</TableCell>
                      <TableCell className="text-right font-semibold">
                        <span className={record.totalDue > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}>
                          {formatCurrency(record.totalDue)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">{formatHours(record.workedHours)}</TableCell>
                      <TableCell>
                        <Badge
                          variant={record.status === 'PAID' ? 'default' : 'secondary'}
                          className={
                            record.status === 'PAID'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'
                          }
                        >
                          {record.status === 'PAID' ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <HourglassIcon className="h-3 w-3 mr-1" />}
                          {record.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {record.paySlipUrl ? (
                          <a
                            href={record.paySlipUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 dark:text-blue-400 text-sm"
                          >
                            <Download className="h-3.5 w-3.5" />
                            {record.paySlipName || 'View'}
                          </a>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(record.id)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeleteId(record.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Grand Totals */}
      {records.length > 0 && (
        <Card className="shadow-md border-0 dark:border">
          <CardContent className="p-4">
            <h3 className="font-bold mb-3">Grand Totals</h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">Expected</p>
                <p className="font-bold text-blue-600 dark:text-blue-400">{formatCurrency(totals.totalExpected || 0)}</p>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">Received</p>
                <p className="font-bold text-green-600 dark:text-green-400">{formatCurrency(totals.totalReceived || 0)}</p>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">HMRC</p>
                <p className="font-bold text-rose-600 dark:text-rose-400">{formatCurrency(totals.totalHMRC || 0)}</p>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">Due</p>
                <p className="font-bold text-amber-600 dark:text-amber-400">{formatCurrency(totals.totalDue || 0)}</p>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">Hours</p>
                <p className="font-bold">{formatHours(totals.workedHours || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Payment Record</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this payment record? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ===================== COMPANIES VIEW =====================
function CompaniesView() {
  const { user, setCurrentView } = useAppStore();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyStats, setCompanyStats] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [creatingCompany, setCreatingCompany] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const fetchCompanies = useCallback(async () => {
    try {
      const data = await apiFetch<{ companies: Company[] }>('/api/companies');
      setCompanies(data.companies);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to load companies');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDashboard = useCallback(async () => {
    try {
      const data = await apiFetch<Record<string, unknown>>('/api/dashboard');
      if (data.companyStats) setCompanyStats(data.companyStats as Record<string, unknown>);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchCompanies();
    fetchDashboard();
  }, [fetchCompanies, fetchDashboard]);

  const handleCreateCompany = async () => {
    if (!newCompanyName.trim()) {
      toast.error('Please enter a company name');
      return;
    }
    setCreatingCompany(true);
    try {
      await apiFetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCompanyName.trim() }),
      });
      toast.success('Company added successfully!');
      setNewCompanyName('');
      setShowAddForm(false);
      fetchCompanies();
      fetchDashboard();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create company');
    } finally {
      setCreatingCompany(false);
    }
  };

  const handleDeleteCompany = async () => {
    if (!deleteId) return;
    try {
      await apiFetch(`/api/companies/${deleteId}`, { method: 'DELETE' });
      toast.success('Company deleted successfully');
      setDeleteId(null);
      fetchCompanies();
      fetchDashboard();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete company');
    }
  };

  const handleUpdateCompany = async () => {
    if (!editId || !editName.trim()) return;
    try {
      await apiFetch(`/api/companies/${editId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim() }),
      });
      toast.success('Company updated successfully');
      setEditId(null);
      setEditName('');
      fetchCompanies();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update company');
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[...Array(2)].map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Companies</h2>
          <p className="text-muted-foreground">Manage the companies you track payments for</p>
        </div>
        <Button
          onClick={() => setShowAddForm(true)}
          className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-md"
          disabled={!user?.isPremium && companies.length >= 1}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Company
        </Button>
      </div>

      {/* Premium Upsell */}
      {!user?.isPremium && companies.length >= 1 && (
        <Card className="border-2 border-amber-300 dark:border-amber-700 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30">
          <CardContent className="p-4 flex flex-col sm:flex-row items-center gap-4">
            <Crown className="h-8 w-8 text-amber-600 dark:text-amber-400" />
            <div className="flex-1">
              <p className="font-bold">You&apos;re on the Free plan</p>
              <p className="text-sm text-muted-foreground">Free accounts can track 1 company. Refer a friend to unlock unlimited companies!</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentView('referrals')}
              className="border-amber-300 dark:border-amber-700"
            >
              <Gift className="h-4 w-4 mr-1" /> Unlock Premium
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Add Company Form */}
      {showAddForm && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-2 border-blue-200 dark:border-blue-800">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <Input
                  placeholder="Enter company name (e.g., Amazon, Green Care)"
                  value={newCompanyName}
                  onChange={(e) => setNewCompanyName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateCompany()}
                  className="flex-1"
                />
                <div className="flex gap-2">
                  <Button
                    onClick={handleCreateCompany}
                    disabled={creatingCompany}
                    className="bg-gradient-to-r from-blue-600 to-blue-700 text-white"
                  >
                    {creatingCompany ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                    Add
                  </Button>
                  <Button variant="outline" onClick={() => { setShowAddForm(false); setNewCompanyName(''); }}>
                    Cancel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Edit Company Form */}
      {editId && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-2 border-blue-200 dark:border-blue-800">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <Input
                  placeholder="Company name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleUpdateCompany()}
                  className="flex-1"
                />
                <div className="flex gap-2">
                  <Button onClick={handleUpdateCompany} className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                    Save
                  </Button>
                  <Button variant="outline" onClick={() => { setEditId(null); setEditName(''); }}>
                    Cancel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Companies Grid */}
      {companies.length === 0 ? (
        <Card className="border-2 border-dashed border-blue-300 dark:border-blue-700">
          <CardContent className="p-8 text-center">
            <Briefcase className="h-16 w-16 text-blue-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">No Companies Yet</h3>
            <p className="text-muted-foreground mb-4">Add your first company to start tracking payments.</p>
            <Button
              onClick={() => setShowAddForm(true)}
              className="bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Company
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {companies.map((company) => {
            const stats = Array.isArray(companyStats)
              ? (companyStats as Record<string, unknown>[]).find((s) => s.id === company.id)
              : null;
            return (
              <motion.div key={company.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -2 }}>
                <Card className="shadow-md border-0 dark:border h-full">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center shadow-md text-white">
                          <Building2 className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="font-bold">{company.name}</h3>
                          <p className="text-xs text-muted-foreground">
                            {company._count?.paymentRecords || 0} records
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => { setEditId(company.id); setEditName(company.name); }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteId(company.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    {stats && (stats as Record<string, unknown>).totals && (
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-muted/50 rounded p-2">
                          <span className="text-muted-foreground">Received</span>
                          <p className="font-bold text-green-600 dark:text-green-400">
                            {formatCurrency(Number(((stats as Record<string, unknown>).totals as Record<string, number>)?.totalReceived || 0))}
                          </p>
                        </div>
                        <div className="bg-muted/50 rounded p-2">
                          <span className="text-muted-foreground">Due</span>
                          <p className="font-bold text-amber-600 dark:text-amber-400">
                            {formatCurrency(Number(((stats as Record<string, unknown>).totals as Record<string, number>)?.totalDue || 0))}
                          </p>
                        </div>
                      </div>
                    )}
                    {(stats as Record<string, unknown>)?.latestStatus && (
                      <div className="mt-2">
                        <Badge
                          variant={(stats as Record<string, unknown>).latestStatus === 'PAID' ? 'default' : 'secondary'}
                          className={
                            (stats as Record<string, unknown>).latestStatus === 'PAID'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 text-xs'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300 text-xs'
                          }
                        >
                          Latest: {String((stats as Record<string, unknown>).latestStatus)}
                        </Badge>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Company</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this company? All associated payment records will also be deleted. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCompany} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ===================== ADD/EDIT RECORD FORM =====================
function RecordFormView() {
  const { user, selectedRecordId, setCurrentView } = useAppStore();
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
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(!!selectedRecordId);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEditing = !!selectedRecordId;

  const fetchCompanies = useCallback(async () => {
    try {
      const data = await apiFetch<{ companies: Company[] }>('/api/companies');
      setCompanies(data.companies);
      if (!isEditing && data.companies.length > 0 && !companyId) {
        setCompanyId(data.companies[0].id);
      }
    } catch {
      // silent
    }
  }, [isEditing, companyId]);

  const fetchRecord = useCallback(async () => {
    if (!selectedRecordId) return;
    try {
      const data = await apiFetch<{ records: PaymentRecord[] }>('/api/payment-records');
      const record = (data.records as PaymentRecord[]).find((r) => r.id === selectedRecordId);
      if (record) {
        setCompanyId(record.companyId);
        setMonth(record.month);
        setYear(record.year);
        setTotalExpected(String(record.totalExpected));
        setTotalReceived(String(record.totalReceived));
        setTotalHMRC(String(record.totalHMRC));
        setWorkedHours(String(record.workedHours));
        setNotes(record.notes || '');
        setStatus(record.status);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to load record');
    } finally {
      setInitialLoading(false);
    }
  }, [selectedRecordId]);

  useEffect(() => {
    fetchCompanies();
    if (isEditing) fetchRecord();
  }, [fetchCompanies, fetchRecord, isEditing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) {
      toast.error('Please select a company');
      return;
    }
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

      if (isEditing) {
        await apiFetch(`/api/payment-records/${selectedRecordId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        toast.success('Payment record updated');
      } else {
        await apiFetch('/api/payment-records', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        toast.success('Payment record created');
      }
      setCurrentView('records');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save record');
    } finally {
      setLoading(false);
    }
  };

  const handlePaySlipUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedRecordId) return;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('recordId', selectedRecordId);
    try {
      await apiFetch('/api/upload-payslip', { method: 'POST', body: formData });
      toast.success('Pay slip uploaded');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    }
  };

  const totalDue = Math.max(0, (parseFloat(totalExpected) || 0) - (parseFloat(totalReceived) || 0));
  const autoStatus = totalDue <= 0 && (parseFloat(totalReceived) || 0) > 0 ? 'PAID' : 'PENDING';

  if (initialLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (companies.length === 0) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">{isEditing ? 'Edit Payment Record' : 'Add Payment Record'}</h2>
        <Card className="border-2 border-dashed border-blue-300 dark:border-blue-700">
          <CardContent className="p-8 text-center">
            <Briefcase className="h-16 w-16 text-blue-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">No Companies Yet</h3>
            <p className="text-muted-foreground mb-4">Please add a company first before creating payment records.</p>
            <Button onClick={() => setCurrentView('add-company')} className="bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md">
              <Plus className="h-4 w-4 mr-2" /> Add Company
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setCurrentView('records')}>
          <X className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold">{isEditing ? 'Edit Payment Record' : 'Add Payment Record'}</h2>
          <p className="text-muted-foreground">{isEditing ? 'Update payment details' : 'Record a new payment'}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="shadow-md border-0 dark:border">
          <CardContent className="p-6 space-y-6">
            {/* Company Selection */}
            <div className="space-y-2">
              <Label>Company</Label>
              <Select value={companyId} onValueChange={setCompanyId}>
                <SelectTrigger>
                  <Briefcase className="h-4 w-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Select a company" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Month and Year */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Month</Label>
                <Select value={String(month)} onValueChange={(v) => setMonth(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTH_NAMES.slice(1).map((name, idx) => (
                      <SelectItem key={idx + 1} value={String(idx + 1)}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Year</Label>
                <Select value={String(year)} onValueChange={(v) => setYear(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[2024, 2025, 2026, 2027].map((y) => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            {/* Financial Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Total Expected (£)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={totalExpected}
                  onChange={(e) => { setTotalExpected(e.target.value); if (!isEditing) setStatus(autoStatus); }}
                />
              </div>
              <div className="space-y-2">
                <Label>Total Received (£)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={totalReceived}
                  onChange={(e) => { setTotalReceived(e.target.value); if (!isEditing) setStatus(autoStatus); }}
                />
              </div>
              <div className="space-y-2">
                <Label>Total HMRC (£)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={totalHMRC}
                  onChange={(e) => setTotalHMRC(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Worked Hours</Label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="0.0"
                  value={workedHours}
                  onChange={(e) => setWorkedHours(e.target.value)}
                />
              </div>
            </div>

            {/* Auto-calculated fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3 bg-muted/50 rounded-lg">
                <Label className="text-xs text-muted-foreground">Total Due (auto-calculated)</Label>
                <p className={`text-lg font-bold ${totalDue > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                  {formatCurrency(totalDue)}
                </p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <Label className="text-xs text-muted-foreground">Status (auto-calculated)</Label>
                <Badge
                  className={`mt-1 ${autoStatus === 'PAID' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'}`}
                >
                  {autoStatus === 'PAID' ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <HourglassIcon className="h-3 w-3 mr-1" />}
                  {autoStatus}
                </Badge>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                placeholder="Add any notes about this payment..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            {/* Pay Slip Upload (only for editing) */}
            {isEditing && (
              <div className="space-y-2">
                <Label>Pay Slip</Label>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handlePaySlipUpload}
                  accept=".pdf,.png,.jpg,.jpeg"
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Upload Pay Slip
                </Button>
              </div>
            )}

            {/* Submit */}
            <div className="flex gap-3">
              <Button
                type="submit"
                disabled={loading}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-md"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {isEditing ? 'Update Record' : 'Create Record'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setCurrentView('records')}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}

// ===================== REFERRALS VIEW =====================
function ReferralsView() {
  const { user } = useAppStore();
  const [referralData, setReferralData] = useState<{ referralCode: string; referralCount: number; isPremium: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const fetchReferrals = useCallback(async () => {
    try {
      const data = await apiFetch<{ referralCode: string; referralCount: number; isPremium: boolean }>('/api/referrals');
      setReferralData(data);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to load referrals');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReferrals();
  }, [fetchReferrals]);

  const handleCopyCode = async () => {
    if (!referralData?.referralCode) return;
    try {
      await navigator.clipboard.writeText(referralData.referralCode);
      setCopied(true);
      toast.success('Referral code copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    );
  }

  const isPremium = referralData?.isPremium ?? user?.isPremium ?? false;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Referrals & Premium</h2>
        <p className="text-muted-foreground">Share TrishulHub with friends and unlock Premium features</p>
      </div>

      {/* Premium Status */}
      <Card className={`shadow-md border-0 dark:border ${isPremium ? 'bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30 border-2 border-amber-300 dark:border-amber-700' : ''}`}>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg ${isPremium ? 'bg-gradient-to-br from-amber-500 to-yellow-600' : 'bg-muted'}`}>
              <Crown className={`h-8 w-8 ${isPremium ? 'text-white' : 'text-muted-foreground'}`} />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold">
                {isPremium ? 'Premium Active' : 'Free Plan'}
              </h3>
              <p className="text-muted-foreground">
                {isPremium
                  ? 'You have unlimited company tracking!'
                  : 'Track up to 1 company for free'}
              </p>
            </div>
            <Badge className={`text-sm px-3 py-1 ${isPremium ? 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' : 'bg-muted text-muted-foreground'}`}>
              {isPremium ? 'Premium' : 'Free'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Referral Code */}
      <Card className="shadow-md border-0 dark:border">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Gift className="h-5 w-5 text-blue-600" />
            Your Referral Code
          </CardTitle>
          <CardDescription>
            Share this code with friends. When they sign up with your code, you unlock Premium!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex-1 p-4 bg-muted/50 rounded-xl text-center">
              <p className="text-2xl font-mono font-bold tracking-wider text-blue-600 dark:text-blue-400">
                {referralData?.referralCode || 'Loading...'}
              </p>
            </div>
            <Button
              onClick={handleCopyCode}
              variant="outline"
              size="lg"
              className="border-blue-200 dark:border-blue-800"
            >
              {copied ? <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" /> : <Copy className="h-4 w-4 mr-2" />}
              {copied ? 'Copied!' : 'Copy'}
            </Button>
          </div>

          {/* How it works */}
          <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-xl space-y-3">
            <h4 className="font-bold text-sm">How it works:</h4>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0">1</div>
              <p className="text-sm text-muted-foreground">Share your referral code <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{referralData?.referralCode}</span> with a friend</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0">2</div>
              <p className="text-sm text-muted-foreground">They sign up for TrishulHub using your code</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0">3</div>
              <p className="text-sm text-muted-foreground">You both get Premium — unlimited company tracking!</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Referral Stats */}
      <Card className="shadow-md border-0 dark:border">
        <CardHeader>
          <CardTitle className="text-lg">Referral Stats</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-xl">
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{referralData?.referralCount || 0}</p>
              <p className="text-sm text-muted-foreground">Successful Referrals</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-xl">
              <p className="text-3xl font-bold">
                {isPremium ? (
                  <span className="text-green-600 dark:text-green-400">Unlimited</span>
                ) : (
                  <span className="text-amber-600 dark:text-amber-400">1</span>
                )}
              </p>
              <p className="text-sm text-muted-foreground">Companies Allowed</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ===================== SETTINGS VIEW =====================
function SettingsView() {
  const { user } = useAppStore();
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Settings</h2>
        <p className="text-muted-foreground">Manage your account and preferences</p>
      </div>

      {/* Profile */}
      <Card className="shadow-md border-0 dark:border">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-blue-100 text-blue-700 text-xl dark:bg-blue-900 dark:text-blue-300">
                {user?.name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-xl font-bold">{user?.name}</h3>
              <p className="text-muted-foreground">{user?.email}</p>
              <div className="flex items-center gap-2 mt-1">
                {user?.isPremium ? (
                  <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">
                    <Crown className="h-3 w-3 mr-1" /> Premium
                  </Badge>
                ) : (
                  <Badge variant="secondary">Free Plan</Badge>
                )}
              </div>
            </div>
          </div>
          <Separator />
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Referral Code</Label>
            <p className="font-mono font-bold text-blue-600 dark:text-blue-400">{user?.referralCode}</p>
          </div>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card className="shadow-md border-0 dark:border">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Appearance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {theme === 'dark' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
              <div>
                <p className="font-medium">Dark Mode</p>
                <p className="text-sm text-muted-foreground">Toggle between light and dark themes</p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="border-blue-200 dark:border-blue-800"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4 mr-2" /> : <Moon className="h-4 w-4 mr-2" />}
              {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Plan Info */}
      <Card className="shadow-md border-0 dark:border">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Star className="h-5 w-5" />
            Plan Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Current Plan</span>
            <Badge className={user?.isPremium ? 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' : 'bg-muted text-muted-foreground'}>
              {user?.isPremium ? 'Premium' : 'Free'}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Companies Allowed</span>
            <span className="font-medium">{user?.isPremium ? 'Unlimited' : '1'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Payment Records</span>
            <span className="font-medium">Unlimited</span>
          </div>
          <Separator />
          {!user?.isPremium && (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-xl text-center">
              <Crown className="h-8 w-8 text-amber-600 dark:text-amber-400 mx-auto mb-2" />
              <p className="font-bold">Upgrade to Premium</p>
              <p className="text-sm text-muted-foreground mb-3">Refer a friend to unlock unlimited companies</p>
              <Button
                onClick={() => useAppStore.getState().setCurrentView('referrals')}
                className="bg-gradient-to-r from-amber-500 to-yellow-600 text-white"
              >
                <Gift className="h-4 w-4 mr-2" /> Get Premium
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* About */}
      <Card className="shadow-md border-0 dark:border">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="TrishulHub" width={40} height={40} className="rounded-xl" />
            <div>
              <p className="font-bold">TrishulHub Pay Tracker</p>
              <p className="text-xs text-muted-foreground">Track your salary payments from any company</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ===================== MAIN APP =====================
function MainApp() {
  const { currentView } = useAppStore();

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <DashboardView />;
      case 'records':
        return <PaymentRecordsView />;
      case 'add-record':
      case 'edit-record':
        return <RecordFormView />;
      case 'companies':
      case 'add-company':
        return <CompaniesView />;
      case 'referrals':
        return <ReferralsView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <main className="flex-1 p-4 md:p-6 pt-16 md:pt-6 pb-20 md:pb-6 overflow-auto">
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

// ===================== ROOT PAGE =====================
export default function Home() {
  const { user, setUser, setIsLoading } = useAppStore();
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const data = await apiFetch<{ user: SessionUser }>('/api/auth/session');
        setUser(data.user);
      } catch {
        setUser(null);
      } finally {
        setCheckingSession(false);
        setIsLoading(false);
      }
    };
    checkSession();
  }, [setUser, setIsLoading]);

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Image src="/logo.png" alt="TrishulHub" width={64} height={64} className="mx-auto rounded-2xl shadow-lg mb-4 animate-pulse" />
          <p className="text-muted-foreground">Loading TrishulHub...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthView />;
  }

  return <MainApp />;
}
