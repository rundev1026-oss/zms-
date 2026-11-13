import { getDb, initDb } from '@/lib/db';
import {
  CardViewConfigDocument,
  DEFAULT_CARD_VIEW_CONFIG,
  normalizeCardViewConfig,
} from '@/lib/cardViewSettings';
import { OrganizationService } from '@/services/organizationService';

const SETTINGS_KEY = 'card_view_configuration';
const SETTINGS_ID = 'setting-card-view-configuration';

export class CardViewSettingsService {
  static async getConfig(): Promise<CardViewConfigDocument> {
    await initDb();
    const db = getDb();
    const row = await db.execute({
      sql: `SELECT value FROM system_settings WHERE key = ?`,
      args: [SETTINGS_KEY],
    });
    if (row.rows.length === 0 || !row.rows[0].value) {
      return DEFAULT_CARD_VIEW_CONFIG;
    }
    try {
      return normalizeCardViewConfig(JSON.parse(String(row.rows[0].value)));
    } catch {
      return DEFAULT_CARD_VIEW_CONFIG;
    }
  }

  static async saveConfig(input: unknown, request: Request, bodyActor?: unknown): Promise<CardViewConfigDocument> {
    const actor = await OrganizationService.resolveActor(request, bodyActor);
    if (!actor || actor.role !== 'super_admin') {
      const error = new Error('เฉพาะผู้ดูแลระบบสูงสุดเท่านั้นที่แก้ไขการตั้งค่าการ์ดได้');
      (error as Error & { status?: number }).status = 403;
      throw error;
    }

    const next = normalizeCardViewConfig(input);
    const previous = await this.getConfig();
    const db = getDb();
    const now = new Date().toISOString();

    await db.execute({
      sql: `INSERT INTO system_settings (id, key, value, category, created_at, updated_at)
            VALUES (?, ?, ?, 'general', ?, ?)
            ON CONFLICT(key) DO UPDATE SET
              value = excluded.value,
              category = 'general',
              updated_at = excluded.updated_at`,
      args: [SETTINGS_ID, SETTINGS_KEY, JSON.stringify(next), now, now],
    });

    await db.execute({
      sql: `INSERT INTO audit_logs (
              id, timestamp, user_id, user_name, user_role, action, entity_type, entity_id, description, old_values, new_values
            ) VALUES (?, ?, ?, ?, ?, 'CARD_VIEW_SETTINGS_UPDATE', 'system_setting', ?, ?, ?, ?)`,
      args: [
        `audit-card-view-${Date.now()}`,
        now,
        actor.id,
        actor.name,
        actor.role,
        SETTINGS_KEY,
        'ปรับปรุงการตั้งค่ารูปแบบการแสดงผลการ์ด',
        JSON.stringify(previous),
        JSON.stringify(next),
      ],
    });

    return next;
  }
}
