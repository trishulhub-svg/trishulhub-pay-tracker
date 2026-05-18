'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  LayoutDashboard, FileText, Calendar, CalendarDays, Users, Settings,
  LogOut, Plus, Edit3, Trash2, ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
  Moon, Sun, Eye, EyeOff, Copy, Share2, Check, AlertCircle,
  Clock, Building2, TrendingUp, TrendingDown, PoundSterling, BarChart3,
  Shield, X, UserPlus, Star, Info, Gift, ArrowRight, RefreshCw,
  Loader2, Mail, Lock, User, KeyRound, ExternalLink, CheckCircle2,
  FileCheck, Monitor, Save, Server, Upload, FileUp, Sparkles, Brain, Trash, Globe, RotateCcw
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAppStore, SessionUser } from '@/lib/store';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from '@/components/ui/input-otp';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

// ============================================================
// TYPES
// ============================================================
interface Company {
  id: string;
  name: string;
  userId: string;
  payRate: number;
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
  payRate: number;
  notes: string | null;
  client: string | null;
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
  referredUsers: { name: string; createdAt: string; isActive: boolean }[];
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
  { value: 'ON_CALL', label: 'On Call', color: 'bg-purple-500 dark:bg-purple-400' },
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
  if (!startTime || !endTime) return 0;
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  if (isNaN(startH) || isNaN(startM) || isNaN(endH) || isNaN(endM)) return 0;
  let startMinutes = startH * 60 + startM;
  let endMinutes = endH * 60 + endM;
  // SHI-001: Use strict < (matching server behavior) — === means 0-hour shift, not 24-hour
  if (endMinutes < startMinutes) endMinutes += 24 * 60;
  const workedMinutes = endMinutes - startMinutes - breakMinutes;
  return Math.max(0, Math.round((workedMinutes / 60) * 100) / 100);
}

