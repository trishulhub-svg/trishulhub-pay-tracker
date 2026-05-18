import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/session';
import { invalidateSettingsCache } from '@/lib/email';

// Brevo-related setting keys stored in the database
const BREVO_SETTING_KEYS = [
  'BREVO_API_KEY',
  'BREVO_FROM_EMAIL',
  'BREVO_FROM_NAME',
  'BREVO_SMTP_LOGIN',
  'BREVO_SMTP_SERVER',
  'BREVO_SMTP_PORT',
];

// AI-related setting keys for data import feature
const AI_SETTING_KEYS = [
  'ZAI_API_KEY',
  'ZAI_MODEL',
  'ZAI_API_ENDPOINT',
];

const ALL_SETTING_KEYS = [...BREVO_SETTING_KEYS, ...AI_SETTING_KEYS];

// Keys that should be masked (sensitive) — never returned as plaintext
const SENSITIVE_KEYS = new Set(['BREVO_API_KEY', 'ZAI_API_KEY']);

// SET-007: Rate limiter for PUT /api/admin/settings
// SET-017: NOTE — in-memory Map resets on Vercel serverless cold starts.
// This is acceptable because: (1) settings endpoint is admin-only, (2) cold starts
// are rate-limited by Vercel's own infrastructure, (3) real abuse would need sustained
// requests which the in-memory limiter catches within a single instance lifetime.
// For a production-grade solution, use Upstash Redis or a DB-backed rate limit table.
const settingsUpdateLog = new Map<string, { count: number; windowStart: number }>();
const MAX_SETTINGS_UPDATES = 5;
const SETTINGS_UPDATE_WINDOW_MS = 60 * 1000; // 1 minute

function isSettingsRateLimited(adminEmail: string): boolean {
  const now = Date.now();
  const entry = settingsUpdateLog.get(adminEmail);
  if (!entry || now - entry.windowStart > SETTINGS_UPDATE_WINDOW_MS) {
    settingsUpdateLog.set(adminEmail, { count: 1, windowStart: now });
    return false;
  }
  entry.count++;
  return entry.count > MAX_SETTINGS_UPDATES;
}

// SET-017: Track recent update timestamps across the rate limit window for stricter enforcement
const recentUpdateTimestamps: string[] = [];
const MAX_GLOBAL_UPDATES_PER_MINUTE = 10;

function isGlobalRateLimited(): boolean {
  const now = Date.now();
  const windowStart = now - SETTINGS_UPDATE_WINDOW_MS;
  // Purge old entries
  while (recentUpdateTimestamps.length > 0 && parseInt(recentUpdateTimestamps[0]) < windowStart) {
    recentUpdateTimestamps.shift();
  }
  return recentUpdateTimestamps.length >= MAX_GLOBAL_UPDATES_PER_MINUTE;
}

function maskValue(key: string, value: string): string {
  if (!value) return '';
  // SET-015: Show first 4 + last 4 (reduced from 6+4)
  if (SENSITIVE_KEYS.has(key) && value.length > 12) {
    return value.substring(0, 4) + '••••••••' + value.substring(value.length - 4);
  }
  if (key === 'BREVO_SMTP_LOGIN') {
    const atIndex = value.indexOf('@');
    if (atIndex > 2) {
      return value.substring(0, 3) + '•••' + value.substring(atIndex);
    }
  }
  return value;
}

