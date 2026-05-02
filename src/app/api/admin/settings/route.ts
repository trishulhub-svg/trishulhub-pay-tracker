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

// Keys that should be masked (sensitive)
const SENSITIVE_KEYS = ['BREVO_API_KEY', 'ZAI_API_KEY'];

// GET /api/admin/settings — fetch all settings (mask sensitive values)
export async function GET() {
  try {
    const user = await getSession();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const allSettings = await db.setting.getAll();

    // Build response with both DB values and env var fallbacks
    const settings: Record<string, { value: string; source: 'database' | 'env' | 'default'; masked: string }> = {};

    for (const key of ALL_SETTING_KEYS) {
      const dbValue = allSettings[key];
      const envValue = process.env[key] || '';
      const value = dbValue || envValue;
      const source = dbValue ? 'database' : envValue ? 'env' : 'default';

      // Mask sensitive values for display
      let masked = '';
      if (value) {
        if (SENSITIVE_KEYS.includes(key) && value.length > 12) {
          masked = value.substring(0, 6) + '••••••••' + value.substring(value.length - 4);
        } else if (key === 'BREVO_SMTP_LOGIN') {
          const atIndex = value.indexOf('@');
          if (atIndex > 2) {
            masked = value.substring(0, 3) + '•••' + value.substring(atIndex);
          } else {
            masked = value;
          }
        } else {
          masked = value;
        }
      }

      settings[key] = { value, source, masked };
    }

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Admin settings GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/admin/settings — update settings
export async function PUT(request: Request) {
  try {
    const user = await getSession();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { settings } = body as { settings: Record<string, string> };

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json({ error: 'Settings object is required' }, { status: 400 });
    }

    // Only allow updating known setting keys
    const updates: string[] = [];
    for (const [key, value] of Object.entries(settings)) {
      if (!ALL_SETTING_KEYS.includes(key)) {
        continue;
      }
      if (typeof value !== 'string') {
        continue;
      }
      // Skip empty values (don't save empty strings, delete instead)
      if (!value.trim()) {
        try {
          await db.setting.delete(key);
        } catch {
          // Key might not exist in DB — that's fine
        }
        updates.push(key + ' (removed)');
        continue;
      }
      await db.setting.set(key, value.trim());
      updates.push(key);
    }

    console.log(`[ADMIN SETTINGS] Updated by ${user.email}: ${updates.join(', ')}`);

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