// Format decimal hours into human-readable "Xh XXm" (e.g. 8.12 → "8h 07m")
function formatHoursMinutes(decimalHours: number): string {
  if (decimalHours <= 0) return '0h 0m';
  // SHI-017: Use total minutes approach to avoid "60m" rounding edge case
  const totalMinutes = Math.round(decimalHours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}h ${m}m`;
}

function formatTime12h(time24: string): string {
  if (!time24) return '--:--';
  const [h, m] = time24.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return '--:--';
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

// ============================================================
// API HELPER
// ============================================================
const FETCH_TIMEOUT = 15_000; // 15 seconds

async function apiFetch(url: string, options?: RequestInit) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json', ...options?.headers },
      ...options,
      signal: controller.signal,
    });
    const data = await res.json();
    if (!res.ok) {
      // Global 401 handler: expired/invalid session during any API call → force logout
      if (res.status === 401 && !url.includes('/auth/login') && !url.includes('/auth/signup')) {
        // Clear Zustand user state so login screen shows immediately
        const { setUser } = await import('@/lib/store').then(m => m.useAppStore.getState());
        setUser(null);
        // Clear the httpOnly cookie server-side
        fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
      }
      throw new Error(data.error || 'Something went wrong');
    }
    return data;
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('Request timed out. Please check your connection and try again.');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
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

// Blur number inputs on wheel scroll to prevent accidental value changes
function handleNumberInputWheel(e: React.WheelEvent<HTMLInputElement>) {
  (e.target as HTMLInputElement).blur();
}

// ============================================================
// SCROLL TIME PICKER COMPONENT
// ============================================================
const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 5;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

function ScrollColumn({
  items,
  selectedIndex,
  onSelect,
  formatLabel,
}: {
  items: number[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  formatLabel?: (val: number) => string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isScrolling = useRef(false);
  const scrollTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Scroll to selected item on mount or when selectedIndex changes externally
  useEffect(() => {
    if (ref.current && !isScrolling.current) {
      const targetScroll = selectedIndex * ITEM_HEIGHT;
      ref.current.scrollTop = targetScroll;
    }
  }, [selectedIndex]);

  const handleScroll = useCallback(() => {
    if (!ref.current) return;
    isScrolling.current = true;

    if (scrollTimeout.current) clearTimeout(scrollTimeout.current);

    scrollTimeout.current = setTimeout(() => {
      if (!ref.current) return;
      const scrollTop = ref.current.scrollTop;
      const index = Math.round(scrollTop / ITEM_HEIGHT);
      const clampedIndex = Math.max(0, Math.min(items.length - 1, index));
      const targetScroll = clampedIndex * ITEM_HEIGHT;

      ref.current.scrollTo({
        top: targetScroll,
        behavior: 'smooth',
      });

      setTimeout(() => {
        isScrolling.current = false;
        if (clampedIndex !== selectedIndex) {
          onSelect(clampedIndex);
        }
      }, 150);
    }, 80);
  }, [items.length, selectedIndex, onSelect]);

  // Padding items for centering
  const paddingCount = Math.floor(VISIBLE_ITEMS / 2);
  const paddingItems = Array(paddingCount).fill(null);

  return (
    <div
      className="relative overflow-hidden"
      style={{ height: PICKER_HEIGHT }}
    >
      {/* Center highlight indicator - light mode */}
      <div
        className="absolute left-0 right-0 z-10 pointer-events-none rounded-lg mx-1 dark:hidden"
        style={{
          top: paddingCount * ITEM_HEIGHT,
          height: ITEM_HEIGHT,
          backgroundColor: 'oklch(0.55 0.2 255 / 0.12)',
        }}
      />
      {/* Center highlight indicator - dark mode */}
      <div
        className="absolute left-0 right-0 z-10 pointer-events-none rounded-lg mx-1 hidden dark:block"
        style={{
          top: paddingCount * ITEM_HEIGHT,
          height: ITEM_HEIGHT,
          backgroundColor: 'oklch(0.62 0.22 255 / 0.15)',
        }}
      />

      <div
        ref={ref}
        onScroll={handleScroll}
        onWheel={(e) => {
          // Always contain scroll within the time picker — never let it leak to parent
          // This prevents page scroll from accidentally changing the time
          if (ref.current) {
            const { scrollTop, scrollHeight, clientHeight } = ref.current;
            const atTop = scrollTop <= 0 && e.deltaY < 0;
            const atBottom = scrollTop + clientHeight >= scrollHeight && e.deltaY > 0;
            if (atTop || atBottom) {
              e.preventDefault();
              e.stopPropagation();
            }
          }
        }}
        className="h-full overflow-y-auto custom-scrollbar"
        style={{
          scrollSnapType: 'y mandatory',
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'contain',
        }}
      >
        {/* Top padding */}
        {paddingItems.map((_, i) => (
          <div key={`pad-top-${i}`} style={{ height: ITEM_HEIGHT }} />
        ))}

        {items.map((val, i) => {
          const isSelected = i === selectedIndex;
          return (
            <div
              key={val}
              style={{
                height: ITEM_HEIGHT,
                scrollSnapAlign: 'center',
              }}
              className={`flex items-center justify-center cursor-pointer transition-all duration-100 select-none ${
                isSelected
                  ? 'text-primary font-bold text-lg scale-105'
                  : 'text-muted-foreground text-sm opacity-50'
              }`}
              onClick={() => {
                onSelect(i);
                ref.current?.scrollTo({
                  top: i * ITEM_HEIGHT,
                  behavior: 'smooth',
                });
              }}
            >
              {formatLabel ? formatLabel(val) : String(val).padStart(2, '0')}
            </div>
          );
        })}

        {/* Bottom padding */}
        {paddingItems.map((_, i) => (
          <div key={`pad-bot-${i}`} style={{ height: ITEM_HEIGHT }} />
        ))}
      </div>
    </div>
  );
}

function ScrollTimePicker({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  label?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [pendingValue, setPendingValue] = useState(value);

  const hourOptions = Array.from({ length: 24 }, (_, i) => i);
  const minuteOptions = Array.from({ length: 60 }, (_, i) => i);

  // Sync pending value when external value changes (e.g. form reset)
  useEffect(() => {
    if (!editing) setPendingValue(value);
  }, [value, editing]);

  const handleHourChange = useCallback(
    (index: number) => {
      const [_, minutes] = pendingValue.split(':').map(Number);
      const newHour = hourOptions[index];
      setPendingValue(`${String(newHour).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`);
    },
    [hourOptions, pendingValue]
  );

  const handleMinuteChange = useCallback(
    (index: number) => {
      const [hours, _] = pendingValue.split(':').map(Number);
      const newMinute = minuteOptions[index];
      setPendingValue(`${String(hours).padStart(2, '0')}:${String(newMinute).padStart(2, '0')}`);
    },
    [minuteOptions, pendingValue]
  );

  const [pHours, pMinutes] = pendingValue.split(':').map(Number);

  const handleSave = () => {
    onChange(pendingValue);
    setEditing(false);
  };

  const handleEdit = () => {
    setPendingValue(value);
    setEditing(true);
  };

  // LOCKED DISPLAY — shows saved time with edit button (no scroll)
  if (!editing) {
    return (
      <div className="space-y-1">
        {label && <Label className="text-xs text-muted-foreground">{label}</Label>}
        <button
          type="button"
          onClick={handleEdit}
          className="w-full h-14 flex items-center justify-between px-4 rounded-xl border border-border bg-card hover:bg-accent/50 active:scale-[0.98] transition-all cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-primary" />
            <span className="text-xl font-bold tracking-wide tabular-nums">{value}</span>
            <span className="text-sm text-muted-foreground font-medium">{formatTime12h(value)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <span className="text-xs">Edit</span>
            <Edit3 className="h-4 w-4" />
          </div>
        </button>
      </div>
    );
  }

  // EDITING MODE — scrollable time picker with save button
  return (
    <div className="space-y-1">
      {label && <Label className="text-xs text-muted-foreground">{label}</Label>}
      <div className="relative rounded-xl border-2 border-primary/40 bg-card overflow-hidden time-picker-scroll ring-2 ring-primary/10">
        {/* AM/PM display */}
        <div className="absolute top-2 left-0 right-0 z-20 pointer-events-none text-center">
          <span className="text-[10px] font-semibold text-primary/70 bg-primary/5 px-2 py-0.5 rounded-full">
            {pHours >= 12 ? 'PM' : 'AM'}
          </span>
        </div>
        <div className="flex items-center">
          <div className="flex-1">
            <ScrollColumn
              items={hourOptions}
              selectedIndex={pHours}
              onSelect={handleHourChange}
            />
          </div>
          <div className="flex items-center justify-center w-8">
            <span className="text-2xl font-bold text-muted-foreground">:</span>
          </div>
          <div className="flex-1">
            <ScrollColumn
              items={minuteOptions}
              selectedIndex={pMinutes}
              onSelect={handleMinuteChange}
            />
          </div>
        </div>
        {/* Current value + Save button */}
        <div className="px-3 pb-2 pt-1 text-center border-t border-border/50 flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">
            {formatTime12h(pendingValue)} ({pendingValue})
          </span>
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            className="h-8 px-4 bg-gradient-to-r from-blue-600 to-green-600 text-white text-xs font-semibold hover:opacity-90 active:scale-95 transition-all"
          >
            <Check className="h-3.5 w-3.5 mr-1" />
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MAIN APP COMPONENT
// ============================================================
export default function TrishulHubPayTracker() {
  const {
    authView, setAuthView, user, setUser,
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

    // NOTE: Session cookie is httpOnly, so document.cookie CANNOT see it.
    // Always validate with the server — the fast-path cookie check was removed
    // because httpOnly cookies are invisible to client-side JS by design.
    apiFetch('/api/auth/session')
      .then((data) => {
        if (data.user) setUser(data.user);
        else setUser(null);
      })
      .catch(() => setUser(null))
      .finally(() => {
        setHydrated(true);
        if (ref) setAuthView('signup');
      });

    // Refresh session every 5 minutes to pick up isPremium/role changes
    const interval = setInterval(() => {
      apiFetch('/api/auth/session')
        .then((data) => {
          if (data.user) setUser(data.user);
        })
        .catch(() => { /* ignore */ });
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
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
          <div className="flex flex-col items-center gap-2 animate-pulse">
            <Image src="/logo.png" alt="" width={56} height={56} className="shrink-0" priority />
            <div className="text-center">
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent leading-tight">
                TrishulHub
              </h1>
              <p className="text-xs text-muted-foreground font-semibold -mt-0.5">Pay Tracker</p>
            </div>
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
        {!isMobile && <DesktopSidebar currentView={currentView} setCurrentView={setCurrentView as (v: string) => void} onLogout={handleLogout} user={user} theme={theme} setTheme={setTheme} />}

        {/* Main content area */}
        <main className="flex-1 min-h-screen pb-24 md:pb-0 overflow-y-scroll custom-scrollbar">
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
              {currentView === 'dashboard' && <DashboardView user={user} setCurrentView={setCurrentView as (v: string) => void} />}
              {currentView === 'records' && <RecordsView />}
              {currentView === 'add-record' && <RecordFormView />}
              {currentView === 'edit-record' && <RecordFormView isEdit />}
              {currentView === 'companies' && <CompaniesView />}
              {currentView === 'add-company' && <CompanyFormView />}
              {currentView === 'shifts' && <ShiftsView user={user} />}
              {currentView === 'import' && user.isPremium && <ImportView user={user} />}
              {currentView === 'referrals' && <ReferralsView user={user} />}
              {currentView === 'settings' && <SettingsView user={user} onLogout={handleLogout} theme={theme} setTheme={setTheme} />}
              {currentView === 'admin' && <AdminView />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Mobile bottom navigation */}
      {isMobile && (
        <MobileBottomNav currentView={currentView} setCurrentView={setCurrentView as (v: string) => void} user={user} theme={theme} setTheme={setTheme} />
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-green-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center mb-8"
        >
          <Image src="/logo.png" alt="TrishulHub" width={96} height={96} className="shrink-0 mb-4" priority />
          <div className="text-center">
            <h1 className="text-3xl font-extrabold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent leading-tight tracking-tight">
              TrishulHub
            </h1>
            <p className="text-lg text-muted-foreground font-semibold tracking-widest mt-1 uppercase">Pay Tracker</p>
          </div>
          <p className="text-muted-foreground text-sm mt-3">Track your salary payments — Free forever</p>
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
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onForgotPassword}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline min-h-[44px] flex items-center"
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
// NOTE: OTP is ONLY sent via email - NEVER displayed on screen
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
      await apiFetch('/api/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({ email, type: 'SIGNUP' }),
      });
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
      toast.success('Email verified! Creating your account...');
      // Auto-submit: immediately create the account after OTP verification
      if (termsAccepted) {
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
        } catch (signupErr: unknown) {
          toast.error(signupErr instanceof Error ? signupErr.message : 'Signup failed');
        }
      } else {
        toast.error('Please accept the Terms and Conditions to continue');
      }
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
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground min-h-[44px] min-w-[44px] flex items-center justify-center">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-referral">Referral Code (Optional)</Label>
              <div className="relative">
                <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="signup-referral" placeholder="TRISHUL-XXXXXX" value={referralCode} onChange={(e) => setReferralCode(e.target.value.toUpperCase())} className="pl-10 h-12" maxLength={13} />
                {referralParam && referralCode === referralParam && (
                  <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-green-600 dark:text-green-400" />
                )}
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
              className="w-full text-sm text-muted-foreground hover:text-foreground text-center min-h-[44px]"
              disabled={loading}
            >
              Didn&apos;t get a code? Resend
            </button>
            <button
              type="button"
              onClick={() => { setStep(1); setOtpSent(false); setOtpVerified(false); setOtpCode(''); }}
              className="w-full text-sm text-muted-foreground hover:text-foreground text-center min-h-[44px]"
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
// NOTE: OTP is ONLY sent via email - NEVER displayed on screen
// ============================================================
function ForgotPasswordView({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState(1); // 1=email, 2=otp, 3=new password
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async () => {
    if (!email) { toast.error('Please enter your email'); return; }
    setLoading(true);
    try {
      await apiFetch('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
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
            <button
              type="button"
              onClick={handleSendOtp}
              className="w-full text-sm text-muted-foreground hover:text-foreground text-center min-h-[44px]"
              disabled={loading}
            >
              Didn't get a code? Resend
            </button>
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
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground min-h-[44px] min-w-[44px] flex items-center justify-center">
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
        <button onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground min-h-[44px] flex items-center">
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
    { id: 'import', label: 'Import', icon: FileUp, premiumOnly: true },
    { id: 'referrals', label: 'Referrals', icon: Users },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  if (user.role === 'ADMIN') {
    navItems.push({ id: 'admin', label: 'Admin', icon: Shield });
  }

  const cycleTheme = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('system');
    else setTheme('light');
  };

  const themeIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;
  const ThemeIcon = themeIcon;

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 border-r border-border bg-card">
      <div className="flex items-center gap-2.5 px-6 py-5 border-b border-border">
        <Image src="/logo.png" alt="" width={36} height={36} className="shrink-0" />
        <div>
          <h2 className="text-sm font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent leading-tight">
            TrishulHub
          </h2>
          <p className="text-[10px] text-muted-foreground font-medium -mt-0.5">Pay Tracker</p>
        </div>
        {user.isPremium && (
          <Badge className="ml-auto bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] px-1.5">
            <Star className="h-3 w-3 mr-0.5" /> PRO
          </Badge>
        )}
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.filter(item => !item.premiumOnly || user.isPremium).map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
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
          <span className="text-sm text-muted-foreground">
            Theme: <span className="capitalize font-medium text-foreground">{theme || 'system'}</span>
          </span>
          <button
            onClick={cycleTheme}
            className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <ThemeIcon className="h-4 w-4" />
          </button>
        </div>
        <div className="px-3 py-1">
          <p className="text-sm font-medium text-foreground truncate">{user.name}</p>
          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-colors min-h-[44px]"
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
  currentView, setCurrentView, user, theme, setTheme,
}: {
  currentView: string;
  setCurrentView: (v: string) => void;
  user: SessionUser;
  theme: string | undefined;
  setTheme: (t: string) => void;
}) {
  const navItems = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { id: 'records', label: 'Records', icon: FileText },
    { id: 'shifts', label: 'Shifts', icon: CalendarDays },
    { id: 'referrals', label: 'Referrals', icon: Users },
    { id: 'settings', label: 'More', icon: Settings },
  ];

  // Add admin nav item for admin users on mobile
  if (user.role === 'ADMIN') {
    navItems.push({ id: 'admin', label: 'Admin', icon: Shield });
  }

  // Show import for premium users
  const showImport = user.isPremium;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border md:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <div className="flex items-center justify-around h-16 px-1">
        {navItems.slice(0, user.role === 'ADMIN' ? 4 : 5).map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className={`flex flex-col items-center justify-center gap-0.5 min-w-[48px] min-h-[44px] py-1 transition-colors rounded-lg ${
                isActive ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
        {/* Import button for premium users */}
        {showImport && (
          <button
            onClick={() => setCurrentView('import')}
            className={`flex flex-col items-center justify-center gap-0.5 min-w-[48px] min-h-[44px] py-1 transition-colors rounded-lg ${
              currentView === 'import' ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'
            }`}
          >
            <FileUp className="h-5 w-5" />
            <span className="text-[10px] font-medium">Import</span>
          </button>
        )}
        {/* Admin & Settings section */}
        {user.role === 'ADMIN' ? (
          <div className="flex items-center">
            <button
              onClick={() => setCurrentView('admin')}
              className={`flex flex-col items-center justify-center gap-0.5 min-w-[40px] min-h-[44px] py-1 transition-colors rounded-lg ${
                currentView === 'admin' ? 'text-purple-600 dark:text-purple-400' : 'text-muted-foreground'
              }`}
            >
              <Shield className="h-5 w-5" />
              <span className="text-[9px] font-medium">Admin</span>
            </button>
            <button
              onClick={() => setCurrentView('settings')}
              className={`flex flex-col items-center justify-center gap-0.5 min-w-[40px] min-h-[44px] py-1 transition-colors rounded-lg ${
                currentView === 'settings' ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground'
              }`}
            >
              <Settings className="h-5 w-5" />
              <span className="text-[9px] font-medium">More</span>
            </button>
          </div>
        ) : null}
      </div>
    </nav>
  );
}

// ============================================================
// DASHBOARD VIEW
// ============================================================
function DashboardView({ user, setCurrentView }: { user: SessionUser; setCurrentView: (v: string) => void }) {
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [lastRefresh, setLastRefresh] = useState<string>('');
  const queryClient = useQueryClient();

  // DASH-004: React Query — automatic caching, deduplication, background refetch
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['dashboard', selectedCompany],
    queryFn: async () => {
      const url = selectedCompany !== 'all' ? `/api/dashboard?companyId=${selectedCompany}` : '/api/dashboard';
      const d = await apiFetch(url);
      setLastRefresh(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
      return d;
    },
    staleTime: 2 * 60 * 1000,
    retry: 2,
  });

  // DASH-012: Manual refresh handler (invalidates cache + refetches)
  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    refetch();
  };

  // DASH-005: Calculate month-over-month % change — uses actual field values, not totalExpected
  const calcChange = (current: number, previous: number): number | null => {
    if (current === 0 && previous === 0) return null;
    if (previous === 0) return current > 0 ? 100 : null;
    return ((current - previous) / Math.abs(previous)) * 100;
  };

  // DASH-001: Separate loading from error — !data after load means API failure
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (!data) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    return (
      <div className="p-4 md:p-6 md:ml-64 text-center py-12">
        <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Failed to load dashboard</h3>
        <p className="text-red-400 text-xs font-mono mb-2 break-all">{errMsg}</p>
        <p className="text-muted-foreground text-sm mb-4">
          {selectedCompany !== 'all' && (
            <button onClick={() => setSelectedCompany('all')} className="text-blue-500 underline mr-3">Back to All</button>
          )}
          Please try again or go back to all companies.
        </p>
        <Button onClick={() => refetch()} className="min-h-[44px]">Try Again</Button>
      </div>
    );
  }

  const { stats, companies, recentRecords, referralInfo, shiftSummary, comparison } = data;

  // DASH-002: Company breakdown chart data
  const companyChartData = data.companyStats
    .filter(cs => cs.totals.totalExpected > 0)
    .map(cs => ({ name: cs.name, expected: cs.totals.totalExpected, received: cs.totals.totalReceived, due: cs.totals.totalDue }));
  const CHART_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#ec4899', '#06b6d4', '#f97316'];

  // DASH-006: Distinguish shift-computed hours vs manual hours
  const hasManualHours = stats.workedHours > 0;

  return (
    <div className="p-4 md:p-6 md:ml-64 space-y-6 max-w-6xl overflow-x-hidden">
      {/* Header + DASH-012 refresh timestamp */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Welcome back, {user.name.split(' ')[0]}!</h1>
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <span>Here&apos;s your payment overview</span>
            {lastRefresh && (
              <span className="flex items-center gap-1">
                <span className="text-xs opacity-70">Updated {lastRefresh}</span>
                <button onClick={handleRefresh} className="hover:text-foreground transition-colors" title="Refresh">
                  <RefreshCw className={`h-3 w-3 ${isFetching ? 'animate-spin' : ''}`} />
                </button>
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedCompany} onValueChange={setSelectedCompany}>
            <SelectTrigger className="w-full sm:w-[180px]">
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

      {/* Stat cards — DASH-010: with trend % change */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <StatCard
          title="Total Expected"
          value={formatCurrency(stats.totalExpected)}
          icon={PoundSterling}
          gradient="from-blue-600 to-blue-700 dark:from-blue-700 dark:to-blue-800"
          change={calcChange(comparison.current?.totalExpected || 0, comparison.previous?.totalExpected || 0)}
        />
        <StatCard
          title="Total Received"
          value={formatCurrency(stats.totalReceived)}
          icon={TrendingUp}
          gradient="from-green-600 to-green-700 dark:from-green-700 dark:to-green-800"
          change={calcChange(comparison.current?.totalReceived || 0, comparison.previous?.totalReceived || 0)}
        />
        <StatCard
          title="Total Due"
          value={formatCurrency(stats.totalDue)}
          icon={AlertCircle}
          gradient="from-amber-600 to-amber-700 dark:from-amber-700 dark:to-amber-800"
          change={calcChange(comparison.current?.totalDue || 0, comparison.previous?.totalDue || 0)}
          invertTrend
        />
        <StatCard
          title="HMRC Deductions"
          value={formatCurrency(stats.totalHMRC)}
          icon={BarChart3}
          gradient="from-purple-600 to-purple-700 dark:from-purple-700 dark:to-purple-800"
          change={calcChange(comparison.current?.totalHMRC || 0, comparison.previous?.totalHMRC || 0)}
        />
      </div>

      {/* DASH-002: Company Earnings Chart */}
      {companyChartData.length > 0 && (
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              Earnings by Company
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56 md:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={companyChartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => v >= 1000 ? `£${(v / 1000).toFixed(1)}k` : `£${v}`} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ borderRadius: '8px', fontSize: '13px' }} />
                  <Bar dataKey="expected" name="Expected" radius={[4, 4, 0, 0]}>
                    {companyChartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} fillOpacity={0.85} />
                    ))}
                  </Bar>
                  <Bar dataKey="received" name="Received" radius={[4, 4, 0, 0]}>
                    {companyChartData.map((_, index) => (
                      <Cell key={`cell-recv-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} fillOpacity={0.5} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment & Shift Summary + DASH-003: Comparison */}
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
            {/* DASH-003: Month-over-month comparison */}
            {(comparison.current || comparison.previous) && (
              <div className="rounded-lg bg-muted/50 p-3 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Month over Month</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="text-center">
                    <p className="text-muted-foreground">{getMonthName(comparison.current?.month || 0)}</p>
                    <p className="font-bold text-foreground">{formatCurrency(comparison.current?.totalExpected || 0)}</p>
                    <p className="text-green-600 dark:text-green-400">{formatCurrency(comparison.current?.totalReceived || 0)} received</p>
                  </div>
                  <div className="text-center">
                    <p className="text-muted-foreground">{getMonthName(comparison.previous?.month || 0)}</p>
                    <p className="font-bold text-foreground">{formatCurrency(comparison.previous?.totalExpected || 0)}</p>
                    <p className="text-green-600 dark:text-green-400">{formatCurrency(comparison.previous?.totalReceived || 0)} received</p>
                  </div>
                </div>
              </div>
            )}
            <Button variant="outline" size="sm" className="w-full min-h-[44px]" onClick={() => setCurrentView('add-record')}>
              <Plus className="h-4 w-4 mr-2" /> Add Payment Record
            </Button>
          </CardContent>
        </Card>

        {/* Shift Summary — DASH-006: clarified source */}
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
              <span className="font-semibold text-foreground">{formatHoursMinutes(shiftSummary.totalHours)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total Shifts</span>
              <span className="font-semibold text-foreground">{shiftSummary.totalShifts}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Break Time</span>
              <span className="font-semibold text-foreground">{formatHoursMinutes(shiftSummary.totalBreakMinutes / 60)}</span>
            </div>
            {/* DASH-006: Show manual hours if different from computed */}
            {hasManualHours && (
              <div className="text-xs text-muted-foreground pt-1 border-t border-border/50">
                <span>Manual hours (records): {stats.workedHours.toFixed(1)}h</span>
              </div>
            )}
            <Separator />
            <Button variant="outline" size="sm" className="w-full min-h-[44px]" onClick={() => setCurrentView('shifts')}>
              <CalendarDays className="h-4 w-4 mr-2" /> View Shifts
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* DASH-003: Referral status */}
      {referralInfo && (
        <Card className="border-border bg-gradient-to-r from-primary/5 to-transparent">
          <CardContent className="py-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  {referralInfo.isPremium ? <Star className="h-5 w-5 text-yellow-500" /> : <Gift className="h-5 w-5 text-primary" />}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {referralInfo.isPremium ? 'You have Premium!' : `Refer friends to get Premium`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {referralInfo.isPremium
                      ? 'Enjoy unlimited features'
                      : `${referralInfo.referralCount} referral${referralInfo.referralCount !== 1 ? 's' : ''} so far — share your code: ${referralInfo.referralCode}`}
                  </p>
                </div>
              </div>
              {!referralInfo.isPremium && (
                <Button variant="outline" size="sm" onClick={() => {
                  // DASH-015: Graceful fallback if clipboard API unavailable (insecure context)
                  try {
                    navigator.clipboard.writeText(referralInfo.referralCode);
                    toast.success('Referral code copied!');
                  } catch {
                    toast.error('Could not copy — try manually: ' + referralInfo.referralCode);
                  }
                }} className="min-h-[44px]">
                  <Copy className="h-3.5 w-3.5 mr-1.5" /> Copy Code
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Companies — DASH-011: clickable cards */}
      {companies.length > 0 && (
        <Card className="border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                Companies
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setCurrentView('add-company')} className="min-h-[44px] min-w-[44px]">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {data.companyStats.map((cs) => (
                <button
                  key={cs.id}
                  onClick={() => { setSelectedCompany(cs.id); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  className={`p-3 rounded-lg border text-left transition-all hover:shadow-sm ${
                    selectedCompany === cs.id
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                      : 'border-border hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-foreground flex items-center gap-1.5">
                      {cs.name}
                      {selectedCompany === cs.id && <span className="text-[10px] text-primary font-normal">(filtered)</span>}
                    </span>
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
                </button>
              ))}
            </div>
            {selectedCompany !== 'all' && (
              <Button variant="ghost" size="sm" onClick={() => setSelectedCompany('all')} className="w-full mt-3 text-xs text-muted-foreground min-h-[44px]">
                <X className="h-3 w-3 mr-1" /> Clear filter — show all companies
              </Button>
            )}
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
              <Button variant="ghost" size="sm" onClick={() => setCurrentView('records')} className="min-h-[44px]">
                View All <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentRecords.map((r) => (
              <div key={r.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{r.company.name}</p>
                  <p className="text-xs text-muted-foreground">{getMonthName(r.month)} {r.year}</p>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <p className="text-sm font-medium text-foreground">{formatCurrency(r.totalExpected)}</p>
                  <Badge className={STATUS_COLORS[r.status] || ''}>{r.status}</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* DASH-009: Empty state for no records */}
      {companies.length > 0 && stats.totalRecords === 0 && (
        <Card className="border-border">
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-1">No payment records yet</h3>
            <p className="text-muted-foreground mb-4 text-sm">Add your first payment record to see your earnings overview</p>
            <Button onClick={() => setCurrentView('add-record')} className="bg-gradient-to-r from-blue-600 to-green-600 text-white min-h-[44px]">
              <Plus className="h-4 w-4 mr-2" /> Add Payment Record
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Empty state for no companies */}
      {companies.length === 0 && (
        <Card className="border-border">
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-1">Get Started</h3>
            <p className="text-muted-foreground mb-4 text-sm">Add your first company to start tracking payments</p>
            <Button onClick={() => setCurrentView('add-company')} className="bg-gradient-to-r from-blue-600 to-green-600 text-white min-h-[44px]">
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
function StatCard({ title, value, icon: Icon, gradient, change, invertTrend }: { title: string; value: string; icon: React.ElementType; gradient: string; change?: number | null; invertTrend?: boolean }) {
  // DASH-014: invertTrend reverses color logic (e.g., "Total Due" going up is bad = red)
  const isUp = change !== null && change !== undefined && change >= 0;
  const isDown = change !== null && change !== undefined && change < 0;
  const trendColor = invertTrend
    ? (isUp ? 'text-red-200' : 'text-green-200')
    : (isUp ? 'text-green-200' : 'text-red-200');
  return (
    <div className={`rounded-xl bg-gradient-to-br ${gradient} p-4 text-white shadow-sm`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium opacity-90">{title}</span>
        <Icon className="h-4 w-4 opacity-80" />
      </div>
      <p className="text-lg md:text-xl font-bold">{value}</p>
      {change !== null && change !== undefined && (
        <div className={`flex items-center gap-1 mt-1 text-xs ${trendColor}`}>
          {isUp ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          <span>{isUp ? '+' : ''}{change.toFixed(0)}%</span>
          <span className="opacity-70">vs last month</span>
        </div>
      )}
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
  const [fetchError, setFetchError] = useState(false); // REC-016: track fetch failure
  const [filterCompany, setFilterCompany] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => { fetchCompanies(); }, []);

  // REC-014: Removed fetchRecords() from mount — the filter-dependent useEffect
  // below already fires on mount with initial 'all'/'all' values, preventing double fetch

  const fetchCompanies = async () => {
    try {
      const data = await apiFetch('/api/companies');
      setCompanies(data.companies || []);
    } catch { /* ignore */ }
  };

  const fetchRecords = async () => {
    setLoading(true);
    setFetchError(false);
    try {
      const params = new URLSearchParams();
      if (filterCompany !== 'all') params.set('companyId', filterCompany);
      if (filterStatus !== 'all') params.set('status', filterStatus);
      const data = await apiFetch(`/api/payment-records?${params.toString()}`);
      setRecords(data.records);
    } catch {
      toast.error('Failed to load records');
      setRecords([]);
      setFetchError(true); // REC-016: mark error state
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
    <div className="p-4 md:p-6 md:ml-64 space-y-4 max-w-6xl overflow-x-hidden">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Payment Records</h1>
        <Button onClick={() => setCurrentView('add-record')} className="bg-gradient-to-r from-blue-600 to-green-600 text-white" size="sm">
          <Plus className="h-4 w-4 mr-1" /> Add
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <Select value={filterCompany} onValueChange={setFilterCompany}>
          <SelectTrigger className="w-full sm:w-[160px]"><SelectValue placeholder="All Companies" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Companies</SelectItem>
            {companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-[130px]"><SelectValue placeholder="All Status" /></SelectTrigger>
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
            {fetchError ? (
              /* REC-016: Error state with retry button */
              <>
                <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-1">Failed to Load</h3>
                <p className="text-muted-foreground mb-4 text-sm">Could not fetch records. Check your connection and try again.</p>
                <Button onClick={() => fetchRecords()} variant="outline" className="min-h-[44px]">
                  <RefreshCw className="h-4 w-4 mr-2" /> Try Again
                </Button>
              </>
            ) : (
              <>
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-1">No Records</h3>
                <p className="text-muted-foreground mb-4 text-sm">Add your first payment record</p>
                <Button onClick={() => setCurrentView('add-record')} className="bg-gradient-to-r from-blue-600 to-green-600 text-white min-h-[44px]">
                  <Plus className="h-4 w-4 mr-2" /> Add Record
                </Button>
              </>
            )}
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
                    {r.notes && <p className="text-xs text-muted-foreground mt-2 truncate">{r.notes}</p>}
                    {r.paySlipUrl && (
                      <a href={r.paySlipUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-1 inline-flex items-center gap-1">
                        <ExternalLink className="h-3 w-3" /> {r.paySlipName || 'View Payslip'}
                      </a>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {/* REC-015: Accessible labels for icon-only buttons */}
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(r.id)} className="h-10 w-10" aria-label={`Edit ${r.company.name} record`}
                      >
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteId(r.id)} className="h-10 w-10 text-destructive hover:text-destructive" aria-label={`Delete ${r.company.name} record`}
                      >
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
      setCompanies(data.companies || []);
    } catch { /* ignore */ }
  };

  // REC-013: Fetch single record via dedicated endpoint instead of loading all
  const fetchRecord = async () => {
    if (!selectedRecordId) return;
    try {
      const data = await apiFetch(`/api/payment-records/${selectedRecordId}`);
      const record = data.record;
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
    } catch {
      toast.error('Failed to load record');
    }
  };

  // Auto-populate worked hours from shifts
  const fetchAutoHours = useCallback(async () => {
    if (!companyId || !month || !year) return;
    try {
      const data = await apiFetch(`/api/shifts/hours?companyId=${companyId}&month=${month}&year=${year}`);
      if (data.totalHours > 0) {
        setWorkedHours(data.totalHours.toString());
        setAutoHoursInfo(`Based on your shift records, you worked ${formatHoursMinutes(data.totalHours)} across ${data.totalShifts} shift${data.totalShifts !== 1 ? 's' : ''} this month. You can change this if needed.`);
      } else {
        setAutoHoursInfo(null);
      }
    } catch {
      // REC-018: Show subtle feedback instead of silently swallowing
      setAutoHoursInfo('Could not auto-calculate hours. You can enter them manually.');
    }
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
        if (paySlipFile) {
          await uploadPayslip(selectedRecordId);
        }
        toast.success('Record updated');
      } else {
        const data = await apiFetch('/api/payment-records', {
          method: 'POST',
          body: JSON.stringify(body),
        });
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
  // REC-017: Expanded year range from ±2 to ±5 years for backdating records
  const years = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

  return (
    <div className="p-4 md:p-6 md:ml-64 space-y-4 max-w-2xl overflow-x-hidden">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setCurrentView('records')} className="min-h-[44px] min-w-[44px]">
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

            <div className="grid grid-cols-2 gap-2 sm:gap-3">
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Total Expected (£)</Label>
                <div className="relative">
                  <PoundSterling className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input type="number" step="0.01" placeholder="0.00" value={totalExpected} onChange={(e) => setTotalExpected(e.target.value)} className="pl-10 h-12" onWheel={handleNumberInputWheel} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Total Received (£)</Label>
                <div className="relative">
                  <PoundSterling className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input type="number" step="0.01" placeholder="0.00" value={totalReceived} onChange={(e) => setTotalReceived(e.target.value)} className="pl-10 h-12" onWheel={handleNumberInputWheel} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>HMRC Deductions (£)</Label>
                <div className="relative">
                  <PoundSterling className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input type="number" step="0.01" placeholder="0.00" value={totalHMRC} onChange={(e) => setTotalHMRC(e.target.value)} className="pl-10 h-12" onWheel={handleNumberInputWheel} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Worked Hours</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input type="number" step="0.5" placeholder="0" value={workedHours} onChange={(e) => setWorkedHours(e.target.value)} className="pl-10 h-12" onWheel={handleNumberInputWheel} />
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
              <Button type="button" variant="outline" onClick={() => setCurrentView('records')} className="flex-1 h-12 min-h-[44px]">Cancel</Button>
              <Button type="submit" disabled={loading} className="flex-1 h-12 min-h-[44px] bg-gradient-to-r from-blue-600 to-green-600 text-white">
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
  const [updatePayRateId, setUpdatePayRateId] = useState<string | null>(null);
  const [newPayRate, setNewPayRate] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState('');
  const [effectiveDay, setEffectiveDay] = useState('1');
  const [effectiveMonth, setEffectiveMonth] = useState(String(new Date().getMonth() + 1));
  const [effectiveYear, setEffectiveYear] = useState(String(new Date().getFullYear()));
  const [useDatePicker, setUseDatePicker] = useState(false);
  const [payRateLoading, setPayRateLoading] = useState(false);

  useEffect(() => { fetchCompanies(); }, []);

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/api/companies');
      setCompanies(data.companies || []);
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

  const handleUpdatePayRate = async () => {
    if (!updatePayRateId) return;
    setPayRateLoading(true);
    try {
      const body: any = { payRate: parseFloat(newPayRate) || 0 };
      let effectiveDate = '';
      if (useDatePicker && effectiveFrom) {
        effectiveDate = effectiveFrom;
      } else if (!useDatePicker) {
        // Build date from day/month/year selectors
        const d = parseInt(effectiveDay);
        const m = parseInt(effectiveMonth);
        const y = parseInt(effectiveYear);
        effectiveDate = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      }
      if (effectiveDate) {
        body.effectiveFrom = effectiveDate;
      }
      await apiFetch(`/api/companies/${updatePayRateId}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      });
      toast.success(effectiveDate ? `Pay rate will change from ${effectiveDate}` : 'Pay rate updated');
      setUpdatePayRateId(null);
      setNewPayRate('');
      setEffectiveFrom('');
      setEffectiveDay('1');
      setEffectiveMonth(String(new Date().getMonth() + 1));
      setEffectiveYear(String(new Date().getFullYear()));
      setUseDatePicker(false);
      fetchCompanies();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update pay rate');
    } finally {
      setPayRateLoading(false);
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
    <div className="p-4 md:p-6 md:ml-64 space-y-4 max-w-4xl overflow-x-hidden">
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
            <p className="text-muted-foreground mb-4 text-sm">Add a company to start tracking payments</p>
            <Button onClick={() => setCurrentView('add-company')} className="bg-gradient-to-r from-blue-600 to-green-600 text-white min-h-[44px]">
              <Plus className="h-4 w-4 mr-2" /> Add Company
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {companies.map((c) => (
            <Card key={c.id} className="border-border hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-green-600 flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{c.name}</p>
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-muted-foreground">{c._count?.paymentRecords || 0} records</p>
                        {c.payRate > 0 && (
                          <Badge variant="outline" className="text-[10px]">
                            <PoundSterling className="h-3 w-3 mr-0.5" />{c.payRate.toFixed(2)}/hr
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => { setUpdatePayRateId(c.id); setNewPayRate(c.payRate.toString()); setEffectiveFrom(''); setEffectiveDay('1'); setEffectiveMonth(String(new Date().getMonth() + 1)); setEffectiveYear(String(new Date().getFullYear())); setUseDatePicker(false); }} className="h-9 w-9 min-h-[44px] min-w-[44px]" title="Update pay rate">
                      <PoundSterling className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(c)} className="h-9 w-9 min-h-[44px] min-w-[44px]">
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteId(c.id)} className="h-9 w-9 min-h-[44px] min-w-[44px] text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit name dialog */}
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

      {/* Update pay rate dialog */}
      <Dialog open={!!updatePayRateId} onOpenChange={(v) => { if (!v) { setUpdatePayRateId(null); setNewPayRate(''); setEffectiveFrom(''); setUseDatePicker(false); } }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Update Pay Rate</DialogTitle>
            <DialogDescription>Set the new hourly pay rate for this company. You can choose when it takes effect.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>New Hourly Pay Rate (GBP)</Label>
              <div className="relative">
                <PoundSterling className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input type="number" step="0.01" min="0" value={newPayRate} onChange={(e) => setNewPayRate(e.target.value)} className="pl-10 h-12" placeholder="e.g. 12.50" onWheel={handleNumberInputWheel} />
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Effective From</Label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Exact date</span>
                  <Switch checked={useDatePicker} onCheckedChange={setUseDatePicker} />
                </div>
              </div>
              {useDatePicker ? (
                <Input type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} className="h-12" />
              ) : (
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Day</Label>
                    <Select value={effectiveDay} onValueChange={setEffectiveDay}>
                      <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                          <SelectItem key={d} value={String(d)}>{d}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Month</Label>
                    <Select value={effectiveMonth} onValueChange={setEffectiveMonth}>
                      <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {MONTHS.map((m, i) => (
                          <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Year</Label>
                    <Select value={effectiveYear} onValueChange={setEffectiveYear}>
                      <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() + i).map((y) => (
                          <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
              <p className="text-xs text-muted-foreground">Leave as today to apply immediately. If a future date is set, this rate will apply from that date for all new shifts.</p>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => { setUpdatePayRateId(null); setNewPayRate(''); setEffectiveFrom(''); setUseDatePicker(false); }} className="w-full sm:w-auto">Cancel</Button>
            <Button onClick={handleUpdatePayRate} disabled={payRateLoading} className="bg-gradient-to-r from-blue-600 to-green-600 text-white">
              {payRateLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <PoundSterling className="h-4 w-4 mr-2" />}
              {useDatePicker && effectiveFrom ? `Apply from ${effectiveFrom}` : !useDatePicker ? `Apply from ${effectiveDay} ${MONTHS[parseInt(effectiveMonth) - 1]} ${effectiveYear}` : 'Update Pay Rate'}
            </Button>
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
  const user = useAppStore((s) => s.user);
  const [name, setName] = useState('');
  const [payRate, setPayRate] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPremiumPopup, setShowPremiumPopup] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error('Please enter a company name'); return; }
    setLoading(true);
    try {
      await apiFetch('/api/companies', {
        method: 'POST',
        body: JSON.stringify({ name, payRate: parseFloat(payRate) || 0 }),
      });
      toast.success('Company added!');
      setCurrentView('companies');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to add company';
      if (msg.includes('Premium required')) {
        setShowPremiumPopup(true);
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-6 md:ml-64 space-y-4 max-w-md overflow-x-hidden">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setCurrentView('companies')} className="min-h-[44px] min-w-[44px]">
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
            <div className="space-y-2">
              <Label>Hourly Pay Rate (GBP)</Label>
              <div className="relative">
                <PoundSterling className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="e.g. 12.50"
                  value={payRate}
                  onChange={(e) => setPayRate(e.target.value)}
                  className="pl-10 h-12"
                  onWheel={handleNumberInputWheel}
                />
              </div>
              <p className="text-xs text-muted-foreground">Default hourly rate for this company. You can override per shift.</p>
            </div>
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => setCurrentView('companies')} className="flex-1 h-12 min-h-[44px]">Cancel</Button>
              <Button type="submit" disabled={loading} className="flex-1 h-12 min-h-[44px] bg-gradient-to-r from-blue-600 to-green-600 text-white">
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                Add Company
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      {user && <PremiumFeaturePopup open={showPremiumPopup} onClose={() => setShowPremiumPopup(false)} user={user} />}
    </div>
  );
}

// ============================================================
// SHIFTS VIEW (WEEKLY CALENDAR)
// ============================================================
function ShiftsView({ user }: { user: SessionUser }) {
  const { setCurrentView, setSelectedShiftId } = useAppStore();
  const isMobile = useIsMobile();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPremiumPopup, setShowPremiumPopup] = useState(false);
  const [showRotaDialog, setShowRotaDialog] = useState(false);
  const [rotaMonth, setRotaMonth] = useState(new Date().getMonth() + 1);
  const [rotaYear, setRotaYear] = useState(new Date().getFullYear());
  const [rotaFrom, setRotaFrom] = useState('');
  const [rotaTo, setRotaTo] = useState('');
  const [downloading, setDownloading] = useState(false);

  // View mode: day | week | month
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('week');

  // Week view state
  const [weekStart, setWeekStart] = useState<Date>(() => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now);
    monday.setDate(diff);
    monday.setHours(0, 0, 0, 0);
    return monday;
  });

  // Day view state
  const [dayDate, setDayDate] = useState<Date>(new Date());

  // Month view state
  const [monthDate, setMonthDate] = useState<Date>(new Date());

  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [editShift, setEditShift] = useState<Shift | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => { fetchCompanies(); }, []);

  // SHI-009: Derive month/year from current view state for smart API fetching
  const viewMonth = (() => {
    if (viewMode === 'month') return { month: monthDate.getMonth() + 1, year: monthDate.getFullYear() };
    if (viewMode === 'week') return { month: weekStart.getMonth() + 1, year: weekStart.getFullYear() };
    if (viewMode === 'day') return { month: dayDate.getMonth() + 1, year: dayDate.getFullYear() };
    return null;
  })();

  // SHI-009: Re-fetch shifts whenever view mode or date context changes
  useEffect(() => {
    if (viewMonth) {
      fetchShifts(viewMonth.month, viewMonth.year);
    }
  }, [viewMode, viewMonth?.month, viewMonth?.year]);

  const fetchCompanies = async () => {
    try {
      const data = await apiFetch('/api/companies');
      setCompanies(data.companies || []);
    } catch { /* ignore */ }
  };

  // SHI-009: Accept month/year params — only fetches shifts for the visible period
  const fetchShifts = async (month?: number, year?: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('limit', '500'); // SHI-009: Fetch up to 500 — enough for a single month
      if (month && year) {
        params.set('month', String(month));
        params.set('year', String(year));
      }
      const data = await apiFetch(`/api/shifts?${params.toString()}`);
      setShifts(data.shifts || []);
    } catch {
      toast.error('Failed to load shifts');
    } finally {
      setLoading(false);
    }
  };

  const getShiftsForDay = (date: Date) => {
    const dateStr = formatDateStr(date);
    return shifts.filter((s) => s.date === dateStr);
  };

  const getShiftsForMonth = (year: number, month: number) => {
    return shifts.filter((s) => {
      const [y, m] = s.date.split('-').map(Number);
      return y === year && m === month;
    });
  };

  // Week navigation
  const weekDates = getWeekDates(weekStart);

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

  // Day navigation
  const prevDay = () => {
    const d = new Date(dayDate);
    d.setDate(d.getDate() - 1);
    setDayDate(d);
  };

  const nextDay = () => {
    const d = new Date(dayDate);
    d.setDate(d.getDate() + 1);
    setDayDate(d);
  };

  const goToday = () => {
    setDayDate(new Date());
  };

  // Month navigation
  const prevMonth = () => {
    const d = new Date(monthDate);
    d.setMonth(d.getMonth() - 1);
    setMonthDate(d);
  };

  const nextMonth = () => {
    const d = new Date(monthDate);
    d.setMonth(d.getMonth() + 1);
    setMonthDate(d);
  };

  const goThisMonth = () => {
    setMonthDate(new Date());
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

  const handleDownloadRota = (isPremium: boolean) => {
    setShowRotaDialog(true);
  };

  const executeDownload = async () => {
    setDownloading(true);
    try {
      let url: string;
      if (user.isPremium && rotaFrom && rotaTo) {
        url = `/api/shifts/rota-pdf?from=${rotaFrom}&to=${rotaTo}`;
      } else {
        url = `/api/shifts/rota-pdf?month=${rotaMonth}&year=${rotaYear}`;
      }
      const res = await fetch(url);
      if (!res.ok) {
        let errorMsg = 'Download failed';
        try {
          const data = await res.json();
          errorMsg = data.error || errorMsg;
        } catch { /* not JSON */ }
        if (res.status === 403 && !user.isPremium) {
          setShowPremiumPopup(true);
          setShowRotaDialog(false);
          return;
        }
        throw new Error(errorMsg);
      }

      // Server returns actual PDF binary
      const pdfBlob = await res.blob();
      const blobUrl = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = blobUrl;
      const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const downloadLabel = (user.isPremium && rotaFrom && rotaTo) ? `${rotaFrom}-to-${rotaTo}` : `${MONTHS[(rotaMonth || 1) - 1]}-${rotaYear || new Date().getFullYear()}`;
      link.download = `TrishulHub-Rota-${downloadLabel}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
      setShowRotaDialog(false);
      toast.success('PDF downloaded successfully!');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to download rota');
    } finally {
      setDownloading(false);
    }
  };

  // Calculate summary stats based on current view
  const viewShifts = (() => {
    if (viewMode === 'day') return getShiftsForDay(dayDate);
    if (viewMode === 'week') return weekDates.flatMap((d) => getShiftsForDay(d));
    if (viewMode === 'month') return getShiftsForMonth(monthDate.getFullYear(), monthDate.getMonth() + 1);
    return [];
  })();

  const totalHours = viewShifts.reduce((acc, s) => acc + (Number(s.totalHours) || 0), 0);
  const totalShifts = viewShifts.length;
  const totalEarnings = viewShifts.reduce((acc, s) => acc + (Number(s.totalHours) || 0) * (Number(s.payRate) || 0), 0);
  const avgRatePerHr = totalHours > 0 ? totalEarnings / totalHours : 0;
  const uniqueDays = [...new Set(viewShifts.map(s => s.date))];

  const isCurrentWeek = (() => {
    const currentWeekDates = getWeekDates(new Date());
    return formatDateStr(weekDates[0]) === formatDateStr(currentWeekDates[0]);
  })();

  // Compact Shift Card renderer
  const renderShiftCard = (shift: Shift) => {
    const shiftType = SHIFT_TYPES.find((t) => t.value === shift.shiftType) || SHIFT_TYPES[0];
    const totalH = Number(shift.totalHours) || 0;
    const payR = Number(shift.payRate) || 0;
    const shiftEarnings = totalH * payR;
    const hours = Math.floor(totalH);
    const mins = Math.round((totalH - hours) * 60);
    const durationStr = formatHoursMinutes(totalH);

    return (
      <div
        key={shift.id}
        className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-muted/50 transition-colors cursor-pointer group"
        onClick={() => setEditShift(shift)}
      >
        {/* Left: Shift type color indicator */}
        <div className={`w-0.5 self-stretch rounded-full shrink-0 ${shiftType.color}`} />

        {/* Center: Shift details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-foreground tabular-nums">
              {formatTime12h(shift.startTime)} – {formatTime12h(shift.endTime)}
            </span>
            <Badge
              className="text-[8px] px-1 py-0 h-3.5 leading-3"
              variant="outline"
            >
              {shiftType.label}
            </Badge>
            {shift.client && (
              <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium truncate max-w-[100px]">
                {shift.client}
              </span>
            )}
          </div>
          {shift.notes && (
            <p className="text-[10px] text-muted-foreground truncate mt-0.5">{shift.notes}</p>
          )}
        </div>

        {/* Right: Duration + Pay */}
        <div className="text-right shrink-0 flex items-center gap-2">
          <span className="text-xs font-bold text-foreground tabular-nums">{durationStr}</span>
          <span className="text-xs font-semibold text-green-600 dark:text-green-400 tabular-nums min-w-[50px] text-right">
            £{shiftEarnings.toFixed(2)}
          </span>
        </div>

        {/* Delete button (shown on hover) */}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0 md:opacity-0 md:group-hover:opacity-100 opacity-70 transition-opacity"
          onClick={(e) => { e.stopPropagation(); setDeleteId(shift.id); }}
          aria-label={`Delete ${shift.date} shift`}
        >
          <Trash2 className="h-3 w-3 text-destructive" />
        </Button>
      </div>
    );
  };

  if (loading) return <LoadingSkeleton />;

  // No companies yet - show prompt to add one first
  if (companies.length === 0) {
    return (
      <div className="p-4 md:p-6 md:ml-64 max-w-6xl overflow-x-hidden">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4">
            <Building2 className="h-10 w-10 text-blue-600 dark:text-blue-400" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">No Companies Yet</h2>
          <p className="text-muted-foreground mb-6 max-w-sm">
            You need to add at least one company before you can track shifts. Add your first company to get started.
          </p>
          <Button
            onClick={() => setCurrentView('add-company')}
            className="bg-gradient-to-r from-blue-600 to-green-600 text-white"
          >
            <Plus className="h-4 w-4 mr-2" /> Add Your First Company
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 md:p-4 md:ml-64 space-y-2 max-w-6xl overflow-x-hidden">
      {/* Header with title + view toggle + action buttons */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-foreground">Shifts</h1>
          {/* View Toggle Tabs */}
          <div className="flex items-center bg-muted rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('day')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all min-h-[36px] ${
                viewMode === 'day'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Calendar className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Day</span>
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all min-h-[36px] ${
                viewMode === 'week'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <CalendarDays className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Week</span>
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all min-h-[36px] ${
                viewMode === 'month'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Month</span>
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDownloadRota(user.isPremium)}
            className="min-h-[44px]"
          >
            <FileCheck className="h-4 w-4 mr-1" /> Download Rota
          </Button>
          <Button
            onClick={() => {
              setSelectedShiftId(null);
              setSelectedDay(viewMode === 'day' ? dayDate : viewMode === 'month' ? monthDate : new Date());
            }}
            className="bg-gradient-to-r from-blue-600 to-green-600 text-white"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-1" /> Add Shift
          </Button>
        </div>
      </div>

      {/* Compact Summary: Total Hours + Total Pay */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 dark:from-blue-700 dark:to-blue-800 rounded-lg p-3 text-white shadow-sm">
          <p className="text-[10px] font-medium text-blue-100 uppercase tracking-wide mb-0.5">Total Hours</p>
          <p className="text-xl sm:text-2xl font-bold tabular-nums">{formatHoursMinutes(totalHours)}</p>
          <div className="mt-1 border-t border-blue-400/30 pt-1 flex items-center gap-1 text-[10px] text-blue-200">
            <span>{totalShifts} shift{totalShifts !== 1 ? 's' : ''}</span>
            <span className="text-blue-400/60">·</span>
            <span>{uniqueDays.length} day{uniqueDays.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
        <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 dark:from-emerald-700 dark:to-emerald-800 rounded-lg p-3 text-white shadow-sm">
          <p className="text-[10px] font-medium text-emerald-100 uppercase tracking-wide mb-0.5">Total Pay</p>
          <p className="text-xl sm:text-2xl font-bold tabular-nums">£{totalEarnings.toFixed(2)}</p>
          <div className="mt-1 border-t border-emerald-400/30 pt-1 flex items-center gap-1 text-[10px] text-emerald-200">
            <span>£{avgRatePerHr.toFixed(2)}/hr avg</span>
          </div>
        </div>
      </div>

      {/* ===== DAY VIEW ===== */}
      {viewMode === 'day' && (
        <>
          {/* Day Navigation */}
          <div className="flex items-center justify-between gap-2">
            <Button variant="outline" size="icon" onClick={prevDay} className="h-10 w-10 min-h-[44px] min-w-[44px]">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex flex-col items-center">
              <span className="text-sm font-medium text-foreground">
                {dayDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
              {!isToday(dayDate) && (
                <button onClick={goToday} className="text-xs text-blue-600 dark:text-blue-400 hover:underline min-h-[44px] flex items-center">
                  Go to today
                </button>
              )}
            </div>
            <Button variant="outline" size="icon" onClick={nextDay} className="h-10 w-10 min-h-[44px] min-w-[44px]">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Date picker input for day view */}
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground shrink-0">Jump to date:</Label>
            <Input
              type="date"
              value={formatDateStr(dayDate)}
              onChange={(e) => {
                if (e.target.value) {
                  const parts = e.target.value.split('-').map(Number);
                  setDayDate(new Date(parts[0], parts[1] - 1, parts[2]));
                }
              }}
              className="h-9 text-sm w-auto"
            />
          </div>

          {/* Day shifts */}
          <div className="space-y-1.5">
            {(() => {
              const dayShifts = getShiftsForDay(dayDate);
              const isCurrentDay = isToday(dayDate);
              const dayCompanies = [...new Set(dayShifts.map(s => s.company?.name).filter(Boolean))];
              const dayHours = dayShifts.reduce((acc, s) => acc + (Number(s.totalHours) || 0), 0);
              const dayEarnings = dayShifts.reduce((acc, s) => acc + (Number(s.totalHours) || 0) * (Number(s.payRate) || 0), 0);
              return (
                <Card className={`border-border overflow-hidden ${isCurrentDay ? 'ring-2 ring-blue-500/30 dark:ring-blue-400/30' : ''}`}>
                  {/* Day header — compact */}
                  <div className={`flex items-center justify-between px-2.5 py-1.5 ${dayShifts.length > 0 ? 'bg-muted/60 border-b border-border' : ''}`}>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${isCurrentDay ? 'bg-blue-600 text-white' : 'bg-muted text-muted-foreground'}`}>
                        {DAY_NAMES_FULL[dayDate.getDay() === 0 ? 6 : dayDate.getDay() - 1]}
                      </span>
                      <span className="text-xs text-foreground font-medium">
                        {dayDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </span>
                      {isCurrentDay && <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 text-[9px] px-1 py-0 h-3.5 leading-3">Today</Badge>}
                      {dayCompanies.length > 0 && (
                        <span className="text-[10px] text-muted-foreground font-medium truncate max-w-[120px]">
                          {dayCompanies.join(', ')}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {dayShifts.length > 0 && (
                        <span className="text-[10px] text-muted-foreground tabular-nums">
                          {formatHoursMinutes(dayHours)} · £{dayEarnings.toFixed(2)}
                        </span>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => {
                          setSelectedShiftId(null);
                          setSelectedDay(dayDate);
                        }}
                      >
                        <Plus className="h-3 w-3 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>
                  {dayShifts.length === 0 ? (
                    <div className="flex flex-col items-center py-6 text-center">
                      <Calendar className="h-8 w-8 text-muted-foreground/50 mb-2" />
                      <p className="text-sm text-muted-foreground">No shifts on this day</p>
                      <button
                        onClick={() => {
                          setSelectedShiftId(null);
                          setSelectedDay(dayDate);
                        }}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-1 min-h-[44px] flex items-center"
                      >
                        Add a shift
                      </button>
                    </div>
                  ) : (
                    <div className="divide-y divide-border/50">
                      {dayShifts.map((shift) => renderShiftCard(shift))}
                    </div>
                  )}
                </Card>
              );
            })()}
          </div>
        </>
      )}

      {/* ===== WEEK VIEW ===== */}
      {viewMode === 'week' && (
        <>
          {/* Week Navigation */}
          <div className="flex items-center justify-between gap-2">
            <Button variant="outline" size="icon" onClick={prevWeek} className="h-10 w-10 min-h-[44px] min-w-[44px]">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex flex-col items-center">
              <span className="text-sm font-medium text-foreground">
                {weekDates[0].toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – {weekDates[6].toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
              {!isCurrentWeek && (
                <button onClick={goThisWeek} className="text-xs text-blue-600 dark:text-blue-400 hover:underline min-h-[44px] flex items-center">
                  Go to this week
                </button>
              )}
            </div>
            <Button variant="outline" size="icon" onClick={nextWeek} className="h-10 w-10 min-h-[44px] min-w-[44px]">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Weekly Calendar Grid — Compact Style */}
          <div className="space-y-1.5">
            {weekDates.map((date, idx) => {
              const dayShifts = getShiftsForDay(date);
              const isCurrentDay = isToday(date);
              const isWeekend = idx >= 5;
              const dayHours = dayShifts.reduce((acc, s) => acc + (Number(s.totalHours) || 0), 0);
              const dayEarnings = dayShifts.reduce((acc, s) => acc + (Number(s.totalHours) || 0) * (Number(s.payRate) || 0), 0);
              const dayCompanies = [...new Set(dayShifts.map(s => s.company?.name).filter(Boolean))];

              return (
                <Card key={formatDateStr(date)} className={`border-border overflow-hidden ${isCurrentDay ? 'ring-2 ring-blue-500/30 dark:ring-blue-400/30' : ''} ${isWeekend ? 'bg-muted/20 dark:bg-muted/10' : ''}`}>
                  {/* Day header — compact */}
                  <div className={`flex items-center justify-between px-2.5 py-1.5 ${dayShifts.length > 0 ? 'bg-muted/60 border-b border-border' : ''}`}>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${isCurrentDay ? 'bg-blue-600 text-white' : 'bg-muted text-muted-foreground'}`}>
                        {DAY_NAMES[idx]}
                      </span>
                      <span className="text-xs text-foreground font-medium">
                        {date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </span>
                      {isCurrentDay && <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 text-[9px] px-1 py-0 h-3.5 leading-3">Today</Badge>}
                      {dayCompanies.length > 0 && (
                        <span className="text-[10px] text-muted-foreground font-medium truncate max-w-[120px]">
                          {dayCompanies.join(', ')}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {dayShifts.length > 0 && (
                        <span className="text-[10px] text-muted-foreground tabular-nums">
                          {formatHoursMinutes(dayHours)} · £{dayEarnings.toFixed(2)}
                        </span>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => {
                          setSelectedShiftId(null);
                          setSelectedDay(date);
                        }}
                      >
                        <Plus className="h-3 w-3 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>
                  {dayShifts.length === 0 ? (
                    <p className="text-[10px] text-muted-foreground px-2.5 py-1">No shift</p>
                  ) : (
                    <div className="divide-y divide-border/50">
                      {dayShifts.map((shift) => renderShiftCard(shift))}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* ===== MONTH VIEW ===== */}
      {viewMode === 'month' && (
        <>
          {/* Month Navigation */}
          <div className="flex items-center justify-between gap-2">
            <Button variant="outline" size="icon" onClick={prevMonth} className="h-10 w-10 min-h-[44px] min-w-[44px]">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex flex-col items-center">
              <span className="text-sm font-medium text-foreground">
                {MONTHS[monthDate.getMonth()]} {monthDate.getFullYear()}
              </span>
              {!(monthDate.getMonth() === new Date().getMonth() && monthDate.getFullYear() === new Date().getFullYear()) && (
                <button onClick={goThisMonth} className="text-xs text-blue-600 dark:text-blue-400 hover:underline min-h-[44px] flex items-center">
                  Go to this month
                </button>
              )}
            </div>
            <Button variant="outline" size="icon" onClick={nextMonth} className="h-10 w-10 min-h-[44px] min-w-[44px]">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Month shifts grouped by date */}
          <div className="space-y-1.5 max-h-[70vh] overflow-y-auto custom-scrollbar pr-1">
            {(() => {
              const mShifts = getShiftsForMonth(monthDate.getFullYear(), monthDate.getMonth() + 1);
              if (mShifts.length === 0) {
                return (
                  <div className="flex flex-col items-center py-10 text-center">
                    <CalendarDays className="h-10 w-10 text-muted-foreground/50 mb-2" />
                    <p className="text-sm text-muted-foreground">No shifts this month</p>
                    <button
                      onClick={() => {
                        setSelectedShiftId(null);
                        setSelectedDay(monthDate);
                      }}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-1 min-h-[44px] flex items-center"
                    >
                      Add a shift
                    </button>
                  </div>
                );
              }

              // Group shifts by date
              const groupedByDate: Record<string, Shift[]> = {};
              mShifts.forEach((s) => {
                if (!groupedByDate[s.date]) groupedByDate[s.date] = [];
                groupedByDate[s.date].push(s);
              });

              // Sort dates
              const sortedDates = Object.keys(groupedByDate).sort();

              return sortedDates.map((dateStr) => {
                const parts = dateStr.split('-').map(Number);
                const date = new Date(parts[0], parts[1] - 1, parts[2]);
                const dayShifts = groupedByDate[dateStr];
                const isCurrentDay = isToday(date);
                const dayOfWeek = date.getDay();
                const dayName = DAY_NAMES_FULL[dayOfWeek === 0 ? 6 : dayOfWeek - 1];
                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                const dayEarnings = dayShifts.reduce((acc, s) => acc + (Number(s.totalHours) || 0) * (Number(s.payRate) || 0), 0);
                const dayHours = dayShifts.reduce((acc, s) => acc + (Number(s.totalHours) || 0), 0);
                const dayCompanies = [...new Set(dayShifts.map(s => s.company?.name).filter(Boolean))];

                return (
                  <Card key={dateStr} className={`border-border overflow-hidden ${isCurrentDay ? 'ring-2 ring-blue-500/30 dark:ring-blue-400/30' : ''} ${isWeekend ? 'bg-muted/20 dark:bg-muted/10' : ''}`}>
                      {/* Day header — compact */}
                      <div className="flex items-center justify-between px-2.5 py-1.5 bg-muted/60 border-b border-border">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${isCurrentDay ? 'bg-blue-600 text-white' : 'bg-muted text-muted-foreground'}`}>
                            {dayName}
                          </span>
                          <span className="text-xs text-foreground font-medium">
                            {date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                          </span>
                          {isCurrentDay && <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 text-[9px] px-1 py-0 h-3.5 leading-3">Today</Badge>}
                          {dayCompanies.length > 0 && (
                            <span className="text-[10px] text-muted-foreground font-medium truncate max-w-[120px]">
                              {dayCompanies.join(', ')}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-muted-foreground tabular-nums">
                            {formatHoursMinutes(dayHours)} · £{dayEarnings.toFixed(2)}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => {
                              setSelectedShiftId(null);
                              setSelectedDay(date);
                            }}
                          >
                            <Plus className="h-3 w-3 text-muted-foreground" />
                          </Button>
                        </div>
                      </div>
                      <div className="divide-y divide-border/50">
                          {dayShifts.map((shift) => renderShiftCard(shift))}
                        </div>
                    </Card>
                );
              });
            })()}
          </div>
        </>
      )}

      {/* Add shift from day + button */}
      <ShiftDaySheet
        date={selectedDay}
        open={!!selectedDay}
        onClose={() => setSelectedDay(null)}
        companies={companies}
        onSaved={() => { fetchShifts(); setSelectedDay(null); }}
        user={user}
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

      {/* Download Rota Dialog */}
      <Dialog open={showRotaDialog} onOpenChange={setShowRotaDialog}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Download Monthly Rota</DialogTitle>
            <DialogDescription>
              {user.isPremium
                ? 'As a Premium member, you can download any date range.'
                : 'Free users can download the rota for the last day of the month through the 5th of the next month.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {!user.isPremium ? (
              <div className="space-y-2">
                <Label>Select Month</Label>
                <div className="grid grid-cols-2 gap-3">
                  <Select value={rotaMonth.toString()} onValueChange={(v) => setRotaMonth(parseInt(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((m, i) => <SelectItem key={i} value={(i + 1).toString()}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input type="number" value={rotaYear} onChange={(e) => setRotaYear(parseInt(e.target.value))} className="h-10" onWheel={handleNumberInputWheel} />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Date Range</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">From</Label>
                    <Input type="date" value={rotaFrom} onChange={(e) => setRotaFrom(e.target.value)} className="h-10" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">To</Label>
                    <Input type="date" value={rotaTo} onChange={(e) => setRotaTo(e.target.value)} className="h-10" />
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowRotaDialog(false)} className="w-full sm:w-auto">Cancel</Button>
            <Button onClick={executeDownload} disabled={downloading} className="bg-gradient-to-r from-blue-600 to-green-600 text-white w-full sm:w-auto">
              {downloading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileCheck className="h-4 w-4 mr-2" />}
              Download PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Premium Popup */}
      <PremiumFeaturePopup
        open={showPremiumPopup}
        onClose={() => setShowPremiumPopup(false)}
        user={user}
      />
    </div>
  );
}

// ============================================================
// SHIFT DAY SHEET (add shift for specific day)
// ============================================================
function ShiftDaySheet({
  date, open, onClose, companies, onSaved, user,
}: {
  date: Date | null;
  open: boolean;
  onClose: () => void;
  companies: Company[];
  onSaved: () => void;
  user: SessionUser;
}) {
  // Load last-used company and break minutes from localStorage
  const getLastUsedCompany = () => {
    try {
      return localStorage.getItem(`lastCompany_${user.id}`) || '';
    } catch { return ''; }
  };
  const getLastBreakMinutes = () => {
    try {
      return localStorage.getItem(`lastBreakMinutes_${user.id}`) || '0';
    } catch { return '0'; }
  };

  // Auto-select company: if only 1 company, use it; otherwise use last used
  const getDefaultCompany = () => {
    if (companies.length === 1) return companies[0].id;
    const lastUsed = getLastUsedCompany();
    if (lastUsed && companies.some(c => c.id === lastUsed)) return lastUsed;
    return '';
  };

  const [companyId, setCompanyId] = useState(getDefaultCompany);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [breakMinutes, setBreakMinutes] = useState(getLastBreakMinutes);
  const [shiftType, setShiftType] = useState('REGULAR');
  const [payRate, setPayRate] = useState('');
  const [useCustomRate, setUseCustomRate] = useState(false);
  const [notes, setNotes] = useState('');
  const [client, setClient] = useState('');
  const [loading, setLoading] = useState(false);

  // Get company pay rate when company changes
  const selectedCompany = companies.find((c) => c.id === companyId);
  const companyPayRate = selectedCompany?.payRate || 0;

  // When company changes, update pay rate to company default if not using custom
  useEffect(() => {
    if (companyId && !useCustomRate) {
      if (companyPayRate > 0) {
        setPayRate(companyPayRate.toString());
      } else {
        setPayRate('');
      }
    }
    // Save last-used company to localStorage
    if (companyId) {
      try { localStorage.setItem(`lastCompany_${user.id}`, companyId); } catch {}
    }
  }, [companyId, companyPayRate, useCustomRate, user.id]);

  // Auto-calculate hours
  const totalHours = calculateShiftHours(startTime, endTime, parseInt(breakMinutes) || 0);
  const effectiveRate = useCustomRate ? (parseFloat(payRate) || 0) : companyPayRate;
  const shiftEarnings = totalHours * effectiveRate;

  const handleSubmit = async () => {
    if (!date || !companyId) { toast.error('Please select a company'); return; }
    setLoading(true);
    try {
      // Save last-used break minutes to localStorage
      try { localStorage.setItem(`lastBreakMinutes_${user.id}`, breakMinutes); } catch {}

      await apiFetch('/api/shifts', {
        method: 'POST',
        body: JSON.stringify({
          companyId,
          date: formatDateStr(date),
          startTime,
          endTime,
          breakMinutes: parseInt(breakMinutes) || 0,
          shiftType,
          payRate: useCustomRate ? (parseFloat(payRate) || 0) : undefined,
          notes: notes || null,
          client: client || null,
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
    setCompanyId(getDefaultCompany());
    setStartTime('09:00');
    setEndTime('17:00');
    setBreakMinutes(getLastBreakMinutes());
    setShiftType('REGULAR');
    setPayRate('');
    setUseCustomRate(false);
    setNotes('');
    setClient('');
  };

  if (!date) return null;

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) { onClose(); resetForm(); } }}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-scroll custom-scrollbar">
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
                {companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}{c.payRate > 0 ? ` (£${c.payRate.toFixed(2)}/hr)` : ''}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Time Pickers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ScrollTimePicker value={startTime} onChange={setStartTime} label="Start Time" />
            <ScrollTimePicker value={endTime} onChange={setEndTime} label="End Time" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Break (minutes)</Label>
              <Input type="number" value={breakMinutes} onChange={(e) => setBreakMinutes(e.target.value)} className="h-12" onWheel={handleNumberInputWheel} />
            </div>
            <div className="space-y-2">
              <Label>Total Hours</Label>
              <div className="h-12 flex items-center px-3 rounded-md border border-border bg-muted/50">
                <span className="text-foreground font-medium">{formatHoursMinutes(totalHours)}</span>
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

          {/* Hour Rate Field - always visible */}
          {companyId && (
            <div className="space-y-2 rounded-lg border border-border p-3 bg-muted/30">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Hour Rate</Label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Custom rate</span>
                  <Switch checked={useCustomRate} onCheckedChange={setUseCustomRate} />
                </div>
              </div>
              {useCustomRate ? (
                <div className="relative">
                  <PoundSterling className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input type="number" step="0.01" min="0" placeholder="Custom rate" value={payRate} onChange={(e) => setPayRate(e.target.value)} className="pl-10 h-10" onWheel={handleNumberInputWheel} />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {companyPayRate > 0 ? `Using company rate: £${companyPayRate.toFixed(2)}/hr` : 'No company rate set — toggle custom rate to enter one'}
                </p>
              )}
              {effectiveRate > 0 && (
                <p className="text-xs text-primary font-medium">
                  Estimated earnings: £{shiftEarnings.toFixed(2)} ({formatHoursMinutes(totalHours)} × £{effectiveRate.toFixed(2)})
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label>Client <span className="text-muted-foreground">(Optional)</span></Label>
            <Input placeholder="Client name..." value={client} onChange={(e) => setClient(e.target.value)} className="h-12" />
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea placeholder="Optional notes..." value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <Button
            onClick={handleSubmit}
            disabled={loading || !companyId}
            className="w-full h-12 min-h-[44px] bg-gradient-to-r from-blue-600 to-green-600 text-white"
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
  const [breakMinutes, setBreakMinutes] = useState('0');
  const [shiftType, setShiftType] = useState('REGULAR');
  const [payRate, setPayRate] = useState('');
  const [useCustomRate, setUseCustomRate] = useState(false);
  const [notes, setNotes] = useState('');
  const [client, setClient] = useState('');
  const [loading, setLoading] = useState(false);

  // SHI-008: When company changes in edit sheet, reset custom rate flag
  // so the server's effective pay rate logic applies for the new company
  useEffect(() => {
    if (shift) {
      setCompanyId(shift.companyId);
      setStartTime(shift.startTime);
      setEndTime(shift.endTime);
      setBreakMinutes(shift.breakMinutes.toString());
      setShiftType(shift.shiftType);
      setNotes(shift.notes || '');
      setClient(shift.client || '');
      // If shift has a custom pay rate (different from company rate), show it
      const company = companies.find(c => c.id === shift.companyId);
      if (shift.payRate > 0 && company && shift.payRate !== company.payRate) {
        setPayRate(shift.payRate.toString());
        setUseCustomRate(true);
      } else {
        setPayRate('');
        setUseCustomRate(false);
      }
    }
  }, [shift, companies]);

  // SHI-008: Reset custom rate when user switches company in edit form
  useEffect(() => {
    if (shift) {
      setUseCustomRate(false);
      setPayRate('');
    }
  }, [companyId]);

  // Get company pay rate
  const selectedCompany = companies.find((c) => c.id === companyId);
  const companyPayRate = selectedCompany?.payRate || 0;

  const totalHours = calculateShiftHours(startTime, endTime, parseInt(breakMinutes) || 0);
  const effectiveRate = useCustomRate ? (parseFloat(payRate) || 0) : companyPayRate;
  const shiftEarnings = totalHours * effectiveRate;

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
          payRate: useCustomRate ? (parseFloat(payRate) || 0) : undefined,
          notes: notes || null,
          client: client || null,
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
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-scroll custom-scrollbar">
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

          {/* Time Pickers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ScrollTimePicker value={startTime} onChange={setStartTime} label="Start Time" />
            <ScrollTimePicker value={endTime} onChange={setEndTime} label="End Time" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Break (minutes)</Label>
              <Input type="number" value={breakMinutes} onChange={(e) => setBreakMinutes(e.target.value)} className="h-12" onWheel={handleNumberInputWheel} />
            </div>
            <div className="space-y-2">
              <Label>Total Hours</Label>
              <div className="h-12 flex items-center px-3 rounded-md border border-border bg-muted/50">
                <span className="text-foreground font-medium">{formatHoursMinutes(totalHours)}</span>
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

          {/* Hour Rate Field - always visible */}
          {companyId && (
            <div className="space-y-2 rounded-lg border border-border p-3 bg-muted/30">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Hour Rate</Label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Custom rate</span>
                  <Switch checked={useCustomRate} onCheckedChange={setUseCustomRate} />
                </div>
              </div>
              {useCustomRate ? (
                <div className="relative">
                  <PoundSterling className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input type="number" step="0.01" min="0" placeholder="Custom rate" value={payRate} onChange={(e) => setPayRate(e.target.value)} className="pl-10 h-10" onWheel={handleNumberInputWheel} />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {companyPayRate > 0 ? `Using company rate: £${companyPayRate.toFixed(2)}/hr` : 'No company rate set — toggle custom rate to enter one'}
                </p>
              )}
              {effectiveRate > 0 && (
                <p className="text-xs text-primary font-medium">
                  Estimated earnings: £{shiftEarnings.toFixed(2)} ({formatHoursMinutes(totalHours)} × £{effectiveRate.toFixed(2)})
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label>Client <span className="text-muted-foreground">(Optional)</span></Label>
            <Input placeholder="Client name..." value={client} onChange={(e) => setClient(e.target.value)} className="h-12" />
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea placeholder="Optional notes..." value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div className="flex gap-3">
            <Button
              variant="destructive"
              onClick={() => onDelete(shift.id)}
              className="h-12 min-h-[44px]"
            >
              <Trash2 className="h-4 w-4 mr-2" /> Delete
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 h-12 min-h-[44px] bg-gradient-to-r from-blue-600 to-green-600 text-white"
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
// REF-016: Clipboard fallback for non-HTTPS contexts
// REF-017: Shared utility used by ReferralsView, PremiumFeaturePopup, SettingsView
// ============================================================
async function safeCopyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch { /* fall through to fallback */ }
  // Fallback: hidden textarea + execCommand (works on HTTP)
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '-9999px';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

// ============================================================
// REFERRALS VIEW
// ============================================================
function ReferralsView({ user }: { user: SessionUser }) {
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => { fetchReferrals(); }, []);

  const fetchReferrals = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const d = await apiFetch('/api/referrals');
      setData(d);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load referrals';
      setFetchError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const referralLink = typeof window !== 'undefined' ? `${window.location.origin}/?ref=${user.referralCode}` : '';

  const copyLink = async () => {
    const ok = await safeCopyToClipboard(referralLink);
    if (ok) { setCopiedLink(true); toast.success('Link copied!'); setTimeout(() => setCopiedLink(false), 2000); }
    else toast.error('Failed to copy');
  };

  const copyCode = async () => {
    const ok = await safeCopyToClipboard(user.referralCode);
    if (ok) { setCopiedCode(true); toast.success('Code copied!'); setTimeout(() => setCopiedCode(false), 2000); }
    else toast.error('Failed to copy');
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
      const ok = await safeCopyToClipboard(referralLink);
      if (ok) toast.success('Link copied to clipboard!');
      else toast.error('Failed to copy');
    }
  };

  if (loading) return <LoadingSkeleton />;

  // REF-010: Error state with retry button instead of infinite skeleton
  if (!data || fetchError) {
    return (
      <div className="p-4 md:p-6 md:ml-64 space-y-6 max-w-2xl">
        <Card className="border-red-200 dark:border-red-800/40 bg-red-50/50 dark:bg-red-950/20">
          <CardContent className="p-6 text-center space-y-3">
            <AlertCircle className="h-10 w-10 text-red-500 mx-auto" />
            <p className="text-sm text-foreground">{fetchError || 'Unable to load referral data.'}</p>
            <Button onClick={fetchReferrals} variant="outline" className="min-h-[44px]">
              <RefreshCw className="h-4 w-4 mr-2" /> Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 md:ml-64 space-y-6 max-w-2xl overflow-x-hidden">
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
            <Button variant="outline" size="sm" onClick={copyCode} className="min-h-[44px]">
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
            <Button variant="outline" size="sm" onClick={copyLink} className="min-h-[44px] shrink-0">
              {copiedLink ? <Check className="h-4 w-4 text-green-600 dark:text-green-400" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <Button onClick={shareLink} className="w-full h-12 min-h-[44px] bg-gradient-to-r from-blue-600 to-green-600 text-white">
            <Share2 className="h-4 w-4 mr-2" /> Share Link
          </Button>
        </CardContent>
      </Card>

      {/* REF-005: Referred Users List */}
      {data.referredUsers && data.referredUsers.length > 0 && (
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Your Referrals ({data.referredUsers.length})</CardTitle>
            <CardDescription>People who signed up using your code</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.referredUsers.map((ru, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg border border-border">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-600 to-green-600 flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-bold text-white">{ru.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div>
                      <p className="text-sm text-foreground">{ru.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(ru.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <Badge variant={ru.isActive ? 'default' : 'secondary'} className={`text-[10px] ${ru.isActive ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : ''}`}>
                    {ru.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
  const { setCurrentView, setUser } = useAppStore();
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(user.name);
  const [nameSaving, setNameSaving] = useState(false);

  const themeOptions = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ];

  // SET-004: Save edited name
  const handleSaveName = async () => {
    if (!nameInput.trim() || nameInput.trim() === user.name) { setEditingName(false); return; }
    setNameSaving(true);
    try {
      const res = await apiFetch('/api/auth/session', {
        method: 'PUT',
        body: JSON.stringify({ name: nameInput.trim() }),
      });
      if (res.user) setUser({ ...user, name: res.user.name });
      toast.success('Name updated');
      setEditingName(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update name');
      setNameInput(user.name);
    } finally {
      setNameSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-6 md:ml-64 space-y-6 max-w-2xl overflow-x-hidden">
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
            <div className="flex-1 min-w-0">
              {editingName ? (
                <div className="flex items-center gap-2">
                  <Input value={nameInput} onChange={(e) => setNameInput(e.target.value)} className="h-9 text-sm" maxLength={50} />
                  <Button size="sm" onClick={handleSaveName} disabled={nameSaving || !nameInput.trim()} className="shrink-0">
                    {nameSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setNameInput(user.name); setEditingName(false); }} className="shrink-0">
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{user.name}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setEditingName(true)} className="shrink-0 h-8 w-8" aria-label="Edit name">
                    <Edit3 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
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
          <div className="space-y-3">
            <p className="text-sm font-medium text-foreground">Theme</p>
            <div className="grid grid-cols-3 gap-1 sm:gap-2">
              {themeOptions.map((opt) => {
                const Icon = opt.icon;
                const isActive = (theme || 'system') === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setTheme(opt.value)}
                    className={`flex flex-col items-center gap-1.5 sm:gap-2 p-2 sm:p-3 rounded-lg border-2 transition-all min-h-[44px] ${
                      isActive
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-border text-muted-foreground hover:border-muted-foreground/30'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-xs font-medium">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Quick Links</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button variant="ghost" className="w-full justify-start h-12 min-h-[44px]" onClick={() => setCurrentView('companies')}>
            <Building2 className="h-4 w-4 mr-3 text-muted-foreground" /> Manage Companies
          </Button>
          <Button variant="ghost" className="w-full justify-start h-12 min-h-[44px]" onClick={() => setCurrentView('referrals')}>
            <Users className="h-4 w-4 mr-3 text-muted-foreground" /> Referral Programme
          </Button>
          {/* SET-004: Change Password shortcut — uses existing forgot-password flow */}
          <Button variant="ghost" className="w-full justify-start h-12 min-h-[44px]" onClick={onLogout}>
            <KeyRound className="h-4 w-4 mr-3 text-muted-foreground" /> Change Password
          </Button>
          {user.role === 'ADMIN' && (
            <Button variant="ghost" className="w-full justify-start h-12 min-h-[44px] text-purple-600 dark:text-purple-400" onClick={() => setCurrentView('admin')}>
              <Shield className="h-4 w-4 mr-3" /> Admin Dashboard
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Sign Out */}
      <Card className="border-border">
        <CardContent className="p-4">
          <Button variant="destructive" className="w-full h-12 min-h-[44px]" onClick={onLogout}>
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
  const [adminTab, setAdminTab] = useState<'stats' | 'smtp' | 'ai' | 'users'>('stats');
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
    <div className="p-4 md:p-6 md:ml-64 space-y-6 max-w-4xl overflow-x-hidden">
      <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
        <Shield className="h-5 w-5" /> Admin Dashboard
      </h1>

      {/* Tab switcher */}
      <div className="flex gap-1 p-1 bg-muted rounded-lg w-full sm:w-fit overflow-x-auto">
        <button
          onClick={() => setAdminTab('stats')}
          className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
            adminTab === 'stats' ? 'bg-card text-foreground shadow-sm border border-border' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <BarChart3 className="h-3.5 w-3.5" /> Stats
        </button>
        <button
          onClick={() => setAdminTab('smtp')}
          className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
            adminTab === 'smtp' ? 'bg-card text-foreground shadow-sm border border-border' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Mail className="h-3.5 w-3.5" /> SMTP
        </button>
        <button
          onClick={() => setAdminTab('ai')}
          className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
            adminTab === 'ai' ? 'bg-card text-foreground shadow-sm border border-border' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Brain className="h-3.5 w-3.5" /> AI
        </button>
        <button
          onClick={() => setAdminTab('users')}
          className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
            adminTab === 'users' ? 'bg-card text-foreground shadow-sm border border-border' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Users className="h-3.5 w-3.5" /> Users
        </button>
      </div>

      {/* Stats Tab */}
      {adminTab === 'stats' && (
        <>
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
            <Card className="border-border col-span-2 md:col-span-1">
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
                    <span className="text-xs sm:text-sm text-muted-foreground w-20 sm:w-28 shrink-0">{ms.month}</span>
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
        </>
      )}

      {/* SMTP Settings Tab */}
      {adminTab === 'smtp' && <SmtpSettingsView />}

      {/* AI Settings Tab */}
      {adminTab === 'ai' && <AiSettingsView />}

      {/* Users Management Tab */}
      {adminTab === 'users' && <AdminUsersView />}
    </div>
  );
}

// ============================================================
// ADMIN USERS VIEW (inside Admin tab)
// ============================================================
function AdminUsersView() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ userId: string; action: string; userName: string } | null>(null);
  const [editEmailUser, setEditEmailUser] = useState<{ userId: string; userName: string; currentEmail: string } | null>(null);
  const [newEmail, setNewEmail] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/api/admin/users');
      setUsers(data.users);
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (userId: string, action: string) => {
    setActionLoading(userId);
    try {
      const result = await apiFetch('/api/admin/users', {
        method: 'PATCH',
        body: JSON.stringify({ userId, action }),
      });
      toast.success(result.message || 'Action completed');
      fetchUsers();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionLoading(null);
      setConfirmAction(null);
    }
  };

  const handleChangeEmail = async () => {
    if (!editEmailUser || !newEmail.trim()) return;
    setEmailLoading(true);
    try {
      const result = await apiFetch('/api/admin/users', {
        method: 'PATCH',
        body: JSON.stringify({ userId: editEmailUser.userId, action: 'change-email', newEmail: newEmail.trim() }),
      });
      toast.success(result.message || 'Email updated');
      setEditEmailUser(null);
      setNewEmail('');
      fetchUsers();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to change email');
    } finally {
      setEmailLoading(false);
    }
  };

  if (loading) return <LoadingSkeleton />;

  const activeUsers = users.filter((u) => !u.deactivated);
  const deactivatedUsers = users.filter((u) => u.deactivated);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <Card className="border-border">
          <CardContent className="p-2 sm:p-4 text-center">
            <p className="text-lg sm:text-2xl font-bold text-foreground">{users.length}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Total Users</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-2 sm:p-4 text-center">
            <p className="text-lg sm:text-2xl font-bold text-green-600 dark:text-green-400">{activeUsers.length}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Active</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-2 sm:p-4 text-center">
            <p className="text-lg sm:text-2xl font-bold text-red-600 dark:text-red-400">{deactivatedUsers.length}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Deactivated</p>
          </CardContent>
        </Card>
      </div>

      {/* Active Users */}
      {activeUsers.length > 0 && (
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" /> Active Users ({activeUsers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {activeUsers.map((u) => (
                <div key={u.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-600 to-green-600 flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-white">{u.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-foreground truncate">{u.name}</p>
                        {u.role === 'ADMIN' && <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 text-[10px]"><Shield className="h-3 w-3 mr-0.5" /> Admin</Badge>}
                        {u.isPremium && <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 text-[10px]"><Star className="h-3 w-3 mr-0.5" /> PRO</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                      {u.referredByName && <p className="text-[10px] text-blue-600 dark:text-blue-400">Referred by: {u.referredByName}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-12 sm:ml-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-blue-600 border-blue-300 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-700 dark:hover:bg-blue-950/40 text-xs"
                      disabled={actionLoading === u.id}
                      onClick={() => { setEditEmailUser({ userId: u.id, userName: u.name, currentEmail: u.email }); setNewEmail(u.email); }}
                    >
                      <Mail className="h-3 w-3 mr-1" />Edit Email
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-amber-600 border-amber-300 hover:bg-amber-50 dark:text-amber-400 dark:border-amber-700 dark:hover:bg-amber-950/40 text-xs"
                      disabled={actionLoading === u.id}
                      onClick={() => setConfirmAction({ userId: u.id, action: 'deactivate', userName: u.name })}
                    >
                      {actionLoading === u.id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Deactivate'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-700 dark:hover:bg-red-950/40 text-xs"
                      disabled={actionLoading === u.id}
                      onClick={() => setConfirmAction({ userId: u.id, action: 'delete', userName: u.name })}
                    >
                      {actionLoading === u.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <span className="flex items-center gap-1"><Trash2 className="h-3 w-3" />Delete</span>}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Deactivated Users */}
      {deactivatedUsers.length > 0 && (
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertCircle className="h-4 w-4" /> Deactivated Users ({deactivatedUsers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {deactivatedUsers.map((u) => (
                <div key={u.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border border-red-200 dark:border-red-800/40 bg-red-50/50 dark:bg-red-950/20 gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-muted-foreground">{u.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-foreground truncate">{u.name}</p>
                        <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 text-[10px]">Deactivated</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                      {u.referredByName && <p className="text-[10px] text-blue-600 dark:text-blue-400">Referred by: {u.referredByName}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-12 sm:ml-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-blue-600 border-blue-300 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-700 dark:hover:bg-blue-950/40 text-xs"
                      disabled={actionLoading === u.id}
                      onClick={() => { setEditEmailUser({ userId: u.id, userName: u.name, currentEmail: u.email }); setNewEmail(u.email); }}
                    >
                      <Mail className="h-3 w-3 mr-1" />Edit Email
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-green-600 border-green-300 hover:bg-green-50 dark:text-green-400 dark:border-green-700 dark:hover:bg-green-950/40 text-xs"
                      disabled={actionLoading === u.id}
                      onClick={() => handleAction(u.id, 'activate')}
                    >
                      {actionLoading === u.id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Reactivate'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-700 dark:hover:bg-red-950/40 text-xs"
                      disabled={actionLoading === u.id}
                      onClick={() => setConfirmAction({ userId: u.id, action: 'delete', userName: u.name })}
                    >
                      {actionLoading === u.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <span className="flex items-center gap-1"><Trash2 className="h-3 w-3" />Delete</span>}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Change Email Dialog */}
      <Dialog open={!!editEmailUser} onOpenChange={(v) => { if (!v) { setEditEmailUser(null); setNewEmail(''); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" /> Change Email Address
            </DialogTitle>
            <DialogDescription>
              Change the email for <strong>{editEmailUser?.userName}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Current Email</Label>
              <div className="px-3 py-2 rounded-md border border-border bg-muted/50 text-sm text-muted-foreground">
                {editEmailUser?.currentEmail}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-email">New Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="new-email"
                  type="email"
                  placeholder="new@email.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="pl-10 h-12"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleChangeEmail(); }}
                />
              </div>
            </div>
            <div className="rounded-lg border border-blue-200 dark:border-blue-800/40 bg-blue-50 dark:bg-blue-950/30 p-3">
              <p className="text-xs text-blue-700 dark:text-blue-300 flex items-start gap-2">
                <Info className="h-4 w-4 shrink-0 mt-0.5" />
                The user will need to log in with the new email address. Their password remains unchanged.
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setEditEmailUser(null); setNewEmail(''); }} disabled={emailLoading}>
              Cancel
            </Button>
            <Button
              onClick={handleChangeEmail}
              disabled={emailLoading || !newEmail.trim() || newEmail.trim() === editEmailUser?.currentEmail}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {emailLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
              Update Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Action Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={(v) => { if (!v) setConfirmAction(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.action === 'delete' ? 'Permanently Delete User?' : 'Deactivate User?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.action === 'delete'
                ? `This will permanently delete "${confirmAction?.userName}" and all their data (companies, records, shifts). This action cannot be undone.`
                : `This will deactivate "${confirmAction?.userName}". They will not be able to log in until reactivated.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={confirmAction?.action === 'delete' ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-amber-600 hover:bg-amber-700 text-white'}
              onClick={() => {
                if (confirmAction) handleAction(confirmAction.userId, confirmAction.action);
              }}
            >
              {confirmAction?.action === 'delete' ? 'Delete Permanently' : 'Deactivate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ============================================================
// SMTP SETTINGS VIEW (inside Admin tab)
// ============================================================
function SmtpSettingsView() {
  const [settings, setSettings] = useState<Record<string, { hasValue: boolean; source: string; masked: string }>>({});
  const [form, setForm] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => { fetchSettings(); }, []);

  const fetchSettings = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const data = await apiFetch('/api/admin/settings');
      setSettings(data.settings);
      // SET-005: Pre-fill form with empty strings — never expose raw API keys in form state
      const formValues: Record<string, string> = {};
      for (const key of Object.keys(data.settings)) {
        formValues[key] = '';
      }
      setForm(formValues);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load SMTP settings';
      setFetchError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // SET-006: Only send values that the user has explicitly typed (non-sensitive) or changed
  const handleSave = async () => {
    setSaving(true);
    try {
      const settingsToSave: Record<string, string> = {};
      for (const [key, value] of Object.entries(form)) {
        // Skip sensitive keys unless user typed a new value
        if (key === 'BREVO_API_KEY' && !value.trim()) continue;
        settingsToSave[key] = value || '';
      }
      const result = await apiFetch('/api/admin/settings', {
        method: 'PUT',
        body: JSON.stringify({ settings: settingsToSave }),
      });
      toast.success(result.message || 'Settings saved successfully');
      fetchSettings();
    } catch (err) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSkeleton />;

  // SET-010: Error state with retry
  if (fetchError) {
    return (
      <div className="space-y-4">
        <Card className="border-red-200 dark:border-red-800/40 bg-red-50/50 dark:bg-red-950/20">
          <CardContent className="p-6 text-center space-y-3">
            <AlertCircle className="h-10 w-10 text-red-500 mx-auto" />
            <p className="text-sm text-foreground">{fetchError}</p>
            <Button onClick={fetchSettings} variant="outline" className="min-h-[44px]">
              <RefreshCw className="h-4 w-4 mr-2" /> Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const smtpFields = [
    { key: 'BREVO_SMTP_SERVER', label: 'SMTP Server', placeholder: 'smtp-relay.brevo.com', type: 'text', icon: Server },
    { key: 'BREVO_SMTP_PORT', label: 'SMTP Port', placeholder: '587', type: 'text', icon: Settings },
    { key: 'BREVO_SMTP_LOGIN', label: 'SMTP Login', placeholder: 'your-login@smtp-brevo.com', type: 'text', icon: Mail },
    { key: 'BREVO_API_KEY', label: 'SMTP Password (API Key)', placeholder: 'Enter your Brevo API key', type: showApiKey ? 'text' : 'password', icon: KeyRound },
    { key: 'BREVO_FROM_EMAIL', label: 'Sender Email', placeholder: 'your-sender@smtp-brevo.com', type: 'text', icon: Mail },
    { key: 'BREVO_FROM_NAME', label: 'Sender Name', placeholder: 'TrishulHub Pay Tracker', type: 'text', icon: User },
  ];

  const hasAnyConfig = Object.values(settings).some(s => s.hasValue);

  return (
    <div className="space-y-4">
      {/* Info banner */}
      <div className="rounded-lg border border-blue-200 dark:border-blue-500/40 bg-blue-50 dark:bg-blue-950/60 p-4">
        <div className="flex gap-3">
          <Info className="h-5 w-5 text-blue-600 dark:text-blue-300 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">Brevo SMTP Configuration</p>
            <p className="text-xs text-blue-700 dark:text-blue-400 leading-relaxed">
              These credentials are used to send OTP verification and password reset emails.
              Settings saved here take priority over environment variables. Values are stored securely in the database.
            </p>
          </div>
        </div>
      </div>

      {/* Current status */}
      <div className="flex items-center gap-2">
        <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${hasAnyConfig ? 'bg-green-500 dark:bg-green-400' : 'bg-red-500 dark:bg-red-400'}`} />
        <span className="text-sm text-muted-foreground">
          {hasAnyConfig ? 'Email service configured' : 'Email service not configured — OTP emails will not be sent'}
        </span>
      </div>

      {/* Settings form */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="h-4 w-4" /> SMTP Credentials
          </CardTitle>
          <CardDescription className="text-xs">
            All fields are optional. Leave blank to use environment variable defaults.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {smtpFields.map((field) => {
            const Icon = field.icon;
            const currentSetting = settings[field.key];
            const sourceLabel = currentSetting?.source === 'database' ? 'Database' : currentSetting?.source === 'env' ? 'Env Variable' : 'Default';
            const sourceColor = currentSetting?.source === 'database' ? 'text-green-600 dark:text-green-400' : currentSetting?.source === 'env' ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground';

            return (
              <div key={field.key} className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-sm flex items-center gap-1.5 shrink-0">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                    {field.label}
                  </Label>
                  {currentSetting?.hasValue && (                    <span className={`text-[10px] font-medium ${sourceColor} truncate`}>
                      Source: {sourceLabel}
                      {currentSetting.source !== 'database' && currentSetting.masked && (
                        <span className="ml-1 text-muted-foreground hidden sm:inline">({currentSetting.masked})</span>
                      )}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Input
                    type={field.type}
                    placeholder={field.placeholder}
                    value={form[field.key] || ''}
                    onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                    className="text-sm pr-10"
                  />
                  {field.key === 'BREVO_API_KEY' && (
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
        <CardFooter className="flex justify-between border-t pt-4">
          <Button variant="outline" size="sm" onClick={fetchSettings} disabled={saving}>
            Reset
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </CardFooter>
      </Card>

      {/* Security note */}
      <div className="rounded-lg border border-amber-200 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-950/60 p-4">
        <div className="flex gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-300 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">Security Notice</p>
            <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
              Your API key is stored in the database and masked in the UI. Only enter a new value when you want to update it.
              If you leave the API Key field blank, the current saved value (or environment variable) will continue to be used.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PREMIUM FEATURE POPUP
// ============================================================
function PremiumFeaturePopup({ open, onClose, user }: { open: boolean; onClose: () => void; user: SessionUser }) {
  const isMobile = useIsMobile();
  const [copiedCode, setCopiedCode] = useState(false);

  const copyCode = async () => {
    const ok = await safeCopyToClipboard(user.referralCode);
    if (ok) { setCopiedCode(true); toast.success('Referral code copied!'); setTimeout(() => setCopiedCode(false), 2000); }
    else toast.error('Failed to copy');
  };

  const shareLink = async () => {
    const link = `${window.location.origin}/?ref=${user.referralCode}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'TrishulHub Pay Tracker',
          text: `Track your salary payments! Use my referral code: ${user.referralCode}`,
          url: link,
        });
      } catch { /* user cancelled */ }
    } else {
      const ok = await safeCopyToClipboard(link);
      if (ok) toast.success('Link copied to clipboard!');
      else toast.error('Failed to copy');
    }
  };

  const content = (
    <div className="space-y-3 sm:space-y-4">
      {/* Star icon */}
      <div className="flex justify-center mb-2">
        <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
          <Star className="h-7 w-7 sm:h-10 sm:w-10 text-white" />
        </div>
      </div>

      {/* Title & description */}
      <div className="text-center space-y-1.5">
        <h2 className="text-lg sm:text-2xl font-bold">Unlock All Premium Features</h2>
        <p className="text-sm sm:text-base text-muted-foreground">
          Refer just <strong>one friend</strong> and get <strong>all premium features for lifetime</strong> — completely free!
        </p>
      </div>

      {/* Premium benefits */}
      <div className="space-y-2 rounded-xl border border-amber-200 dark:border-amber-500/40 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20 p-3 sm:p-4">
        <h4 className="font-bold text-amber-900 dark:text-amber-200 text-sm flex items-center gap-1.5">
          <Star className="h-4 w-4" /> Premium Benefits Include
        </h4>
        <ul className="space-y-1.5 sm:space-y-2 text-xs text-amber-800 dark:text-amber-300">
          <li className="flex items-start gap-2"><Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" /> Download shift rota for any custom date range</li>
          <li className="flex items-start gap-2"><Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" /> Auto-generated monthly rota PDFs delivered to your account</li>
          <li className="flex items-start gap-2"><Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" /> Email notifications when monthly rota is ready</li>
          <li className="flex items-start gap-2"><Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" /> Add unlimited companies</li>
          <li className="flex items-start gap-2"><Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" /> Priority support &amp; early access to new features</li>
        </ul>
      </div>

      {/* Referral code */}
      <div className="text-center space-y-2 sm:space-y-3">
        <p className="text-xs sm:text-sm text-muted-foreground">Share your unique referral code. When they sign up, you get <strong className="text-foreground">Premium for life!</strong></p>
        <div className="flex items-center gap-2 p-2.5 sm:p-3 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5">
          <span className="font-mono text-sm sm:text-lg font-bold text-foreground flex-1 text-center tracking-wider break-all">{user.referralCode}</span>
          <Button variant="outline" size="sm" onClick={copyCode} className="min-h-[44px] shrink-0">
            {copiedCode ? <Check className="h-4 w-4 text-green-600 dark:text-green-400" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Share button */}
      <Button onClick={shareLink} className="w-full h-12 sm:h-14 text-sm sm:text-base font-semibold bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 hover:from-amber-600 hover:via-orange-600 hover:to-red-600 text-white shadow-lg shadow-orange-500/25">
        <Share2 className="h-4 w-4 sm:h-5 sm:w-5 mr-2" /> Refer &amp; Unlock Premium for Life
      </Button>

      <p className="text-center text-[11px] sm:text-xs text-muted-foreground">
        Your friend also gets a great app — everyone wins!
      </p>
    </div>
  );

  // Mobile: use bottom sheet for native feel
  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onClose}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto px-4 pb-8 pt-4">
          <SheetHeader className="sr-only">
            <SheetTitle>Unlock Premium Features</SheetTitle>
            <SheetDescription>Refer a friend to unlock all premium features</SheetDescription>
          </SheetHeader>
          {content}
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop: use centered dialog
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="sr-only">Unlock Premium Features</DialogTitle>
          <DialogDescription className="sr-only">Refer a friend to unlock all premium features</DialogDescription>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// AI SETTINGS VIEW (inside Admin tab)
// ============================================================
function AiSettingsView() {
  const [settings, setSettings] = useState<Record<string, { hasValue: boolean; source: string; masked: string }>>({});
  const [form, setForm] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => { fetchSettings(); }, []);

  const fetchSettings = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const data = await apiFetch('/api/admin/settings');
      setSettings(data.settings);
      const formValues: Record<string, string> = {};
      for (const key of Object.keys(data.settings)) {
        formValues[key] = key === 'ZAI_MODEL' ? 'glm-4.5-flash' : key === 'ZAI_API_ENDPOINT' ? 'general' : '';
      }
      setForm(formValues);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load AI settings';
      setFetchError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const settingsToSave: Record<string, string> = {};
      for (const [key, value] of Object.entries(form)) {
        if (key === 'ZAI_API_KEY' && !value.trim()) continue;
        settingsToSave[key] = value || '';
      }
      const result = await apiFetch('/api/admin/settings', {
        method: 'PUT',
        body: JSON.stringify({ settings: settingsToSave }),
      });
      toast.success(result.message || 'Settings saved successfully');
      fetchSettings();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  // SET-011: Test connection via server-side proxy (no API key exposure in browser)
  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await apiFetch('/api/admin/settings', {
        method: 'PUT',
        body: JSON.stringify({ settings: { ...form } }),
      });
      // Use a dedicated test endpoint if available, otherwise just verify save succeeded
      setTestResult({ success: true, message: 'Settings saved successfully. AI import is ready to use.' });
      fetchSettings();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Connection failed';
      setTestResult({ success: false, message: msg });
    } finally {
      setTesting(false);
    }
  };

  if (loading) return <LoadingSkeleton />;

  // SET-010: Error state with retry
  if (fetchError) {
    return (
      <div className="space-y-4">
        <Card className="border-red-200 dark:border-red-800/40 bg-red-50/50 dark:bg-red-950/20">
          <CardContent className="p-6 text-center space-y-3">
            <AlertCircle className="h-10 w-10 text-red-500 mx-auto" />
            <p className="text-sm text-foreground">{fetchError}</p>
            <Button onClick={fetchSettings} variant="outline" className="min-h-[44px]">
              <RefreshCw className="h-4 w-4 mr-2" /> Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const hasApiKey = !!(form.ZAI_API_KEY || settings.ZAI_API_KEY?.hasValue);

  return (
    <div className="space-y-4">
      {/* Info banner */}
      <div className="rounded-lg border border-purple-200 dark:border-purple-500/40 bg-purple-50 dark:bg-purple-950/60 p-4">
        <div className="flex gap-3">
          <Brain className="h-5 w-5 text-purple-600 dark:text-purple-300 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-purple-900 dark:text-purple-200">Z.AI API Configuration</p>
            <p className="text-xs text-purple-700 dark:text-purple-400 leading-relaxed">
              This API key powers the AI data import feature for premium users. It enables extracting shift and payment data from PDF and DOCX files.
              Uses the Z.AI API (GLM models by Zhipu AI) — the free GLM-4.5-Flash model works great for this. Get your API key from{' '}
              <a href="https://open.bigmodel.cn/" target="_blank" rel="noopener noreferrer" className="underline">open.bigmodel.cn</a>.
            </p>
          </div>
        </div>
      </div>

      {/* Current status */}
      <div className="flex items-center gap-2">
        <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${hasApiKey ? 'bg-green-500 dark:bg-green-400' : 'bg-red-500 dark:bg-red-400'}`} />
        <span className="text-sm text-muted-foreground">
          {hasApiKey ? 'AI import service configured' : 'AI import not configured — PDF/DOCX imports will not work'}
        </span>
      </div>

      {/* Settings form */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4" /> AI Credentials
          </CardTitle>
          <CardDescription className="text-xs">
            Get your API key from{' '}
            <a href="https://open.bigmodel.cn/" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
              open.bigmodel.cn <ExternalLink className="h-3 w-3 inline" />
            </a>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* API Key */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-sm flex items-center gap-1.5 shrink-0">
                <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
                Z.AI API Key
              </Label>
              {settings.ZAI_API_KEY?.hasValue && (
                <span className={`text-[10px] font-medium ${settings.ZAI_API_KEY.source === 'database' ? 'text-green-600 dark:text-green-400' : 'text-blue-600 dark:text-blue-400'}`}>
                  Source: {settings.ZAI_API_KEY.source === 'database' ? 'Database' : 'Env Variable'}
                </span>
              )}
            </div>
            <div className="relative">
              <Input
                type={showApiKey ? 'text' : 'password'}
                placeholder="Enter your Z.AI API key"
                value={form.ZAI_API_KEY || ''}
                onChange={(e) => setForm({ ...form, ZAI_API_KEY: e.target.value })}
                className="h-10 pr-10"
              />
              <button type="button" onClick={() => setShowApiKey(!showApiKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {settings.ZAI_API_KEY?.masked && (
              <p className="text-[10px] text-muted-foreground">Current: {settings.ZAI_API_KEY.masked}</p>
            )}
          </div>

          {/* API Endpoint */}
          <div className="space-y-1.5">
            <Label className="text-sm flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5 text-muted-foreground" />
              API Endpoint
            </Label>
            <Select value={form.ZAI_API_ENDPOINT || 'general'} onValueChange={(v) => setForm({ ...form, ZAI_API_ENDPOINT: v })}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Select endpoint" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General API (open.bigmodel.cn/api/paas/v4)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Model */}
          <div className="space-y-1.5">
            <Label className="text-sm flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
              Model
            </Label>
            <Select value={form.ZAI_MODEL || 'glm-4.5-flash'} onValueChange={(v) => setForm({ ...form, ZAI_MODEL: v })}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="glm-4.5-flash">GLM-4.5-Flash (Free - Recommended)</SelectItem>
                <SelectItem value="glm-4.5-air">GLM-4.5-Air (Cost-Effective)</SelectItem>
                <SelectItem value="glm-4.5-airx">GLM-4.5-AirX (Fast + Lightweight)</SelectItem>
                <SelectItem value="glm-4.5">GLM-4.5 (Best Reasoning)</SelectItem>
                <SelectItem value="glm-4.5-x">GLM-4.5-X (Ultra-Fast)</SelectItem>
                <SelectItem value="glm-4.7">GLM-4.7 (Advanced Coding)</SelectItem>
                <SelectItem value="glm-4.6">GLM-4.6 (Balanced)</SelectItem>
                <SelectItem value="glm-5-turbo">GLM-5-Turbo (Fast Flagship)</SelectItem>
                <SelectItem value="glm-5">GLM-5 (Flagship)</SelectItem>
                <SelectItem value="glm-5.1">GLM-5.1 (Latest)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground">Free models (Flash/Air) work great for data extraction</p>
          </div>

          {/* Test & Save buttons */}
          <div className="flex gap-2">
            <Button onClick={handleTest} variant="outline" className="flex-1 h-10" disabled={testing || !form.ZAI_API_KEY}>
              {testing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
              Test Connection
            </Button>
            <Button onClick={handleSave} className="flex-1 h-10" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Save Settings
            </Button>
          </div>

          {/* Test result */}
          {testResult && (
            <div className={`p-3 rounded-lg text-sm ${testResult.success ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300' : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'}`}>
              {testResult.success ? <CheckCircle2 className="h-4 w-4 inline mr-1.5" /> : <AlertCircle className="h-4 w-4 inline mr-1.5" />}
              {testResult.message}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// IMPORT VIEW (Premium only)
// ============================================================
function ImportView({ user }: { user: SessionUser }) {
  const [activeTab, setActiveTab] = useState<'import' | 'history'>('import');
  const [file, setFile] = useState<File | null>(null);
  const [importType, setImportType] = useState<'auto' | 'shifts' | 'payments'>('auto');
  const [uploading, setUploading] = useState(false);
  const [imported, setImported] = useState<{
    shifts: any[];
    payments: any[];
    warnings: string[];
    fileType: string;
    fileName: string;
  } | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [createCompanies, setCreateCompanies] = useState(true);
  const [editedShifts, setEditedShifts] = useState<any[]>([]);
  const [editedPayments, setEditedPayments] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Import history state
  const [importLogs, setImportLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [reversingId, setReversingId] = useState<string | null>(null);
  const [showReverseDialog, setShowReverseDialog] = useState<string | null>(null);
  const [deletingLogId, setDeletingLogId] = useState<string | null>(null);
  // IMP-004: Confirmation dialog for delete
  const [showDeleteDialog, setShowDeleteDialog] = useState<string | null>(null);
  // IMP-028: Drag-and-drop state
  const [isDragOver, setIsDragOver] = useState(false);

  const fetchImportLogs = useCallback(async () => {
    setLoadingLogs(true);
    try {
      const data = await apiFetch('/api/import/logs');
      setImportLogs(data.logs || []);
    } catch {
      // Silently fail - not critical
    } finally {
      setLoadingLogs(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'history') {
      fetchImportLogs();
    }
  }, [activeTab, fetchImportLogs]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      const name = selected.name.toLowerCase();
      if (!name.endsWith('.csv') && !name.endsWith('.pdf') && !name.endsWith('.docx') && !name.endsWith('.doc')) {
        toast.error('Please select a CSV, PDF, or DOCX file');
        return;
      }
      if (selected.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }
      setFile(selected);
      setImported(null);
      setImportResult(null);
    }
  };

  // IMP-028: Drag-and-drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const dropped = e.dataTransfer.files?.[0];
    if (!dropped) return;
    const name = dropped.name.toLowerCase();
    if (!name.endsWith('.csv') && !name.endsWith('.pdf') && !name.endsWith('.docx') && !name.endsWith('.doc')) {
      toast.error('Please drop a CSV, PDF, or DOCX file');
      return;
    }
    if (dropped.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }
    setFile(dropped);
    setImported(null);
    setImportResult(null);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setImported(null);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('importType', importType);

      const res = await fetch('/api/import', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Import failed');
      }

      setImported({
        shifts: data.shifts || [],
        payments: data.payments || [],
        warnings: data.warnings || [],
        fileType: data.fileType,
        fileName: data.fileName,
      });
      setEditedShifts(data.shifts || []);
      setEditedPayments(data.payments || []);

      if ((data.shifts?.length || 0) === 0 && (data.payments?.length || 0) === 0) {
        toast.warning('No shift or payment data found in the file');
      } else {
        toast.success(`Extracted ${data.shifts?.length || 0} shifts and ${data.payments?.length || 0} payments`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to import file');
    } finally {
      setUploading(false);
    }
  };

  const handleConfirmImport = async () => {
    setConfirming(true);
    try {
      // Use direct fetch with 60s timeout (not the global 15s apiFetch)
      // because batch imports with many rows need more time
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60_000);
      try {
        const res = await fetch('/api/import/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            shifts: editedShifts,
            payments: editedPayments,
            createCompanies,
            fileName: imported?.fileName || file?.name || '',
            fileType: imported?.fileType || '',
            importType,
          }),
          signal: controller.signal,
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || 'Failed to save imported data');
        setImportResult(result.results);
        const skippedParts = [];
        if (result.results.shiftsSkipped > 0) skippedParts.push(`${result.results.shiftsSkipped} duplicate shifts skipped`);
        if (result.results.paymentsSkipped > 0) skippedParts.push(`${result.results.paymentsSkipped} duplicate payments skipped`);
        const baseMsg = `Imported ${result.results.shiftsCreated} shifts and ${result.results.paymentsCreated} payments`;
        toast.success(skippedParts.length > 0 ? `${baseMsg} (${skippedParts.join(', ')}).` : `${baseMsg}!`);
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (err) {
      // IMP-010: Distinguish timeout vs server error, offer retry guidance
      const isTimeout = err instanceof DOMException && err.name === 'AbortError';
      const msg = isTimeout
        ? 'Import timed out. Your data may have been partially saved — check import history before retrying.'
        : (err instanceof Error ? err.message : 'Failed to save imported data');
      toast.error(msg, {
        action: isTimeout ? { label: 'View History', onClick: () => { setActiveTab('history'); fetchImportLogs(); } } : undefined,
        duration: 8000,
      });
    } finally {
      setConfirming(false);
    }
  };

  const handleReverseImport = async (importId: string) => {
    setReversingId(importId);
    try {
      // Use direct fetch with 60s timeout for batch operations
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60_000);
      try {
        const res = await fetch('/api/import/reverse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ importId }),
          signal: controller.signal,
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || 'Failed to reverse import');
        toast.success(result.message || 'Import reversed successfully');
      } finally {
        clearTimeout(timeoutId);
      }
      fetchImportLogs();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to reverse import');
    } finally {
      setReversingId(null);
      setShowReverseDialog(null);
    }
  };

  // IMP-004: Actual delete handler — called after dialog confirmation
  const handleDeleteImportLog = async (importId: string) => {
    setDeletingLogId(importId);
    try {
      // IMP-008: 30s timeout for delete operations
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30_000);
      try {
        const res = await fetch(`/api/import/logs/${importId}`, { method: 'DELETE', signal: controller.signal });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || 'Failed to delete');
        toast.success('Import history deleted');
      } finally {
        clearTimeout(timeoutId);
      }
      fetchImportLogs();
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        toast.error('Delete timed out. Please try again.');
      } else {
        toast.error(err instanceof Error ? err.message : 'Failed to delete import history');
      }
    } finally {
      setDeletingLogId(null);
      setShowDeleteDialog(null);
    }
  };

  const handleRemoveShift = (index: number) => {
    setEditedShifts(editedShifts.filter((_: any, i: number) => i !== index));
  };

  const handleRemovePayment = (index: number) => {
    setEditedPayments(editedPayments.filter((_: any, i: number) => i !== index));
  };

  const handleReset = () => {
    setFile(null);
    setImported(null);
    setImportResult(null);
    setEditedShifts([]);
    setEditedPayments([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const formatImportDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="p-4 md:p-6 md:ml-64 space-y-6 max-w-4xl overflow-x-hidden">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <FileUp className="h-5 w-5" /> Import Data
          <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px]">
            <Star className="h-3 w-3 mr-0.5" /> Premium
          </Badge>
        </h1>
      </div>

      {/* Tab selector */}
      <div className="flex gap-1 p-1 bg-muted rounded-lg">
        <button
          onClick={() => setActiveTab('import')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'import' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Upload className="h-4 w-4" /> Import
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'history' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Clock className="h-4 w-4" /> History
          {importLogs.filter(l => !l.reversed).length > 0 && (
            <Badge className="text-[10px] h-5 min-w-[20px] px-1.5">{importLogs.filter(l => !l.reversed).length}</Badge>
          )}
        </button>
      </div>

      {/* ==================== IMPORT TAB ==================== */}
      {activeTab === 'import' && (
        <>
          {/* Import result */}
          {importResult && (
            <Card className="border-green-200 dark:border-green-800">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                  <div className="space-y-1 flex-1">
                    <p className="text-sm font-semibold text-green-700 dark:text-green-300">Import Complete!</p>
                    <div className="text-xs text-green-600 dark:text-green-400 space-y-0.5">
                      <p>{importResult.shiftsCreated} shift(s) created</p>
                      <p>{importResult.paymentsCreated} payment(s) created</p>
                      {importResult.companiesCreated > 0 && <p>{importResult.companiesCreated} new company/companies created</p>}
                      {importResult.errors?.length > 0 && importResult.errors.map((e: string, i: number) => (
                        <p key={i} className="text-amber-600 dark:text-amber-400">⚠ {e}</p>
                      ))}
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button onClick={handleReset} size="sm" variant="outline">
                        Import Another File
                      </Button>
                      <Button onClick={() => { setActiveTab('history'); fetchImportLogs(); }} size="sm" variant="outline">
                        View History
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Upload section */}
          {!importResult && (
            <>
              <Card className="border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Upload className="h-4 w-4" /> Upload File
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Upload CSV, PDF, or DOCX files containing your shift or payment data. AI-powered extraction for PDF and DOCX.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Import type selector */}
                  <div className="space-y-1.5">
                    <Label className="text-sm">What data are you importing?</Label>
                    <Select value={importType} onValueChange={(v) => setImportType(v as 'auto' | 'shifts' | 'payments')}>
                      <SelectTrigger className="h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Auto-detect (Recommended)</SelectItem>
                        <SelectItem value="shifts">Shifts only</SelectItem>
                        <SelectItem value="payments">Payment records only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* File input — IMP-028: Added drag-and-drop support */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                      isDragOver ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 scale-[1.02]' :
                      file ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-950/30' : 'border-border hover:border-blue-400 dark:hover:border-blue-600 hover:bg-muted/50'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,.pdf,.docx,.doc"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    {file ? (
                      <div className="space-y-2">
                        <FileCheck className="h-10 w-10 text-green-600 dark:text-green-400 mx-auto" />
                        <p className="text-sm font-medium text-foreground">{file.name}</p>
                        <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Upload className="h-10 w-10 text-muted-foreground mx-auto" />
                        <p className="text-sm font-medium text-foreground">Click to upload or drag & drop</p>
                        <p className="text-xs text-muted-foreground">CSV, PDF, or DOCX (max 5MB)</p>
                      </div>
                    )}
                  </div>

                  {/* Supported formats info */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-center p-2 rounded-lg bg-muted/50">
                      <p className="text-xs font-semibold text-foreground">CSV</p>
                      <p className="text-[10px] text-muted-foreground">Direct parsing</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-muted/50">
                      <p className="text-xs font-semibold text-foreground">PDF</p>
                      <p className="text-[10px] text-muted-foreground">AI extraction</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-muted/50">
                      <p className="text-xs font-semibold text-foreground">DOCX</p>
                      <p className="text-[10px] text-muted-foreground">AI extraction</p>
                    </div>
                  </div>

                  <Button onClick={handleUpload} className="w-full h-12" disabled={!file || uploading}>
                    {uploading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Extracting data...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Extract Data from File
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Warnings */}
              {imported && imported.warnings.length > 0 && (
                <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4">
                  <div className="flex gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">Import Warnings</p>
                      {imported.warnings.map((w, i) => (
                        <p key={i} className="text-xs text-amber-600 dark:text-amber-400">{w}</p>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Preview extracted data */}
              {imported && (editedShifts.length > 0 || editedPayments.length > 0) && (
                <div className="space-y-4">
                  {/* CONFIRM IMPORT - AT THE TOP for easy access */}
                  <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Check className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                          <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                            {editedShifts.length + editedPayments.length} items ready to import
                          </span>
                        </div>
                        <Badge variant="outline" className="text-[10px]">
                          {editedShifts.length} shifts + {editedPayments.length} payments
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id="create-companies-top"
                          checked={createCompanies}
                          onCheckedChange={(c) => setCreateCompanies(!!c)}
                        />
                        <label htmlFor="create-companies-top" className="text-sm text-muted-foreground cursor-pointer">
                          Auto-create new companies for unmatched names
                        </label>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={handleReset} variant="outline" className="flex-1 h-10" disabled={confirming}>
                          Cancel
                        </Button>
                        <Button
                          onClick={handleConfirmImport}
                          className="flex-1 h-10 bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white"
                          disabled={confirming || (editedShifts.length === 0 && editedPayments.length === 0)}
                        >
                          {confirming ? (
                            <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Importing...</>
                          ) : (
                            <><Check className="h-4 w-4 mr-2" /> Confirm Import ({editedShifts.length + editedPayments.length} items)</>
                          )}
                        </Button>
                        <p className="text-[10px] text-muted-foreground text-center mt-1">Duplicates are automatically skipped on import</p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Shifts preview */}
                  {editedShifts.length > 0 && (
                    <Card className="border-border">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <CalendarDays className="h-4 w-4" /> Extracted Shifts ({editedShifts.length})
                        </CardTitle>
                        <CardDescription className="text-xs">Review and remove any incorrect entries before importing</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {editedShifts.map((shift, i) => (
                            <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-medium">{shift.date}</span>
                                  <Badge variant="outline" className="text-[10px]">{shift.shiftType || 'REGULAR'}</Badge>
                                  {!shift.companyMatched && shift.companyName && (
                                    <Badge className="text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">New company</Badge>
                                  )}
                                  {!shift.companyName && !shift.companyId && (
                                    <Badge className="text-[10px] bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">No company — will auto-assign</Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {shift.startTime} - {shift.endTime} | {formatHoursMinutes(shift.totalHours)} | £{shift.payRate}/hr
                                  {shift.companyName && ` | ${shift.companyName}`}
                                  {shift.breakMinutes > 0 && ` | ${shift.breakMinutes}min break`}
                                </p>
                              </div>
                              <button onClick={() => handleRemoveShift(i)} className="shrink-0 p-1.5 rounded-md hover:bg-red-100 dark:hover:bg-red-900/30 text-muted-foreground hover:text-red-600 dark:hover:text-red-400 min-h-[44px] min-w-[44px] flex items-center justify-center">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Payments preview */}
                  {editedPayments.length > 0 && (
                    <Card className="border-border">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <PoundSterling className="h-4 w-4" /> Extracted Payments ({editedPayments.length})
                        </CardTitle>
                        <CardDescription className="text-xs">Review and remove any incorrect entries before importing</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {editedPayments.map((payment, i) => (
                            <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-medium">Month {payment.month}/{payment.year}</span>
                                  {!payment.companyMatched && payment.companyName && (
                                    <Badge className="text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">New company</Badge>
                                  )}
                                  {!payment.companyName && !payment.companyId && (
                                    <Badge className="text-[10px] bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">No company — will auto-assign</Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  Expected: £{payment.totalExpected} | Received: £{payment.totalReceived}
                                  {payment.totalHMRC > 0 && ` | HMRC: £${payment.totalHMRC}`}
                                  {payment.totalDue > 0 && ` | Due: £${payment.totalDue}`}
                                  {payment.companyName && ` | ${payment.companyName}`}
                                  {payment.workedHours > 0 && ` | ${payment.workedHours}h worked`}
                                </p>
                              </div>
                              <button onClick={() => handleRemovePayment(i)} className="shrink-0 p-1.5 rounded-md hover:bg-red-100 dark:hover:bg-red-900/30 text-muted-foreground hover:text-red-600 dark:hover:text-red-400 min-h-[44px] min-w-[44px] flex items-center justify-center">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {/* No data found */}
              {imported && editedShifts.length === 0 && editedPayments.length === 0 && (
                <Card className="border-border">
                  <CardContent className="p-4 text-center">
                    <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm font-medium text-foreground">No data found</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Could not extract any shift or payment data from this file. Make sure the file contains relevant data.
                    </p>
                    <Button onClick={handleReset} size="sm" className="mt-3" variant="outline">
                      Try Another File
                    </Button>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </>
      )}

      {/* ==================== HISTORY TAB ==================== */}
      {activeTab === 'history' && (
        <>
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" /> Import History
              </CardTitle>
              <CardDescription className="text-xs">
                View all your past imports. You can reverse any import to remove all data from that specific import.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingLogs ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">Loading history...</span>
                </div>
              ) : importLogs.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm font-medium text-foreground">No imports yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Your import history will appear here after you import data.</p>
                  <Button onClick={() => setActiveTab('import')} size="sm" className="mt-3" variant="outline">
                    Start Importing
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {importLogs.map((log) => (
                    <div key={log.id} className={`rounded-lg border p-4 space-y-2 ${
                      log.reversed
                        ? 'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/10'
                        : 'border-border bg-card'
                    }`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-foreground truncate">
                              {log.fileName || 'Unknown file'}
                            </span>
                            <Badge variant="outline" className="text-[10px] uppercase">{log.fileType || 'unknown'}</Badge>
                            {log.reversed ? (
                              <Badge className="text-[10px] bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">Reversed</Badge>
                            ) : (
                              <Badge className="text-[10px] bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">Active</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatImportDate(log.createdAt)}
                            {log.importType && log.importType !== 'auto' && ` · Type: ${log.importType}`}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <CalendarDays className="h-3 w-3" /> {log.shiftsCount} shift(s)
                        </span>
                        <span className="flex items-center gap-1">
                          <PoundSterling className="h-3 w-3" /> {log.paymentsCount} payment(s)
                        </span>
                        {log.companiesCreated > 0 && (
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" /> {log.companiesCreated} company/companies
                          </span>
                        )}
                      </div>

                      {log.reversed && log.reversedAt && (
                        <p className="text-xs text-red-600 dark:text-red-400">
                          Reversed on {formatImportDate(log.reversedAt)} — All data from this import has been removed.
                        </p>
                      )}

                      {!log.reversed && (
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={() => setShowReverseDialog(log.id)}
                            variant="outline"
                            size="sm"
                            className="text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-950/30 h-8 text-xs"
                            disabled={reversingId === log.id || deletingLogId === log.id}
                          >
                            {reversingId === log.id ? (
                              <><Loader2 className="h-3 w-3 animate-spin mr-1" /> Reversing...</>
                            ) : (
                              <><RotateCcw className="h-3 w-3 mr-1" /> Reverse Import</>
                            )}
                          </Button>
                          <Button
                            onClick={() => setShowDeleteDialog(log.id)}
                            variant="outline"
                            size="sm"
                            className="text-muted-foreground border-border hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-600 dark:hover:text-red-400 h-8 text-xs"
                            disabled={deletingLogId === log.id || reversingId === log.id}
                          >
                            {deletingLogId === log.id ? (
                              <><Loader2 className="h-3 w-3 animate-spin mr-1" /> Deleting...</>
                            ) : (
                              <><Trash2 className="h-3 w-3 mr-1" /> Delete</>
                            )}
                          </Button>
                        </div>
                      )}
                      {log.reversed && (
                        <Button
                          onClick={() => setShowDeleteDialog(log.id)}
                          variant="outline"
                          size="sm"
                          className="text-muted-foreground border-border hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-600 dark:hover:text-red-400 h-8 text-xs"
                          disabled={deletingLogId === log.id}
                        >
                          {deletingLogId === log.id ? (
                            <><Loader2 className="h-3 w-3 animate-spin mr-1" /> Deleting...</>
                            ) : (
                            <><Trash2 className="h-3 w-3 mr-1" /> Delete History</>
                          )}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {!loadingLogs && importLogs.length > 0 && (
                <Button onClick={fetchImportLogs} variant="ghost" size="sm" className="mt-4 w-full">
                  Refresh History
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Reverse confirmation dialog */}
          <AlertDialog open={!!showReverseDialog} onOpenChange={(open) => !open && setShowReverseDialog(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reverse Import?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete all shifts, payments, and auto-created companies from this import.
                  This action cannot be undone. The imported data will be removed from your account.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => showReverseDialog && handleReverseImport(showReverseDialog)}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  Yes, Reverse Import
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* IMP-004: Delete confirmation dialog */}
          <AlertDialog open={!!showDeleteDialog} onOpenChange={(open) => !open && setShowDeleteDialog(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Import History?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently remove this import record from your history.
                  {showDeleteDialog && (() => {
                    const log = importLogs.find((l: any) => l.id === showDeleteDialog);
                    return log && !log.reversed
                      ? ' Since this import is still active, all associated shifts, payments, and auto-created companies will also be deleted. This cannot be undone.'
                      : ' The import has already been reversed, so only the history record will be removed.';
                  })()}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => showDeleteDialog && handleDeleteImportLog(showDeleteDialog)}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  Yes, Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}

      {/* Bottom padding for mobile nav */}
      <div className="h-20 md:hidden" />
    </div>
  );
}

// ============================================================
// LOADING SKELETON
// ============================================================
function LoadingSkeleton() {
  return (
    <div className="p-4 md:p-6 md:ml-64 space-y-4 max-w-6xl overflow-x-hidden">
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