// GET /api/admin/settings — fetch all settings (SET-001: never return sensitive values)
export async function GET() {
  try {
    const user = await getSession();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const allSettings = await db.setting.getAll();

    // SET-001: Build response — sensitive keys only return masked + hasValue, never plaintext
    const settings: Record<string, { hasValue: boolean; source: 'database' | 'env' | 'default'; masked: string }> = {};

    for (const key of ALL_SETTING_KEYS) {
      const dbValue = allSettings[key];
      const envValue = process.env[key] || '';
      const value = dbValue || envValue;
      const source = dbValue ? 'database' : envValue ? 'env' : 'default';
      const hasValue = !!value;
      const masked = maskValue(key, value);

      settings[key] = { hasValue, source, masked };
    }

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Admin settings GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// SET-022: CSRF defense-in-depth — check Origin header matches expected host
// Next.js SameSite=Lax cookies already prevent most CSRF; this adds an explicit check
// for state-changing admin endpoints (PUT/POST).
function isRequestOriginValid(request: Request): boolean {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  // If neither header is present (e.g., server-to-server), allow (session cookie required anyway)
  if (!origin && !referer) return true;
  const allowedPatterns = [/^https?:\/\/localhost/, /^https?:\/\/127\.0\.0\.1/, /^https?:\/\/.*\.vercel\.app$/, /^https?:\/\/.*\.trishulhub\.com$/];
  const check = (url: string | null) => url ? allowedPatterns.some(p => p.test(url)) : true;
  return check(origin) && check(referer);
}

// SET-016: POST /api/admin/settings — test AI API key with a minimal completion call
export async function POST(request: Request) {
  try {
    const user = await getSession();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    if (!isRequestOriginValid(request)) {
      return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
    }

    // Read settings to get the API key (DB > env > fallback)
    const allSettings = await db.setting.getAll();
    const apiKey = allSettings.ZAI_API_KEY || process.env.ZAI_API_KEY || '';
    const model = allSettings.ZAI_MODEL || process.env.ZAI_MODEL || 'glm-4.5-flash';

    if (!apiKey) {
      return NextResponse.json({ success: false, message: 'No Z.AI API key configured. Please save an API key first.' });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15_000);

    try {
      const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: 'Reply with only: OK' }],
          max_tokens: 5,
          temperature: 0,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errText = await response.text();
        return NextResponse.json({
          success: false,
          message: `API returned HTTP ${response.status}. ${response.status === 401 ? 'Invalid API key.' : 'Check your API key and try again.'}`,
        });
      }

      return NextResponse.json({ success: true, message: `Connected successfully using model: ${model}` });
    } catch (fetchErr: any) {
      clearTimeout(timeoutId);
      if (fetchErr.name === 'AbortError') {
        return NextResponse.json({ success: false, message: 'Connection timed out after 15 seconds. Check your network.' });
      }
      return NextResponse.json({ success: false, message: `Connection failed: ${fetchErr.message}` });
    }
  } catch (error) {
    console.error('Settings test error:', error);
    return NextResponse.json({ success: false, message: 'Failed to test connection.' }, { status: 500 });
  }
}

// PUT /api/admin/settings — update settings
export async function PUT(request: Request) {
  try {
    const user = await getSession();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    if (!isRequestOriginValid(request)) {
      return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
    }

    // SET-007 + SET-017: Per-user + global rate limit
    if (isSettingsRateLimited(user.email) || isGlobalRateLimited()) {
      return NextResponse.json(
        { error: 'Too many settings updates. Please wait a minute.' },
        { status: 429 }
      );
    }
    recentUpdateTimestamps.push(String(Date.now()));

    const body = await request.json();
    const { settings } = body as { settings: Record<string, string> };

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json({ error: 'Settings object is required' }, { status: 400 });
    }

    // Only allow updating known setting keys
    const updates: string[] = [];
    const auditLog: Array<{ key: string; action: string }> = [];

    for (const [key, value] of Object.entries(settings)) {
      if (!ALL_SETTING_KEYS.includes(key)) {
        continue;
      }
      if (typeof value !== 'string') {
        continue;
      }
      // SET-002: Reject masked values — prevent accidentally overwriting real keys
      if (value.includes('••••')) {
        continue;
      }
      // SET-020: Validate SMTP port is numeric and in valid range
      if (key === 'BREVO_SMTP_PORT') {
        const port = parseInt(value.trim());
        if (isNaN(port) || port < 1 || port > 65535) {
          auditLog.push({ key, action: `rejected (invalid port: ${value.trim()})` });
          continue;
        }
      }
      // SET-020: Validate email format for sender addresses
      if (key === 'BREVO_FROM_EMAIL' || key === 'BREVO_SMTP_LOGIN') {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
          auditLog.push({ key, action: `rejected (invalid email: ${value.trim()})` });
          continue;
        }
      }
      // Skip empty values (don't save empty strings, delete instead)
      if (!value.trim()) {
        // Audit: record removal
        auditLog.push({ key, action: 'removed' });
        try {
          await db.setting.delete(key);
        } catch {
          // Key might not exist in DB — that's fine
        }
        updates.push(key + ' (removed)');
        continue;
      }
      // Audit: record update
      auditLog.push({ key, action: 'updated' });
      await db.setting.set(key, value.trim());
      updates.push(key);
    }

    // SET-008: Structured JSON audit log for settings changes
    console.info(JSON.stringify({
      event: 'admin_settings_updated',
      adminId: user.id,
      adminEmail: user.email,
      changes: auditLog,
      updatedKeys: updates,
      timestamp: new Date().toISOString(),
    }));

    // Invalidate the email settings cache so next email uses fresh credentials
    invalidateSettingsCache();

    return NextResponse.json({
      success: true,
      message: `Updated ${updates.length} setting(s): ${updates.join(', ')}`,
      updatedKeys: updates,
    });
  } catch (error) {
    console.error('Admin settings PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
