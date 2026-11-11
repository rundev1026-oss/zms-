import { getDb, initDb } from '@/lib/db';
import {
  SystemNotification,
  CreateNotificationInput,
  NotificationType,
  NotificationModule,
} from '@/types';

export class NotificationService {
  /**
   * 1. Create a persistent notification in SQLite
   */
  static async createNotification(input: CreateNotificationInput): Promise<SystemNotification> {
    await initDb();
    const db = getDb();

    const id = `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    await db.execute({
      sql: `INSERT INTO system_notifications (
        id, recipient_user_id, recipient_role, type, title, message, module, reference_type, reference_id, action_url, is_read, read_at, created_at, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, ?, ?)`,
      args: [
        id,
        input.recipientUserId || null,
        input.recipientRole || null,
        input.type,
        input.title.trim(),
        input.message.trim(),
        input.module,
        input.referenceType || null,
        input.referenceId || null,
        input.actionUrl || null,
        now,
        input.expiresAt || null,
      ],
    });

    return {
      id,
      recipientUserId: input.recipientUserId || null,
      recipientRole: input.recipientRole || null,
      type: input.type,
      title: input.title.trim(),
      message: input.message.trim(),
      module: input.module,
      referenceType: input.referenceType || null,
      referenceId: input.referenceId || null,
      actionUrl: input.actionUrl || null,
      isRead: false,
      readAt: null,
      createdAt: now,
      expiresAt: input.expiresAt || null,
    };
  }

  /**
   * 2. Get notifications for a user based on their ID and Role with RBAC scoping
   */
  static async getNotificationsForUser(
    user: { id: string; role: string },
    filters?: {
      status?: 'all' | 'unread' | 'read';
      module?: string;
      type?: string;
      search?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ items: SystemNotification[]; total: number; unreadCount: number }> {
    await initDb();
    const db = getDb();
    await this.seedInitialNotificationsIfEmpty();

    const userId = user.id || 'guest';
    const userRole = user.role || 'public';
    const status = filters?.status || 'all';
    const limit = Math.min(Math.max(filters?.limit || 20, 1), 100);
    const offset = Math.max(filters?.offset || 0, 0);

    // Build conditions
    const whereConditions: string[] = [];
    const args: any[] = [];

    // RBAC Scope: user can see direct notifications, role notifications, global notifications, or super_admin sees all
    if (userRole === 'super_admin') {
      whereConditions.push(`(1 = 1)`);
    } else {
      whereConditions.push(`(
        n.recipient_user_id = ? 
        OR n.recipient_role = ? 
        OR n.recipient_role = 'all' 
        OR (n.recipient_user_id IS NULL AND n.recipient_role IS NULL)
      )`);
      args.push(userId, userRole);
    }

    // Status filter
    if (status === 'unread') {
      whereConditions.push(`(
        (n.recipient_user_id = ? AND (n.is_read = 0 OR n.is_read IS NULL) AND nr.read_at IS NULL)
        OR (n.recipient_user_id != ? AND nr.read_at IS NULL)
        OR (n.recipient_user_id IS NULL AND nr.read_at IS NULL)
      )`);
      args.push(userId, userId);
    } else if (status === 'read') {
      whereConditions.push(`(
        (n.recipient_user_id = ? AND (n.is_read = 1 OR nr.read_at IS NOT NULL))
        OR (nr.read_at IS NOT NULL)
      )`);
      args.push(userId);
    }

    // Module filter
    if (filters?.module && filters.module !== 'all') {
      whereConditions.push(`n.module = ?`);
      args.push(filters.module);
    }

    // Type filter
    if (filters?.type && filters.type !== 'all') {
      whereConditions.push(`n.type = ?`);
      args.push(filters.type);
    }

    // Search query
    if (filters?.search && filters.search.trim()) {
      whereConditions.push(`(n.title LIKE ? OR n.message LIKE ? OR n.reference_id LIKE ?)`);
      const term = `%${filters.search.trim()}%`;
      args.push(term, term, term);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Total matching count
    const countSql = `
      SELECT COUNT(DISTINCT n.id) as total
      FROM system_notifications n
      LEFT JOIN notification_user_reads nr ON n.id = nr.notification_id AND nr.user_id = ?
      ${whereClause}
    `;
    const countRes = await db.execute({
      sql: countSql,
      args: [userId, ...args],
    });
    const total = Number(countRes.rows[0]?.total || 0);

    // Unread count across all visible notifications for user
    const unreadCountSql = `
      SELECT COUNT(DISTINCT n.id) as unread_count
      FROM system_notifications n
      LEFT JOIN notification_user_reads nr ON n.id = nr.notification_id AND nr.user_id = ?
      WHERE (
        ${userRole === 'super_admin' ? '1=1' : `(n.recipient_user_id = ? OR n.recipient_role = ? OR n.recipient_role = 'all' OR (n.recipient_user_id IS NULL AND n.recipient_role IS NULL))`}
      )
      AND (
        (n.recipient_user_id = ? AND (n.is_read = 0 OR n.is_read IS NULL) AND nr.read_at IS NULL)
        OR (n.recipient_user_id != ? AND nr.read_at IS NULL)
        OR (n.recipient_user_id IS NULL AND nr.read_at IS NULL)
      )
    `;
    const unreadArgs = userRole === 'super_admin'
      ? [userId, userId, userId]
      : [userId, userId, userRole, userId, userId];

    const unreadRes = await db.execute({
      sql: unreadCountSql,
      args: unreadArgs,
    });
    const unreadCount = Number(unreadRes.rows[0]?.unread_count || 0);

    // Query Items
    const itemsSql = `
      SELECT 
        n.id,
        n.recipient_user_id,
        n.recipient_role,
        n.type,
        n.title,
        n.message,
        n.module,
        n.reference_type,
        n.reference_id,
        n.action_url,
        CASE 
          WHEN n.recipient_user_id = ? THEN (CASE WHEN n.is_read = 1 OR nr.read_at IS NOT NULL THEN 1 ELSE 0 END)
          ELSE (CASE WHEN nr.read_at IS NOT NULL THEN 1 ELSE 0 END)
        END as calculated_is_read,
        COALESCE(nr.read_at, n.read_at) as calculated_read_at,
        n.created_at,
        n.expires_at
      FROM system_notifications n
      LEFT JOIN notification_user_reads nr ON n.id = nr.notification_id AND nr.user_id = ?
      ${whereClause}
      ORDER BY n.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const itemsRes = await db.execute({
      sql: itemsSql,
      args: [userId, userId, ...args, limit, offset],
    });

    const items: SystemNotification[] = itemsRes.rows.map((row: any) => ({
      id: String(row.id),
      recipientUserId: row.recipient_user_id ? String(row.recipient_user_id) : null,
      recipientRole: row.recipient_role ? String(row.recipient_role) : null,
      type: row.type as NotificationType,
      title: String(row.title),
      message: String(row.message),
      module: row.module as NotificationModule,
      referenceType: row.reference_type ? String(row.reference_type) : null,
      referenceId: row.reference_id ? String(row.reference_id) : null,
      actionUrl: row.action_url ? String(row.action_url) : null,
      isRead: Boolean(Number(row.calculated_is_read) === 1),
      readAt: row.calculated_read_at ? String(row.calculated_read_at) : null,
      createdAt: String(row.created_at),
      expiresAt: row.expires_at ? String(row.expires_at) : null,
    }));

    return { items, total, unreadCount };
  }

