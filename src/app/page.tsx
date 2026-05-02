'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, FileText, Users, Settings, LogOut, Menu, X,
  Wallet, TrendingUp, Building2, AlertCircle, Clock, Plus, Pencil,
  Trash2, Download, Upload, Search, Moon, Sun, Leaf, ChevronRight,
  UserPlus, Eye, ArrowUpRight, ArrowDownRight, CheckCircle2, HourglassIcon,
  User, Shield, Phone, Mail, Loader2
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
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

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

// ===================== LOGIN VIEW =====================
function LoginView() {
  const { setUser, setAuthView, authView } = useAppStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      const data = await apiFetch<{ user: SessionUser; message: string }>('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      setUser(data.user);
      toast.success(`Welcome back, ${data.user.name}!`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-green-50 dark:from-background dark:via-background dark:to-background p-4">
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
              className="mx-auto w-16 h-16 bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg"
            >
              <Leaf className="w-8 h-8 text-white" />
            </motion.div>
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
              Green Care Pay
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {authView === 'login' ? 'Sign in to your account' : 'Reset your password'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {authView === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="admin@greencare.com"
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
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-9"
                      disabled={loading}
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-md"
                  disabled={loading}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {loading ? 'Signing in...' : 'Sign In'}
                </Button>
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setAuthView('forgot')}
                    className="text-sm text-emerald-600 hover:text-emerald-700 hover:underline"
                  >
                    Forgot your password?
                  </button>
                </div>
                <div className="mt-4 p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground space-y-1">
                  <p className="font-medium">Demo Credentials:</p>
                  <p>Admin: admin@greencare.com / admin123</p>
                  <p>Employee: employee@greencare.com / employee123</p>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="forgot-email">Email</Label>
                  <Input id="forgot-email" type="email" placeholder="Enter your email" />
                </div>
                <Button className="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white">
                  Send Reset Link
                </Button>
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setAuthView('login')}
                    className="text-sm text-emerald-600 hover:text-emerald-700 hover:underline"
                  >
                    Back to Sign In
                  </button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

// ===================== SIDEBAR =====================
function Sidebar() {
  const { currentView, setCurrentView, user, sidebarOpen, setSidebarOpen, logout } = useAppStore();
  const { theme, setTheme } = useTheme();

  const adminNavItems = [
    { key: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
    { key: 'records' as const, label: 'Payment Records', icon: FileText },
    { key: 'users' as const, label: 'Users', icon: Users },
    { key: 'settings' as const, label: 'Settings', icon: Settings },
  ];

  const employeeNavItems = [
    { key: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
    { key: 'records' as const, label: 'My Records', icon: FileText },
    { key: 'settings' as const, label: 'Settings', icon: Settings },
  ];

  const navItems = user?.role === 'ADMIN' ? adminNavItems : employeeNavItems;

  const handleLogout = async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    logout();
    toast.success('Logged out successfully');
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:flex-col md:w-64 bg-sidebar-background border-r border-sidebar-border h-screen sticky top-0">
        <div className="p-4 flex items-center gap-3 border-b border-sidebar-border">
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center shadow-md">
            <Leaf className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
              Green Care Pay
            </h1>
            <p className="text-xs text-muted-foreground">Payment Management</p>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => setCurrentView(item.key)}
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
              <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs dark:bg-emerald-900 dark:text-emerald-300">
                {user?.name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.role}</p>
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
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg flex items-center justify-center">
              <Leaf className="w-4 h-4 text-white" />
            </div>
            <h1 className="font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
              Green Care Pay
            </h1>
          </div>
          <div className="flex items-center gap-2">
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
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-t">
        <div className="flex items-center justify-around py-2 px-2">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => setCurrentView(item.key)}
              className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                currentView === item.key
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-muted-foreground'
              }`}
            >
              <item.icon className="h-5 w-5" />
              {item.label === 'Payment Records' || item.label === 'My Records' ? 'Records' : item.label}
            </button>
          ))}
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
                  <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg flex items-center justify-center">
                    <Leaf className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
                    Green Care Pay
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
                    onClick={() => {
                      setCurrentView(item.key);
                      setSidebarOpen(false);
                    }}
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
                    <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs dark:bg-emerald-900 dark:text-emerald-300">
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
                  {trend === 'up' ? (
                    <ArrowUpRight className="h-3 w-3" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3" />
                  )}
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
  const { user } = useAppStore();
  const [stats, setStats] = useState<Record<string, unknown> | null>(null);
  const [recentRecords, setRecentRecords] = useState<Record<string, unknown>[]>([]);
  const [comparison, setComparison] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = useCallback(async () => {
    try {
      const data = await apiFetch<Record<string, unknown>>('/api/dashboard');
      setStats(data.stats as Record<string, unknown>);
      setRecentRecords(data.recentRecords as Record<string, unknown>[]);
      if (data.comparison) setComparison(data.comparison as Record<string, unknown>);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  const isAdmin = user?.role === 'ADMIN';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">
            Welcome back, {user?.name}! 👋
          </h2>
          <p className="text-muted-foreground">
            {isAdmin ? "Here's your company overview" : "Here's your payment overview"}
          </p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isAdmin ? (
          <>
            <StatCard
              title="Total Employees"
              value={String(stats?.totalEmployees || 0)}
              icon={Users}
              gradient="bg-gradient-to-br from-emerald-500 to-green-600"
            />
            <StatCard
              title="Total Revenue"
              value={formatCurrency(Number(stats?.totalReceived || 0))}
              icon={Wallet}
              gradient="bg-gradient-to-br from-teal-500 to-cyan-600"
            />
            <StatCard
              title="Pending Payments"
              value={String(stats?.pendingCount || 0)}
              icon={HourglassIcon}
              gradient="bg-gradient-to-br from-amber-500 to-orange-600"
            />
            <StatCard
              title="Total HMRC"
              value={formatCurrency(Number(stats?.totalHMRC || 0))}
              icon={Building2}
              gradient="bg-gradient-to-br from-rose-500 to-pink-600"
            />
          </>
        ) : (
          <>
            <StatCard
              title="Total Expected"
              value={formatCurrency(Number(stats?.totalExpected || 0))}
              icon={Wallet}
              gradient="bg-gradient-to-br from-emerald-500 to-green-600"
            />
            <StatCard
              title="Total Received"
              value={formatCurrency(Number(stats?.totalReceived || 0))}
              icon={TrendingUp}
              gradient="bg-gradient-to-br from-teal-500 to-cyan-600"
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
          </>
        )}
      </div>

      {/* Employee Comparison */}
      {!isAdmin && comparison && (
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
                <p className="text-xl font-bold text-emerald-600">
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

      {/* Quick Actions for Admin */}
      {isAdmin && (
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={() => useAppStore.getState().setCurrentView('add-record')}
            className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-md"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Payment Record
          </Button>
          <Button
            variant="outline"
            onClick={() => useAppStore.getState().setCurrentView('users')}
            className="border-emerald-200 dark:border-emerald-800"
          >
            <Users className="h-4 w-4 mr-2" />
            Manage Users
          </Button>
        </div>
      )}

      {/* Recent Records */}
      <Card className="shadow-md border-0 dark:border">
        <CardHeader>
          <CardTitle className="text-lg">Recent Payment Records</CardTitle>
          <CardDescription>
            {isAdmin ? 'Latest payment activity across all employees' : 'Your recent payment records'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentRecords.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No payment records found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {isAdmin && <TableHead>Employee</TableHead>}
                    <TableHead>Month</TableHead>
                    <TableHead>Expected</TableHead>
                    <TableHead>Received</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentRecords.map((record: Record<string, unknown>) => (
                    <TableRow key={String(record.id)} className="hover:bg-muted/50 transition-colors">
                      {isAdmin && (
                        <TableCell className="font-medium">
                          {(record.user as Record<string, string>)?.name || 'N/A'}
                        </TableCell>
                      )}
                      <TableCell>
                        {formatMonthYear(Number(record.month), Number(record.year))}
                      </TableCell>
                      <TableCell>{formatCurrency(Number(record.totalExpected))}</TableCell>
                      <TableCell>{formatCurrency(Number(record.totalReceived))}</TableCell>
                      <TableCell>
                        <Badge
                          variant={record.status === 'PAID' ? 'default' : 'secondary'}
                          className={
                            record.status === 'PAID'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'
                          }
                        >
                          {record.status === 'PAID' ? (
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                          ) : (
                            <HourglassIcon className="h-3 w-3 mr-1" />
                          )}
                          {String(record.status)}
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
  const { user, setCurrentView, setSelectedRecordId } = useAppStore();
  const [records, setRecords] = useState<Record<string, unknown>[]>([]);
  const [totals, setTotals] = useState<Record<string, number>>({});
  const [users, setUsers] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterUserId, setFilterUserId] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterYear, setFilterYear] = useState<string>('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchRecords = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterUserId !== 'all') params.set('userId', filterUserId);
      if (filterStatus !== 'all') params.set('status', filterStatus);
      if (filterYear !== 'all') params.set('year', filterYear);

      const data = await apiFetch<Record<string, unknown>>(`/api/payment-records?${params.toString()}`);
      setRecords(data.records as Record<string, unknown>[]);
      setTotals(data.totals as Record<string, number>);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to load records');
    } finally {
      setLoading(false);
    }
  }, [filterUserId, filterStatus, filterYear]);

  const fetchUsers = useCallback(async () => {
    if (user?.role !== 'ADMIN') return;
    try {
      const data = await apiFetch<{ users: Record<string, unknown>[] }>('/api/users');
      setUsers(data.users);
    } catch {
      // silent
    }
  }, [user?.role]);

  useEffect(() => {
    fetchRecords();
    fetchUsers();
  }, [fetchRecords, fetchUsers]);

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

  const years = [...new Set(records.map((r) => Number(r.year)))].sort((a, b) => b - a);

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
          <p className="text-muted-foreground">View and manage all payment records</p>
        </div>
        {user?.role === 'ADMIN' && (
          <Button
            onClick={() => setCurrentView('add-record')}
            className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-md"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Record
          </Button>
        )}
      </div>

      {/* Filters */}
      {user?.role === 'ADMIN' && (
        <Card className="shadow-sm border-0 dark:border">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="space-y-1">
                <Label className="text-xs">Employee</Label>
                <Select value={filterUserId} onValueChange={setFilterUserId}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="All Employees" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Employees</SelectItem>
                    {users.map((u: Record<string, unknown>) => (
                      <SelectItem key={String(u.id)} value={String(u.id)}>
                        {String(u.name)}
                      </SelectItem>
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
                      <SelectItem key={y} value={String(y)}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  setFilterUserId('all');
                  setFilterStatus('all');
                  setFilterYear('all');
                }}
              >
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

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
                    {user?.role === 'ADMIN' && <TableHead>Employee</TableHead>}
                    <TableHead>Month</TableHead>
                    <TableHead className="text-right">Expected</TableHead>
                    <TableHead className="text-right">Received</TableHead>
                    <TableHead className="text-right">HMRC</TableHead>
                    <TableHead className="text-right">Due</TableHead>
                    <TableHead className="text-right">Hours</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Pay Slip</TableHead>
                    {user?.role === 'ADMIN' && <TableHead>Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record: Record<string, unknown>) => (
                    <TableRow key={String(record.id)} className="hover:bg-muted/50 transition-colors">
                      {user?.role === 'ADMIN' && (
                        <TableCell className="font-medium">
                          {(record.user as Record<string, string>)?.name || 'N/A'}
                        </TableCell>
                      )}
                      <TableCell className="whitespace-nowrap">
                        {formatMonthYear(Number(record.month), Number(record.year))}
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(Number(record.totalExpected))}</TableCell>
                      <TableCell className="text-right">{formatCurrency(Number(record.totalReceived))}</TableCell>
                      <TableCell className="text-right">{formatCurrency(Number(record.totalHMRC))}</TableCell>
                      <TableCell className="text-right font-semibold">
                        <span className={Number(record.totalDue) > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}>
                          {formatCurrency(Number(record.totalDue))}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">{formatHours(Number(record.workedHours))}</TableCell>
                      <TableCell>
                        <Badge
                          variant={record.status === 'PAID' ? 'default' : 'secondary'}
                          className={
                            record.status === 'PAID'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'
                          }
                        >
                          {record.status === 'PAID' ? (
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                          ) : (
                            <HourglassIcon className="h-3 w-3 mr-1" />
                          )}
                          {String(record.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {record.paySlipUrl ? (
                          <a
                            href={String(record.paySlipUrl)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 text-sm"
                          >
                            <Download className="h-3.5 w-3.5" />
                            {String(record.paySlipName || 'View')}
                          </a>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      {user?.role === 'ADMIN' && (
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(String(record.id))}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setDeleteId(String(record.id))}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                  {/* Grand Total Row */}
                  <TableRow className="bg-muted/50 font-bold">
                    {user?.role === 'ADMIN' && <TableCell>Grand Total</TableCell>}
                    <TableCell />
                    <TableCell className="text-right">{formatCurrency(totals.totalExpected || 0)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(totals.totalReceived || 0)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(totals.totalHMRC || 0)}</TableCell>
                    <TableCell className="text-right">
                      <span className={(totals.totalDue || 0) > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}>
                        {formatCurrency(totals.totalDue || 0)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">{formatHours(totals.workedHours || 0)}</TableCell>
                    <TableCell colSpan={user?.role === 'ADMIN' ? 3 : 2} />
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

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

// ===================== ADD/EDIT RECORD VIEW =====================
function RecordFormView() {
  const { user, selectedRecordId, setCurrentView } = useAppStore();
  const [users, setUsers] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const isEdit = !!selectedRecordId;

  const [form, setForm] = useState({
    userId: '',
    month: '',
    year: '',
    totalExpected: '',
    totalReceived: '',
    totalHMRC: '',
    workedHours: '',
    notes: '',
    status: 'PENDING',
  });
  const [payslipFile, setPayslipFile] = useState<File | null>(null);

  useEffect(() => {
    const loadUsers = async () => {
      if (user?.role === 'ADMIN') {
        try {
          const data = await apiFetch<{ users: Record<string, unknown>[] }>('/api/users');
          setUsers(data.users.filter((u: Record<string, unknown>) => u.role === 'EMPLOYEE' && u.isActive));
        } catch {
          // silent
        }
      }
    };
    loadUsers();
  }, [user?.role]);

  useEffect(() => {
    if (isEdit && selectedRecordId) {
      setFetching(true);
      const fetchRecord = async () => {
        try {
          const data = await apiFetch<Record<string, unknown>>('/api/payment-records');
          const found = (data.records as Record<string, unknown>[]).find(
            (r: Record<string, unknown>) => r.id === selectedRecordId
          );
          if (found) {
            setForm({
              userId: String(found.userId),
              month: String(found.month),
              year: String(found.year),
              totalExpected: String(found.totalExpected),
              totalReceived: String(found.totalReceived),
              totalHMRC: String(found.totalHMRC),
              workedHours: String(found.workedHours),
              notes: String(found.notes || ''),
              status: String(found.status),
            });
          }
        } catch {
          toast.error('Failed to load record');
        } finally {
          setFetching(false);
        }
      };
      fetchRecord();
    } else if (user?.role !== 'ADMIN') {
      setForm((prev) => ({ ...prev, userId: user.id }));
    }
  }, [isEdit, selectedRecordId, user]);

  const totalDue = Math.max(0, (parseFloat(form.totalExpected) || 0) - (parseFloat(form.totalReceived) || 0));
  const autoStatus = totalDue <= 0 && (parseFloat(form.totalReceived) || 0) > 0 ? 'PAID' : 'PENDING';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        userId: form.userId,
        month: parseInt(form.month),
        year: parseInt(form.year),
        totalExpected: parseFloat(form.totalExpected) || 0,
        totalReceived: parseFloat(form.totalReceived) || 0,
        totalHMRC: parseFloat(form.totalHMRC) || 0,
        workedHours: parseFloat(form.workedHours) || 0,
        notes: form.notes || null,
        status: autoStatus,
      };

      if (isEdit) {
        await apiFetch(`/api/payment-records/${selectedRecordId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        // Upload payslip if file selected
        if (payslipFile) {
          const formData = new FormData();
          formData.append('file', payslipFile);
          formData.append('recordId', selectedRecordId);
          await apiFetch('/api/upload-payslip', { method: 'POST', body: formData });
        }

        toast.success('Payment record updated');
      } else {
        const data = await apiFetch<{ record: Record<string, unknown> }>('/api/payment-records', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        // Upload payslip if file selected
        if (payslipFile && data.record?.id) {
          const formData = new FormData();
          formData.append('file', payslipFile);
          formData.append('recordId', String(data.record.id));
          await apiFetch('/api/upload-payslip', { method: 'POST', body: formData });
        }

        toast.success('Payment record created');
      }
      setCurrentView('records');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save record');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold">
          {isEdit ? 'Edit Payment Record' : 'Add Payment Record'}
        </h2>
        <p className="text-muted-foreground">
          {isEdit ? 'Update the payment record details' : 'Create a new payment record for an employee'}
        </p>
      </div>

      <Card className="shadow-md border-0 dark:border">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {user?.role === 'ADMIN' && (
              <div className="space-y-2">
                <Label>Employee</Label>
                <Select
                  value={form.userId}
                  onValueChange={(v) => setForm({ ...form, userId: v })}
                  disabled={isEdit}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((u: Record<string, unknown>) => (
                      <SelectItem key={String(u.id)} value={String(u.id)}>
                        {String(u.name)} ({String(u.email)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Month</Label>
                <Select
                  value={form.month}
                  onValueChange={(v) => setForm({ ...form, month: v })}
                  disabled={isEdit}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select month" />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTH_NAMES.slice(1).map((name, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Year</Label>
                <Input
                  type="number"
                  value={form.year}
                  onChange={(e) => setForm({ ...form, year: e.target.value })}
                  placeholder="2025"
                  disabled={isEdit}
                />
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Total Expected (£)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.totalExpected}
                  onChange={(e) => setForm({ ...form, totalExpected: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Total Received (£)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.totalReceived}
                  onChange={(e) => setForm({ ...form, totalReceived: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Total HMRC (£)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.totalHMRC}
                  onChange={(e) => setForm({ ...form, totalHMRC: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Worked Hours</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={form.workedHours}
                  onChange={(e) => setForm({ ...form, workedHours: e.target.value })}
                  placeholder="0.0"
                />
              </div>
            </div>

            {/* Auto-calculated fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Total Due (auto-calculated)</Label>
                <div className="h-9 px-3 flex items-center rounded-md border bg-muted/50 text-sm font-semibold">
                  <span className={totalDue > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}>
                    {formatCurrency(totalDue)}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Status (auto-calculated)</Label>
                <div className="h-9 px-3 flex items-center rounded-md border bg-muted/50">
                  <Badge
                    className={
                      autoStatus === 'PAID'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'
                    }
                  >
                    {autoStatus === 'PAID' ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <HourglassIcon className="h-3 w-3 mr-1" />}
                    {autoStatus}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Optional notes..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Pay Slip (PDF/Image)</Label>
              <div className="flex items-center gap-3">
                <Input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={(e) => setPayslipFile(e.target.files?.[0] || null)}
                  className="flex-1"
                />
                {payslipFile && (
                  <span className="text-sm text-emerald-600">
                    <Upload className="h-4 w-4 inline mr-1" />
                    {payslipFile.name}
                  </span>
                )}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="submit"
                className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-md"
                disabled={loading}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {isEdit ? 'Update Record' : 'Create Record'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentView('records')}
                disabled={loading}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// ===================== USERS VIEW =====================
function UsersView() {
  const [users, setUsers] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editUser, setEditUser] = useState<Record<string, unknown> | null>(null);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);

  // Add/Edit form state
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'EMPLOYEE',
    phone: '',
  });

  const fetchUsers = useCallback(async () => {
    try {
      const data = await apiFetch<{ users: Record<string, unknown>[] }>('/api/users');
      setUsers(data.users);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const resetForm = () => {
    setForm({ name: '', email: '', password: '', role: 'EMPLOYEE', phone: '' });
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      toast.success('User created successfully');
      setShowAddDialog(false);
      resetForm();
      fetchUsers();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create user');
    }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;
    try {
      const updateData: Record<string, unknown> = {
        name: form.name,
        email: form.email,
        role: form.role,
        phone: form.phone,
      };
      if (form.password) updateData.password = form.password;

      await apiFetch(`/api/users/${String(editUser.id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });
      toast.success('User updated successfully');
      setEditUser(null);
      resetForm();
      fetchUsers();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update user');
    }
  };

  const handleToggleActive = async (userId: string, currentActive: boolean) => {
    try {
      await apiFetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentActive }),
      });
      toast.success(`User ${!currentActive ? 'activated' : 'deactivated'}`);
      fetchUsers();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update user');
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteUserId) return;
    try {
      await apiFetch(`/api/users/${deleteUserId}`, { method: 'DELETE' });
      toast.success('User deleted successfully');
      setDeleteUserId(null);
      fetchUsers();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete user');
    }
  };

  const openEditDialog = (u: Record<string, unknown>) => {
    setForm({
      name: String(u.name || ''),
      email: String(u.email || ''),
      password: '',
      role: String(u.role || 'EMPLOYEE'),
      phone: String(u.phone || ''),
    });
    setEditUser(u);
  };

  const filteredUsers = users.filter(
    (u) =>
      String(u.name).toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(u.email).toLowerCase().includes(searchQuery.toLowerCase())
  );

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
          <h2 className="text-2xl font-bold">User Management</h2>
          <p className="text-muted-foreground">Manage employee accounts and access</p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setShowAddDialog(true);
          }}
          className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-md"
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search users..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Users Table */}
      <Card className="shadow-md border-0 dark:border">
        <CardContent className="p-0">
          {filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-lg font-medium text-muted-foreground">No users found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Records</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((u: Record<string, unknown>) => (
                    <TableRow key={String(u.id)} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-7 w-7">
                            <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs dark:bg-emerald-900 dark:text-emerald-300">
                              {String(u.name)?.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          {String(u.name)}
                        </div>
                      </TableCell>
                      <TableCell>{String(u.email)}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            u.role === 'ADMIN'
                              ? 'border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-300'
                              : ''
                          }
                        >
                          {u.role === 'ADMIN' ? <Shield className="h-3 w-3 mr-1" /> : <User className="h-3 w-3 mr-1" />}
                          {String(u.role)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={Boolean(u.isActive)}
                            onCheckedChange={() => handleToggleActive(String(u.id), Boolean(u.isActive))}
                          />
                          <span className="text-sm text-muted-foreground">
                            {u.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{String((u._count as Record<string, number>)?.paymentRecords || 0)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEditDialog(u)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeleteUserId(String(u.id))}
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

      {/* Add User Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>Create a new employee or admin account</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddUser} className="space-y-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EMPLOYEE">Employee</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Phone (Optional)</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
              <Button type="submit" className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white">
                Create User
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={!!editUser} onOpenChange={() => { setEditUser(null); resetForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user account details</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditUser} className="space-y-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>New Password (leave blank to keep current)</Label>
              <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EMPLOYEE">Employee</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Phone (Optional)</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setEditUser(null); resetForm(); }}>Cancel</Button>
              <Button type="submit" className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white">
                Update User
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteUserId} onOpenChange={() => setDeleteUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this user? All their payment records will also be deleted. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ===================== SETTINGS VIEW =====================
function SettingsView() {
  const { user } = useAppStore();
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold">Settings</h2>
        <p className="text-muted-foreground">Manage your account preferences</p>
      </div>

      <Card className="shadow-md border-0 dark:border">
        <CardHeader>
          <CardTitle className="text-lg">Profile</CardTitle>
          <CardDescription>Your account information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xl dark:bg-emerald-900 dark:text-emerald-300">
                {user?.name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-lg font-semibold">{user?.name}</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              <Badge
                variant="outline"
                className="mt-1 border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-300"
              >
                {user?.role}
              </Badge>
            </div>
          </div>
          <Separator />
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Mail className="h-3.5 w-3.5" /> Email
              </p>
              <p className="text-sm font-medium">{user?.email}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Shield className="h-3.5 w-3.5" /> Role
              </p>
              <p className="text-sm font-medium">{user?.role}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-md border-0 dark:border">
        <CardHeader>
          <CardTitle className="text-lg">Appearance</CardTitle>
          <CardDescription>Customize the look and feel</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {theme === 'dark' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
              <div>
                <p className="text-sm font-medium">Theme</p>
                <p className="text-xs text-muted-foreground">Switch between light and dark mode</p>
              </div>
            </div>
            <Select value={theme} onValueChange={setTheme}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ===================== MAIN APP =====================
function AppContent() {
  const { user, currentView } = useAppStore();

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {user && <Sidebar />}
      <main className="flex-1 p-4 md:p-8 mt-14 md:mt-0 mb-16 md:mb-0 overflow-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentView}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {currentView === 'dashboard' && <DashboardView />}
            {currentView === 'records' && <PaymentRecordsView />}
            {currentView === 'add-record' && <RecordFormView />}
            {currentView === 'edit-record' && <RecordFormView />}
            {currentView === 'users' && <UsersView />}
            {currentView === 'settings' && <SettingsView />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

// ===================== PAGE EXPORT =====================
export default function Home() {
  const { user, setUser, setIsLoading } = useAppStore();
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const data = await apiFetch<{ user: SessionUser }>('/api/auth/session');
        setUser(data.user);
      } catch {
        // Not logged in
      } finally {
        setInitializing(false);
        setIsLoading(false);
      }
    };
    checkSession();
  }, [setUser, setIsLoading]);

  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl flex items-center justify-center shadow-lg animate-pulse">
            <Leaf className="w-8 h-8 text-white" />
          </div>
          <p className="text-muted-foreground animate-pulse">Loading Green Care Pay...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  return <AppContent />;
}