  /**
   * 3. Get unread count for user badge
   */
  static async getUnreadCount(user: { id: string; role: string }): Promise<number> {
    await initDb();
    const db = getDb();
    const userId = user.id || 'guest';
    const userRole = user.role || 'public';

    const unreadCountSql = `
      SELECT COUNT(DISTINCT n.id) as unread_count
      FROM system_notifications n
      LEFT JOIN notification_user_reads nr ON n.id = nr.notification_id AND nr.user_id = ?
      WHERE (
        ${userRole === 'super_admin' ? '1=1' : `(n.recipient_user_id = ? OR n.recipient_role = ? OR n.recipient_role = 'all' OR (n.recipient_user_id IS NULL AND n.recipient_role IS NULL))`}
      )
      AND (
        (n.recipient_user_id = ? AND (n.is_read = 0 OR n.is_read IS NULL) AND nr.read_at IS NULL)
        OR (n.recipient_user_id != ? AND nr.read_at IS NULL)
        OR (n.recipient_user_id IS NULL AND nr.read_at IS NULL)
      )
    `;
    const unreadArgs = userRole === 'super_admin'
      ? [userId, userId, userId]
      : [userId, userId, userRole, userId, userId];

    const res = await db.execute({
      sql: unreadCountSql,
      args: unreadArgs,
    });
    return Number(res.rows[0]?.unread_count || 0);
  }

  /**
   * 4. Mark single notification as read for user
   */
  static async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    await initDb();
    const db = getDb();
    const now = new Date().toISOString();

    // Insert user-specific read marker
    await db.execute({
      sql: `INSERT OR REPLACE INTO notification_user_reads (notification_id, user_id, read_at) VALUES (?, ?, ?)`,
      args: [notificationId, userId, now],
    });

    // Also update notification record if directed to this user
    await db.execute({
      sql: `UPDATE system_notifications SET is_read = 1, read_at = ? WHERE id = ? AND recipient_user_id = ?`,
      args: [now, notificationId, userId],
    });

    return true;
  }

  /**
   * 5. Mark all visible notifications as read for user
   */
  static async markAllAsRead(userId: string, role: string): Promise<boolean> {
    await initDb();
    const db = getDb();
    const now = new Date().toISOString();

    // Find all visible unread notifications for this user
    const findUnreadSql = `
      SELECT n.id
      FROM system_notifications n
      LEFT JOIN notification_user_reads nr ON n.id = nr.notification_id AND nr.user_id = ?
      WHERE (
        ${role === 'super_admin' ? '1=1' : `(n.recipient_user_id = ? OR n.recipient_role = ? OR n.recipient_role = 'all' OR (n.recipient_user_id IS NULL AND n.recipient_role IS NULL))`}
      )
      AND (
        (n.recipient_user_id = ? AND (n.is_read = 0 OR n.is_read IS NULL) AND nr.read_at IS NULL)
        OR (n.recipient_user_id != ? AND nr.read_at IS NULL)
        OR (n.recipient_user_id IS NULL AND nr.read_at IS NULL)
      )
    `;
    const unreadArgs = role === 'super_admin'
      ? [userId, userId, userId]
      : [userId, userId, role, userId, userId];

    const res = await db.execute({
      sql: findUnreadSql,
      args: unreadArgs,
    });

    for (const row of res.rows) {
      const notifId = String(row.id);
      await db.execute({
        sql: `INSERT OR REPLACE INTO notification_user_reads (notification_id, user_id, read_at) VALUES (?, ?, ?)`,
        args: [notifId, userId, now],
      });
    }

    // Direct recipient update
    await db.execute({
      sql: `UPDATE system_notifications SET is_read = 1, read_at = ? WHERE recipient_user_id = ? AND (is_read = 0 OR is_read IS NULL)`,
      args: [now, userId],
    });

    return true;
  }

  /**
   * 6. Delete notification
   */
  static async deleteNotification(notificationId: string): Promise<boolean> {
    await initDb();
    const db = getDb();

    await db.execute({
      sql: `DELETE FROM notification_user_reads WHERE notification_id = ?`,
      args: [notificationId],
    });
    await db.execute({
      sql: `DELETE FROM system_notifications WHERE id = ?`,
      args: [notificationId],
    });

    return true;
  }

  /**
   * 7. Seed initial realistic notifications if table is empty
   */
  static async seedInitialNotificationsIfEmpty(): Promise<void> {
    const db = getDb();
    const countRes = await db.execute('SELECT COUNT(*) as count FROM system_notifications');
    const count = Number(countRes.rows[0]?.count || 0);
    if (count > 0) return;

    const now = new Date();
    const minutesAgo = (mins: number) => new Date(now.getTime() - mins * 60000).toISOString();
    const hoursAgo = (hours: number) => new Date(now.getTime() - hours * 3600000).toISOString();

    const seeds: CreateNotificationInput[] = [
      {
        type: 'info',
        module: 'approval',
        title: 'มีคำร้องขอรับซะกาตรอการพิจารณาอนุมัติ',
        message: 'มีคำร้องใหม่ที่ผ่านการตรวจสอบและประเมินสิทธิ์แล้ว รอการพิจารณาอนุมัติจากคณะกรรมการ',
        referenceType: 'application',
        referenceId: 'APP-2569-0002',
        actionUrl: '/approvals',
        recipientRole: 'approver',
      },
      {
        type: 'success',
        module: 'beneficiary',
        title: 'ลงทะเบียนผู้มีสิทธิ์รับซะกาตสำเร็จ',
        message: 'ได้ทำการขึ้นทะเบียน นาย มุกลิส มีระยะ (MB-2026-000006) สำเร็จเรียบร้อยแล้ว',
        referenceType: 'beneficiary',
        referenceId: 'MB-2026-000006',
        actionUrl: '/beneficiaries',
        recipientRole: 'officer',
      },
      {
        type: 'warning',
        module: 'followup',
        title: 'มีรายการที่ถึงกำหนดติดตามผล',
        message: 'มีผู้ได้รับเงินช่วยเหลือถึงรอบการติดตามผลสภาพความเป็นอยู่ประจำไตรมาส',
        referenceType: 'followup',
        actionUrl: '/follow-up',
        recipientRole: 'officer',
      },
      {
        type: 'info',
        module: 'finance',
        title: 'รายการรอจัดสรรและเบิกจ่ายเงินช่วยเหลือ',
        message: 'มีคำร้องที่ผ่านการอนุมัติแล้ว รอเจ้าหน้าที่การเงินสร้างรอบเบิกจ่ายเงิน',
        referenceType: 'disbursement',
        actionUrl: '/assistance',
        recipientRole: 'finance',
      },
      {
        type: 'success',
        module: 'system',
        title: 'ระบบแจ้งเตือนกลาง (Global Notification) พร้อมใช้งาน',
        message: 'เปิดใช้งานระบบแจ้งเตือนกลาง เชื่อมโยงทุกขั้นตอนการทำงานของระบบ ZMS',
        actionUrl: '/notifications',
        recipientRole: 'all',
      },
    ];

    for (let i = 0; i < seeds.length; i++) {
      const s = seeds[i];
      const id = `notif-seed-${Date.now()}-${i}`;
      const createdAt = hoursAgo(i * 3 + 1);
      await db.execute({
        sql: `INSERT INTO system_notifications (
          id, recipient_user_id, recipient_role, type, title, message, module, reference_type, reference_id, action_url, is_read, read_at, created_at, expires_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, ?, NULL)`,
        args: [
          id,
          s.recipientUserId || null,
          s.recipientRole || null,
          s.type,
          s.title,
          s.message,
          s.module,
          s.referenceType || null,
          s.referenceId || null,
          s.actionUrl || null,
          createdAt,
        ],
      });
    }
  }
}
