import crypto from 'crypto';
import { getDb, initDb } from '@/lib/db';
import { User, UserRole, Branch, Department } from '@/types';

export interface AuthSession {
  token: string;
  expiresAt: string;
  user: User;
  redirectUrl: string;
}

export interface RegisterInput {
  name?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  password: string;
  confirmPassword: string;
  pdpaConsent: boolean;
}

export interface UpdateProfileInput {
  name?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  notificationEmail?: boolean;
  notificationSms?: boolean;
  notificationApp?: boolean;
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
  role?: any;
  branch_id?: any;
  department_id?: any;
}

export class AuthService {
  /**
   * Helper to hash password with salt using SHA-256 HMAC
   */
  static hashPassword(password: string, salt: string): string {
    return crypto.createHmac('sha256', salt).update(password).digest('hex');
  }

  /**
   * Helper to hash one-time tokens using SHA-256
   */
  static hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Helper to generate cryptographically secure random token
   */
  static generateRandomToken(bytes: number = 32): string {
    return crypto.randomBytes(bytes).toString('hex');
  }

  /**
   * Validate Password Strength
   */
  static validatePasswordStrength(password: string): { valid: boolean; reason?: string } {
    if (!password || password.length < 8) {
      return { valid: false, reason: 'รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร' };
    }
    if (!/[A-Z]/.test(password)) {
      return { valid: false, reason: 'รหัสผ่านต้องมีตัวอักษรภาษาอังกฤษพิมพ์ใหญ่ (A-Z) อย่างน้อย 1 ตัว' };
    }
    if (!/[a-z]/.test(password)) {
      return { valid: false, reason: 'รหัสผ่านต้องมีตัวอักษรภาษาอังกฤษพิมพ์เล็ก (a-z) อย่างน้อย 1 ตัว' };
    }
    if (!/[0-9]/.test(password)) {
      return { valid: false, reason: 'รหัสผ่านต้องมีตัวเลข (0-9) อย่างน้อย 1 ตัว' };
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      return { valid: false, reason: 'รหัสผ่านต้องมีอักขระพิเศษอย่างน้อย 1 ตัว เช่น !@#$%^&*' };
    }
    return { valid: true };
  }

  /**
   * 1. Register New Member
   */
  static async register(input: RegisterInput, ipAddress: string = '127.0.0.1'): Promise<{ user: User; message: string; notificationStatus?: string }> {
    await initDb();
    const db = getDb();

    // 1. Basic validation
    const cleanFirst = (input.firstName || '').trim();
    const cleanLast = (input.lastName || '').trim();
    const cleanEmail = (input.email || '').trim().toLowerCase();
    const cleanPhone = (input.phone || '').trim().replace(/[^0-9]/g, '');

    if (!cleanFirst || !cleanLast) {
      throw new Error('กรุณาระบุชื่อและนามสกุลให้ครบถ้วน');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      throw new Error('รูปแบบอีเมลไม่ถูกต้อง');
    }

    if (cleanPhone) {
      if (cleanPhone.length < 9 || cleanPhone.length > 10) {
        throw new Error('หมายเลขโทรศัพท์ต้องมี 9-10 หลัก');
      }
    }

    if (input.password !== input.confirmPassword) {
      throw new Error('รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน');
    }

    const passCheck = this.validatePasswordStrength(input.password);
    if (!passCheck.valid) {
      throw new Error(passCheck.reason);
    }

    if (!input.pdpaConsent) {
      throw new Error('กรุณายินยอมตามนโยบายความเป็นส่วนตัว (PDPA) เพื่อสร้างบัญชี');
    }

    // 2. Check for unique email & phone
    const existingEmail = await db.execute({
      sql: `SELECT id FROM users WHERE LOWER(email) = ?`,
      args: [cleanEmail],
    });
    if (existingEmail.rows.length > 0) {
      throw new Error('อีเมลนี้ถูกใช้งานในระบบแล้ว กรุณาเข้าสู่ระบบหรือใช้อีเมลอื่น');
    }

    if (cleanPhone) {
      const existingPhone = await db.execute({
        sql: `SELECT id FROM users WHERE phone = ?`,
        args: [cleanPhone],
      });
      if (existingPhone.rows.length > 0) {
        throw new Error('หมายเลขโทรศัพท์นี้ถูกใช้งานในระบบแล้ว');
      }
    }

    // 3. Security: Generate salt and hash
    const salt = `zms_${crypto.randomBytes(16).toString('hex')}`;
    const passwordHash = this.hashPassword(input.password, salt);
    const userId = `u-mem-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const fullName = `${cleanFirst} ${cleanLast}`;
    const timestampNow = new Date().toLocaleString('th-TH', { hour12: false });

    // 4. Insert User: STRICTLY 'member' role only (No privilege escalation)
    await db.execute({
      sql: `INSERT INTO users (
        id, email, name, first_name, last_name, role, role_title_th, phone, branch, branch_id, department_id,
        status, password_hash, salt, pdpa_consent_date, pdpa_consent_version, email_verified, phone_verified,
        failed_login_attempts
      ) VALUES (?, ?, ?, ?, ?, 'member', 'สมาชิกทั่วไป (Member)', ?, 'สำนักงานใหญ่ กรุงเทพฯ', 'br-hq', 'dept-public', 'active', ?, ?, ?, 'v2569.1', 0, 0, 0)`,
      args: [
        userId,
        cleanEmail,
        fullName,
        cleanFirst,
        cleanLast,
        cleanPhone,
        passwordHash,
        salt,
        timestampNow,
      ],
    });

    // 5. Audit Log
    await db.execute({
      sql: `INSERT INTO audit_logs (id, timestamp, user_id, user_name, user_role, action, entity_type, entity_id, description, ip_address)
            VALUES (?, ?, ?, ?, 'member', 'USER_REGISTER', 'users', ?, ?, ?)`,
      args: [
        `log-auth-${Date.now()}`,
        timestampNow,
        userId,
        fullName,
        userId,
        `สมัครสมาชิกใหม่: ${fullName} (${cleanEmail}) ยอมรับ PDPA v2569.1 จาก IP: ${ipAddress}`,
        ipAddress,
      ],
    });

    const user: User = {
      id: userId,
      name: fullName,
      firstName: cleanFirst,
      lastName: cleanLast,
      email: cleanEmail,
      role: 'member',
      roleTitleTh: 'สมาชิกทั่วไป (Member)',
      phone: cleanPhone,
      branch: 'สำนักงานใหญ่ กรุงเทพฯ',
      branchId: 'br-hq',
      departmentId: 'dept-public',
      status: 'active',
      emailVerified: false,
      phoneVerified: false,
      pdpaConsentDate: timestampNow,
      pdpaConsentVersion: 'v2569.1',
      lastLogin: undefined,
    };

    return {
      user,
      message: 'สมัครสมาชิกสำเร็จเรียบร้อย ท่านสามารถเข้าสู่ระบบเพื่อใช้งานได้ทันที (หมายเหตุ: ระบบส่ง Email/SMS ยืนยันตัวตนยังไม่ได้เชื่อมต่อในสภาพแวดล้อมนี้)',
      notificationStatus: 'ระบบยังไม่ได้เชื่อมต่อ SMS/Email Gateway ภายนอก',
    };
  }

  /**
   * 2. Authenticate user with Email OR Phone & Password (with Brute-Force Lockout)
   */
  static async login(identifier: string, password: string, ipAddress: string = '127.0.0.1'): Promise<AuthSession> {
    await initDb();
    const db = getDb();

    const cleanIdentifier = (identifier || '').trim().toLowerCase();
    const cleanPhone = cleanIdentifier.replace(/[^0-9]/g, '');

    // Fetch user by email or phone
    const res = await db.execute({
      sql: `SELECT id, email, name, first_name, last_name, role, role_title_th, phone, branch, branch_id, department_id,
                   status, password_setup_status, password_hash, salt, last_login, failed_login_attempts, locked_until,
                   email_verified, phone_verified, notification_email, notification_sms, notification_app
            FROM users 
            WHERE LOWER(email) = ? OR phone = ?`,
      args: [cleanIdentifier, cleanPhone || 'NOT_A_PHONE'],
    });

    const timestampNow = new Date().toLocaleString('th-TH', { hour12: false });

    // Generic error to prevent account enumeration
    const genericAuthError = 'อีเมล หมายเลขโทรศัพท์ หรือรหัสผ่านไม่ถูกต้อง';

    if (res.rows.length === 0) {
      await db.execute({
        sql: `INSERT INTO audit_logs (id, timestamp, user_id, user_name, user_role, action, entity_type, entity_id, description, ip_address)
              VALUES (?, ?, 'anonymous', 'Unknown', 'public', 'USER_LOGIN_FAILED', 'auth', ?, ?, ?)`,
        args: [
          `log-auth-${Date.now()}`,
          timestampNow,
          cleanIdentifier,
          `พยายามเข้าสู่ระบบไม่สำเร็จ: ไม่พบตัวระบุ ${cleanIdentifier}`,
          ipAddress,
        ],
      });
      throw new Error(genericAuthError);
    }

    const row: any = res.rows[0];

    // Check brute force account lockout
    if (row.locked_until) {
      const lockExpiry = new Date(String(row.locked_until)).getTime();
      if (Date.now() < lockExpiry) {
        const remainingMinutes = Math.ceil((lockExpiry - Date.now()) / (60 * 1000));
        throw new Error(`บัญชีนี้ถูกระงับชั่วคราวเนื่องจากพยายามเข้าสู่ระบบผิดเกินกำหนด กรุณารออีก ${remainingMinutes} นาที`);
      }
    }

    // Check account status (suspended or disabled)
    if (String(row.status) === 'suspended') {
      await db.execute({
        sql: `INSERT INTO audit_logs (id, timestamp, user_id, user_name, user_role, action, entity_type, entity_id, description, ip_address)
              VALUES (?, ?, ?, ?, ?, 'USER_LOGIN_SUSPENDED', 'auth', ?, ?, ?)`,
        args: [
          `log-auth-${Date.now()}`,
          timestampNow,
          String(row.id),
          String(row.name),
          String(row.role),
          String(row.id),
          `พยายามเข้าสู่ระบบแต่บัญชีถูกระงับ: ${cleanIdentifier}`,
          ipAddress,
        ],
      });
      throw new Error('บัญชีผู้ใช้นี้ถูกระงับการใช้งานชั่วคราว กรุณาติดต่อผู้ดูแลระบบ');
    }

    if (String(row.status) === 'disabled') {
      await db.execute({
        sql: `INSERT INTO audit_logs (id, timestamp, user_id, user_name, user_role, action, entity_type, entity_id, description, ip_address)
              VALUES (?, ?, ?, ?, ?, 'USER_LOGIN_DISABLED', 'auth', ?, ?, ?)`,
        args: [
          `log-auth-${Date.now()}`,
          timestampNow,
          String(row.id),
          String(row.name),
          String(row.role),
          String(row.id),
          `พยายามเข้าสู่ระบบแต่บัญชีถูกปิดการใช้งาน: ${cleanIdentifier}`,
          ipAddress,
        ],
      });
      throw new Error('บัญชีผู้ใช้นี้ถูกปิดการใช้งาน กรุณาติดต่อผู้ดูแลระบบ');
    }

    // Check password setup status (must have completed setup and have a password)
    if (String(row.password_setup_status) === 'pending_setup' || !row.password_hash) {
      await db.execute({
        sql: `INSERT INTO audit_logs (id, timestamp, user_id, user_name, user_role, action, entity_type, entity_id, description, ip_address)
              VALUES (?, ?, ?, ?, ?, 'USER_LOGIN_PENDING_SETUP', 'auth', ?, ?, ?)`,
        args: [
          `log-auth-${Date.now()}`,
          timestampNow,
          String(row.id),
          String(row.name),
          String(row.role),
          String(row.id),
          `พยายามเข้าสู่ระบบแต่บัญชียังไม่ได้ตั้งรหัสผ่าน: ${cleanIdentifier}`,
          ipAddress,
        ],
      });
      throw new Error('บัญชีนี้ยังไม่ได้ตั้งรหัสผ่าน กรุณาตรวจสอบอีเมลคำเชิญเพื่อตั้งรหัสผ่าน หรือติดต่อผู้ดูแลระบบเพื่อขอรับลิงก์ใหม่');
    }

    // Verify Password
    const storedHash = row.password_hash ? String(row.password_hash) : null;
    const salt = row.salt ? String(row.salt) : 'zms_default_salt';
    const computedHash = this.hashPassword(password, salt);

    if (!storedHash || storedHash !== computedHash) {
      const newFailedAttempts = Number(row.failed_login_attempts || 0) + 1;
      let lockedUntil: string | null = null;

      // Lockout policy: Lock for 15 minutes after 5 consecutive failures
      if (newFailedAttempts >= 5) {
        lockedUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      }

      await db.execute({
        sql: `UPDATE users SET failed_login_attempts = ?, locked_until = ? WHERE id = ?`,
        args: [newFailedAttempts, lockedUntil, String(row.id)],
      });

      await db.execute({
        sql: `INSERT INTO audit_logs (id, timestamp, user_id, user_name, user_role, action, entity_type, entity_id, description, ip_address)
              VALUES (?, ?, ?, ?, ?, 'USER_LOGIN_FAILED', 'auth', ?, ?, ?)`,
        args: [
          `log-auth-${Date.now()}`,
          timestampNow,
          String(row.id),
          String(row.name),
          String(row.role),
          String(row.id),
          `พยายามเข้าสู่ระบบไม่สำเร็จ: รหัสผ่านผิด (ครั้งที่ ${newFailedAttempts}) สำหรับ ${cleanIdentifier}`,
          ipAddress,
        ],
      });

      if (lockedUntil) {
        throw new Error('พยายามเข้าสู่ระบบไม่สำเร็จเกิน 5 ครั้ง บัญชีถูกระงับชั่วคราว 15 นาที เพื่อความปลอดภัย');
      }

      throw new Error(genericAuthError);
    }

    // Login Success: Reset failed attempts & locked_until
    const sessionToken = this.generateRandomToken(32);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    await db.execute({
      sql: `UPDATE users 
            SET session_token = ?, session_expires_at = ?, last_login = ?,
                failed_login_attempts = 0, locked_until = NULL, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
      args: [sessionToken, expiresAt, timestampNow, String(row.id)],
    });

    // Audit Log success
    await db.execute({
      sql: `INSERT INTO audit_logs (id, timestamp, user_id, user_name, user_role, action, entity_type, entity_id, description, ip_address)
            VALUES (?, ?, ?, ?, ?, 'USER_LOGIN_SUCCESS', 'auth', ?, ?, ?)`,
      args: [
        `log-auth-${Date.now()}`,
        timestampNow,
        String(row.id),
        String(row.name),
        String(row.role),
        String(row.id),
        `เข้าสู่ระบบสำเร็จ: ${row.name} (${row.role_title_th}) จาก IP: ${ipAddress}`,
        ipAddress,
      ],
    });

    const user: User = {
      id: String(row.id),
      email: String(row.email),
      name: String(row.name),
      firstName: row.first_name ? String(row.first_name) : undefined,
      lastName: row.last_name ? String(row.last_name) : undefined,
      role: String(row.role) as UserRole,
      roleTitleTh: String(row.role_title_th),
      phone: String(row.phone),
      branch: String(row.branch),
      branchId: row.branch_id ? String(row.branch_id) : undefined,
      departmentId: row.department_id ? String(row.department_id) : undefined,
      status: String(row.status) as any,
      passwordSetupStatus: (row.password_setup_status as any) || (row.password_hash ? 'completed' : 'pending_setup'),
      hasPassword: Boolean(row.password_hash),
      lastLogin: timestampNow,
      emailVerified: Boolean(row.email_verified),
      phoneVerified: Boolean(row.phone_verified),
      notificationEmail: Boolean(row.notification_email ?? true),
      notificationSms: Boolean(row.notification_sms ?? false),
      notificationApp: Boolean(row.notification_app ?? true),
    };

    // Determine correct redirect URL based on role
    let redirectUrl = '/my-account';
    if (['super_admin', 'executive', 'officer', 'approver', 'finance'].includes(user.role)) {
      redirectUrl = '/#admin';
    }

    return {
      token: sessionToken,
      expiresAt,
      user,
      redirectUrl,
    };
  }

  /**
   * 3. Validate Session Token
   */
  static async validateSession(token: string): Promise<User | null> {
    if (!token || token.trim().length < 16) return null;

    await initDb();
    const db = getDb();

    const res = await db.execute({
      sql: `SELECT u.id, u.email, u.name, u.first_name, u.last_name, u.role, u.role_title_th, u.phone, 
                   u.branch, u.branch_id, u.department_id, u.status, u.password_setup_status, u.session_expires_at, u.last_login,
                   (u.password_hash IS NOT NULL) as has_password,
                   u.email_verified, u.phone_verified, u.notification_email, u.notification_sms, u.notification_app,
                   u.pdpa_consent_date, u.created_at,
                   b.name as branch_name, d.name as department_name
            FROM users u
            LEFT JOIN branches b ON u.branch_id = b.id
            LEFT JOIN departments d ON u.department_id = d.id
            WHERE u.session_token = ?`,
      args: [token.trim()],
    });

    if (res.rows.length === 0) return null;

    const row: any = res.rows[0];

    // Check expiration
    if (row.session_expires_at) {
      const expires = new Date(String(row.session_expires_at)).getTime();
      if (Date.now() > expires) {
        return null;
      }
    }

    if (String(row.status) !== 'active') return null;

    return {
      id: String(row.id),
      email: String(row.email),
      name: String(row.name),
      firstName: row.first_name ? String(row.first_name) : undefined,
      lastName: row.last_name ? String(row.last_name) : undefined,
      role: String(row.role) as UserRole,
      roleTitleTh: String(row.role_title_th),
      phone: String(row.phone),
      branch: row.branch_name ? String(row.branch_name) : String(row.branch),
      branchId: row.branch_id ? String(row.branch_id) : undefined,
      branchName: row.branch_name ? String(row.branch_name) : undefined,
      departmentId: row.department_id ? String(row.department_id) : undefined,
      departmentName: row.department_name ? String(row.department_name) : undefined,
      status: String(row.status) as any,
      passwordSetupStatus: (row.password_setup_status as any) || (row.has_password ? 'completed' : 'pending_setup'),
      hasPassword: Boolean(row.has_password),
      lastLogin: String(row.last_login || ''),
      emailVerified: Boolean(row.email_verified),
      phoneVerified: Boolean(row.phone_verified),
      notificationEmail: Boolean(row.notification_email ?? true),
      notificationSms: Boolean(row.notification_sms ?? false),
      notificationApp: Boolean(row.notification_app ?? true),
      pdpaConsentDate: row.pdpa_consent_date ? String(row.pdpa_consent_date) : undefined,
      createdAt: row.created_at ? String(row.created_at) : undefined,
    };
  }

  /**
   * 3.1 Invalidate Session and Logout
   */
  static async logout(token: string, ipAddress: string = '127.0.0.1'): Promise<boolean> {
    if (!token) return true;

    await initDb();
    const db = getDb();

    // Check user for audit log
    const userRes = await db.execute({
      sql: `SELECT id, name, role, email FROM users WHERE session_token = ?`,
      args: [token.trim()],
    });

    if (userRes.rows.length > 0) {
      const userRow: any = userRes.rows[0];
      const timestampNow = new Date().toLocaleString('th-TH', { hour12: false });

      // Invalidate session in database
      await db.execute({
        sql: `UPDATE users 
              SET session_token = NULL, session_expires_at = NULL, updated_at = CURRENT_TIMESTAMP 
              WHERE id = ?`,
        args: [String(userRow.id)],
      });

      // Audit Log
      await db.execute({
        sql: `INSERT INTO audit_logs (id, timestamp, user_id, user_name, user_role, action, entity_type, entity_id, description, ip_address)
              VALUES (?, ?, ?, ?, ?, 'USER_LOGOUT', 'auth', ?, ?, ?)`,
        args: [
          `log-auth-${Date.now()}`,
          timestampNow,
          String(userRow.id),
          String(userRow.name),
          String(userRow.role),
          String(userRow.id),
          `ออกจากระบบสำเร็จ: ${userRow.name} (${userRow.email}) จาก IP: ${ipAddress}`,
          ipAddress,
        ],
      });
    }

    return true;
  }

  /**
   * 4. Request Password Reset (Secure Token Generation & Honest Provider Status)
   */
  static async requestPasswordReset(identifier: string, ipAddress: string = '127.0.0.1'): Promise<{
    success: boolean;
    message: string;
    rawToken?: string;
    resetToken?: string;
    emailStatus?: string;
    resetUrl?: string;
  }> {
    await initDb();
    const db = getDb();

    const cleanIdentifier = (identifier || '').trim().toLowerCase();
    const cleanPhone = cleanIdentifier.replace(/[^0-9]/g, '');

    const userRes = await db.execute({
      sql: `SELECT id, email, name, role FROM users WHERE LOWER(email) = ? OR phone = ?`,
      args: [cleanIdentifier, cleanPhone || 'NOT_A_PHONE'],
    });

    const timestampNow = new Date().toLocaleString('th-TH', { hour12: false });
    const genericResponse = {
      success: true,
      message: 'หากพบข้อมูลในระบบ ระบบจะดำเนินการส่งคำขอรีเซ็ตรหัสผ่าน (หมายเหตุ: ในสภาพแวดล้อมทดสอบที่ยังไม่ได้เชื่อมต่อ SMTP Gateway ท่านสามารถใช้ลิงก์รีเซ็ตด้านล่างเพื่อทดสอบ)',
      emailStatus: 'ระบบยังไม่ได้เชื่อมต่อ SMTP Server จริง',
    };

    if (userRes.rows.length === 0) {
      await db.execute({
        sql: `INSERT INTO audit_logs (id, timestamp, user_id, user_name, user_role, action, entity_type, entity_id, description, ip_address)
              VALUES (?, ?, 'anonymous', 'Unknown', 'public', 'PASSWORD_RESET_ATTEMPT_UNKNOWN', 'auth', ?, ?, ?)`,
        args: [
          `log-auth-${Date.now()}`,
          timestampNow,
          cleanIdentifier,
          `ขอรีเซ็ตรหัสผ่านสำหรับบัญชีที่ไม่มีในระบบ: ${cleanIdentifier}`,
          ipAddress,
        ],
      });
      return genericResponse;
    }

    const user = userRes.rows[0];

    // Rate limiting: Max 3 active tokens within the last 1 hour
    const tokenCount = await db.execute({
      sql: `SELECT COUNT(*) as count FROM password_reset_tokens 
            WHERE user_id = ? AND created_at > datetime('now', '-1 hour')`,
      args: [String(user.id)],
    });

    if (Number(tokenCount.rows[0].count) >= 3) {
      throw new Error('ท่านส่งคำขอรีเซ็ตรหัสผ่านบ่อยเกินไป กรุณารอ 1 ชั่วโมงก่อนทำรายการใหม่');
    }

    // Generate secure 32-byte token and hash it for DB storage
    const rawToken = this.generateRandomToken(32);
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour expiry

    await db.execute({
      sql: `INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at, used, created_ip)
            VALUES (?, ?, ?, ?, 0, ?)`,
      args: [`prt-${Date.now()}`, String(user.id), tokenHash, expiresAt, ipAddress],
    });

    await db.execute({
      sql: `INSERT INTO audit_logs (id, timestamp, user_id, user_name, user_role, action, entity_type, entity_id, description, ip_address)
            VALUES (?, ?, ?, ?, ?, 'PASSWORD_RESET_REQUESTED', 'auth', ?, ?, ?)`,
      args: [
        `log-auth-${Date.now()}`,
        timestampNow,
        String(user.id),
        String(user.name),
        String(user.role),
        String(user.id),
        `ส่งคำขอรีเซ็ตรหัสผ่านสำหรับ ${user.email} จาก IP: ${ipAddress}`,
        ipAddress,
      ],
    });

    return {
      success: true,
      message: 'หากพบข้อมูลในระบบ ระบบจะดำเนินการส่งคำขอรีเซ็ตรหัสผ่าน (เนื่องจากระบบจริงยังไม่ได้เชื่อมต่อกับ Email Gateway ระบบจึงสร้างโทเคนทดสอบให้ใช้งานได้โดยตรง)',
      rawToken,
      resetToken: rawToken,
      emailStatus: 'ระบบยังไม่ได้เชื่อมต่อ SMTP Server จริง โทเคนถูกสร้างและเข้ารหัส SHA-256 บันทึกในฐานข้อมูลแล้ว',
      resetUrl: `/reset-password?token=${rawToken}`,
    };
  }

  /**
   * 5. Reset Password using Verified Token
   */
  static async resetPassword(token: string, newPass: string, confirmPass: string, ipAddress: string = '127.0.0.1'): Promise<{ success: boolean; message: string }> {
    if (!token || token.trim().length < 16) {
      throw new Error('โทเคนรีเซ็ตรหัสผ่านไม่ถูกต้อง');
    }

    if (newPass !== confirmPass) {
      throw new Error('รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน');
    }

    const passCheck = this.validatePasswordStrength(newPass);
    if (!passCheck.valid) {
      throw new Error(passCheck.reason);
    }

    await initDb();
    const db = getDb();

    const tokenHash = this.hashToken(token.trim());

    // Look up token in DB
    const res = await db.execute({
      sql: `SELECT id, user_id, expires_at, used FROM password_reset_tokens WHERE token_hash = ?`,
      args: [tokenHash],
    });

    if (res.rows.length === 0) {
      throw new Error('ไม่พบโทเคนรีเซ็ตรหัสผ่าน หรือโทเคนไม่ถูกต้อง');
    }

    const tokenRow: any = res.rows[0];

    if (Number(tokenRow.used) === 1) {
      throw new Error('โทเคนนี้ถูกใช้งานไปแล้ว ไม่สามารถใช้ซ้ำได้');
    }

    const expiresTime = new Date(String(tokenRow.expires_at)).getTime();
    if (Date.now() > expiresTime) {
      throw new Error('โทเคนรีเซ็ตรหัสผ่านนี้หมดอายุแล้ว กรุณาส่งคำขอใหม่');
    }

    const userId = String(tokenRow.user_id);
    const newSalt = `zms_${crypto.randomBytes(16).toString('hex')}`;
    const newHash = this.hashPassword(newPass, newSalt);
    const timestampNow = new Date().toLocaleString('th-TH', { hour12: false });

    // Update user password and revoke existing sessions
    await db.execute({
      sql: `UPDATE users 
            SET password_hash = ?, salt = ?, password_setup_status = 'completed', session_token = NULL, session_expires_at = NULL,
                failed_login_attempts = 0, locked_until = NULL, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
      args: [newHash, newSalt, userId],
    });

    // Mark token as used
    await db.execute({
      sql: `UPDATE password_reset_tokens SET used = 1, used_at = CURRENT_TIMESTAMP WHERE id = ?`,
      args: [String(tokenRow.id)],
    });

    // Audit log
    await db.execute({
      sql: `INSERT INTO audit_logs (id, timestamp, user_id, user_name, user_role, action, entity_type, entity_id, description, ip_address)
            VALUES (?, ?, ?, 'User', 'member', 'PASSWORD_RESET_COMPLETED', 'auth', ?, ?, ?)`,
      args: [
        `log-auth-${Date.now()}`,
        timestampNow,
        userId,
        userId,
        `ตั้งรหัสผ่านใหม่สำเร็จผ่าน Reset Token และยกเลิก Session เดิมทั้งหมด จาก IP: ${ipAddress}`,
        ipAddress,
      ],
    });

    return {
      success: true,
      message: 'ตั้งรหัสผ่านใหม่สำเร็จเรียบร้อยแล้ว และระบบได้ยกเลิก Session เดิมทั้งหมดเพื่อความปลอดภัย',
    };
  }

  /**
   * 6. Update Profile & Change Password (Strict Privilege Isolation)
   */
  static async updateProfile(userId: string, input: UpdateProfileInput, ipAddress: string = '127.0.0.1'): Promise<User> {
    await initDb();
    const db = getDb();

    // Check for unauthorized privilege escalation
    if ((input as any).role !== undefined) {
      throw new Error('ไม่อนุญาตให้แก้ไขสิทธิ์หรือบทบาทผู้ใช้งานด้วยตนเอง');
    }
    if ((input as any).branch_id !== undefined || (input as any).department_id !== undefined) {
      throw new Error('ไม่อนุญาตให้แก้ไขสาขาหรือแผนกด้วยตนเอง');
    }

    const userRes = await db.execute({
      sql: `SELECT id, email, name, first_name, last_name, role, role_title_th, phone, branch, branch_id, department_id,
                   password_hash, salt, status
            FROM users WHERE id = ?`,
      args: [userId],
    });

    if (userRes.rows.length === 0) {
      throw new Error('ไม่พบข้อมูลผู้ใช้งาน');
    }

    const userRow: any = userRes.rows[0];
    const timestampNow = new Date().toLocaleString('th-TH', { hour12: false });

    let updatedFirst = userRow.first_name ? String(userRow.first_name) : userRow.name.split(' ')[0] || '';
    let updatedLast = userRow.last_name ? String(userRow.last_name) : userRow.name.split(' ').slice(1).join(' ') || '';

    if (input.firstName && input.firstName.trim()) updatedFirst = input.firstName.trim();
    if (input.lastName && input.lastName.trim()) updatedLast = input.lastName.trim();

    let updatedName = `${updatedFirst} ${updatedLast}`.trim();
    if (input.name && input.name.trim()) updatedName = input.name.trim();

    let updatedPhone = userRow.phone;
    if (input.phone && input.phone.trim()) {
      updatedPhone = input.phone.trim();
    }

    // Handle Password Change if requested
    if (input.newPassword) {
      if (!input.currentPassword) {
        throw new Error('กรุณาระบุรหัสผ่านปัจจุบันเพื่อยืนยันตัวตน');
      }

      const storedHash = String(userRow.password_hash);
      const salt = String(userRow.salt);
      const currentComputedHash = this.hashPassword(input.currentPassword, salt);

      if (storedHash !== currentComputedHash) {
        throw new Error('รหัสผ่านปัจจุบันไม่ถูกต้อง');
      }

      if (input.newPassword !== input.confirmPassword) {
        throw new Error('รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน');
      }

      const passCheck = this.validatePasswordStrength(input.newPassword);
      if (!passCheck.valid) {
        throw new Error(passCheck.reason);
      }

      const newSalt = `zms_${crypto.randomBytes(16).toString('hex')}`;
      const newHash = this.hashPassword(input.newPassword, newSalt);

      await db.execute({
        sql: `UPDATE users SET password_hash = ?, salt = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        args: [newHash, newSalt, userId],
      });

      await db.execute({
        sql: `INSERT INTO audit_logs (id, timestamp, user_id, user_name, user_role, action, entity_type, entity_id, description, ip_address)
              VALUES (?, ?, ?, ?, ?, 'USER_PASSWORD_CHANGED', 'users', ?, ?, ?)`,
        args: [
          `log-auth-${Date.now()}`,
          timestampNow,
          userId,
          updatedName,
          userRow.role,
          userId,
          `เปลี่ยนรหัสผ่านด้วยตนเองสำเร็จ จาก IP: ${ipAddress}`,
          ipAddress,
        ],
      });
    }

    // Update Profile Info (Notification prefs, name, phone, first_name, last_name)
    await db.execute({
      sql: `UPDATE users 
            SET name = ?, first_name = ?, last_name = ?, phone = ?, 
                notification_email = ?, notification_sms = ?, notification_app = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
      args: [
        updatedName,
        updatedFirst,
        updatedLast,
        updatedPhone,
        input.notificationEmail !== undefined ? (input.notificationEmail ? 1 : 0) : 1,
        input.notificationSms !== undefined ? (input.notificationSms ? 1 : 0) : 0,
        input.notificationApp !== undefined ? (input.notificationApp ? 1 : 0) : 1,
        userId,
      ],
    });

    // Audit log
    await db.execute({
      sql: `INSERT INTO audit_logs (id, timestamp, user_id, user_name, user_role, action, entity_type, entity_id, description, ip_address)
            VALUES (?, ?, ?, ?, ?, 'USER_PROFILE_UPDATED', 'users', ?, ?, ?)`,
      args: [
        `log-auth-${Date.now()}`,
        timestampNow,
        userId,
        updatedName,
        userRow.role,
        userId,
        `แก้ไขข้อมูลโปรไฟล์ส่วนตัวสำเร็จ จาก IP: ${ipAddress}`,
        ipAddress,
      ],
    });

    const userResAfter = await db.execute({
      sql: `SELECT u.id, u.email, u.name, u.first_name, u.last_name, u.role, u.role_title_th, u.phone, 
                   u.branch, u.branch_id, u.department_id, u.status, u.session_expires_at, u.last_login,
                   u.email_verified, u.phone_verified, u.notification_email, u.notification_sms, u.notification_app,
                   u.pdpa_consent_date, u.created_at,
                   b.name as branch_name, d.name as department_name
            FROM users u
            LEFT JOIN branches b ON u.branch_id = b.id
            LEFT JOIN departments d ON u.department_id = d.id
            WHERE u.id = ?`,
      args: [userId],
    });

    const rowAfter: any = userResAfter.rows[0];
    return {
      id: String(rowAfter.id),
      email: String(rowAfter.email),
      name: String(rowAfter.name),
      firstName: rowAfter.first_name ? String(rowAfter.first_name) : undefined,
      lastName: rowAfter.last_name ? String(rowAfter.last_name) : undefined,
      role: String(rowAfter.role) as UserRole,
      roleTitleTh: String(rowAfter.role_title_th),
      phone: String(rowAfter.phone),
      branch: rowAfter.branch_name ? String(rowAfter.branch_name) : String(rowAfter.branch),
      branchId: rowAfter.branch_id ? String(rowAfter.branch_id) : undefined,
      departmentId: rowAfter.department_id ? String(rowAfter.department_id) : undefined,
      departmentName: rowAfter.department_name ? String(rowAfter.department_name) : undefined,
      status: String(rowAfter.status) as any,
      lastLogin: String(rowAfter.last_login || ''),
      emailVerified: Boolean(rowAfter.email_verified),
      phoneVerified: Boolean(rowAfter.phone_verified),
      notificationEmail: Boolean(rowAfter.notification_email ?? true),
      notificationSms: Boolean(rowAfter.notification_sms ?? false),
      notificationApp: Boolean(rowAfter.notification_app ?? true),
      pdpaConsentDate: rowAfter.pdpa_consent_date ? String(rowAfter.pdpa_consent_date) : undefined,
      createdAt: rowAfter.created_at ? String(rowAfter.created_at) : undefined,
    };
  }

  /**
   * 8. Fetch Organization Branches & Departments
   */
  static async getOrganizationStructure(): Promise<{ branches: Branch[]; departments: Department[] }> {
    await initDb();
    const db = getDb();

    const branchRes = await db.execute(`SELECT id, code, name, province, is_headquarters FROM branches ORDER BY is_headquarters DESC, code ASC`);
    const deptRes = await db.execute(`SELECT id, code, name, description FROM departments ORDER BY code ASC`);

    const branches: Branch[] = branchRes.rows.map((b: any) => ({
      id: String(b.id),
      code: String(b.code),
      name: String(b.name),
      province: String(b.province),
      isHeadquarters: Boolean(b.is_headquarters),
    }));

    const departments: Department[] = deptRes.rows.map((d: any) => ({
      id: String(d.id),
      code: String(d.code),
      name: String(d.name),
      description: d.description ? String(d.description) : undefined,
    }));

    return { branches, departments };
  }

  /**
   * 9. RBAC Permission Checker
   */
  static checkPermission(role: UserRole, allowedRoles: UserRole[]): boolean {
    if (role === 'super_admin') return true;
    return allowedRoles.includes(role);
  }

  /**
   * 10. Admin: Get All Users with Filters and Details
   */
  static async getAllUsers(filters?: {
    role?: string;
    branchId?: string;
    departmentId?: string;
    status?: string;
    passwordSetupStatus?: string;
    search?: string;
  }): Promise<{ users: User[]; total: number; pendingSetupCount: number }> {
    await initDb();
    const db = getDb();

    let query = `
      SELECT u.id, u.email, u.name, u.first_name, u.last_name, u.role, u.role_title_th, u.phone,
             u.branch, u.branch_id, u.department_id, u.status, u.password_setup_status,
             (u.password_hash IS NOT NULL) as has_password,
             u.last_login, u.created_at, u.updated_at,
             b.name as branch_name, d.name as department_name
      FROM users u
      LEFT JOIN branches b ON u.branch_id = b.id
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE 1=1
    `;
    const args: any[] = [];

    if (filters?.role && filters.role !== 'all') {
      query += ` AND u.role = ?`;
      args.push(filters.role);
    }
    if (filters?.branchId && filters.branchId !== 'all') {
      query += ` AND u.branch_id = ?`;
      args.push(filters.branchId);
    }
    if (filters?.departmentId && filters.departmentId !== 'all') {
      query += ` AND u.department_id = ?`;
      args.push(filters.departmentId);
    }
    if (filters?.status && filters.status !== 'all') {
      query += ` AND u.status = ?`;
      args.push(filters.status);
    }
    if (filters?.passwordSetupStatus && filters.passwordSetupStatus !== 'all') {
      query += ` AND u.password_setup_status = ?`;
      args.push(filters.passwordSetupStatus);
    }
    if (filters?.search) {
      const term = `%${filters.search.trim()}%`;
      query += ` AND (u.name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)`;
      args.push(term, term, term);
    }

    query += ` ORDER BY u.created_at ASC`;

    const res = await db.execute({ sql: query, args });

    // Calculate pending setup count overall
    const countRes = await db.execute(`SELECT COUNT(*) as count FROM users WHERE password_setup_status = 'pending_setup'`);
    const pendingSetupCount = Number(countRes.rows[0]?.count || 0);

    const users: User[] = res.rows.map((r: any) => ({
      id: String(r.id),
      name: String(r.name),
      firstName: r.first_name ? String(r.first_name) : undefined,
      lastName: r.last_name ? String(r.last_name) : undefined,
      email: String(r.email),
      phone: String(r.phone),
      role: String(r.role) as UserRole,
      roleTitleTh: String(r.role_title_th),
      branch: r.branch_name ? String(r.branch_name) : String(r.branch),
      branchId: r.branch_id ? String(r.branch_id) : undefined,
      branchName: r.branch_name ? String(r.branch_name) : undefined,
      departmentId: r.department_id ? String(r.department_id) : undefined,
      departmentName: r.department_name ? String(r.department_name) : undefined,
      status: String(r.status) as any,
      passwordSetupStatus: (r.password_setup_status as any) || (r.has_password ? 'completed' : 'pending_setup'),
      hasPassword: Boolean(r.has_password),
      lastLogin: r.last_login ? String(r.last_login) : undefined,
      createdAt: r.created_at ? String(r.created_at) : undefined,
      updatedAt: r.updated_at ? String(r.updated_at) : undefined,
    }));

    return { users, total: users.length, pendingSetupCount };
  }

  /**
   * 11. Admin: Create New User & Provision Invite Token (No Hardcoded Passwords)
   */
  static async createUserByAdmin(
    input: {
      firstName: string;
      lastName: string;
      email: string;
      phone?: string;
      role: UserRole;
      branchId: string;
      departmentId: string;
      sendInvite?: boolean;
    },
    actorUser: User,
    ipAddress: string = '127.0.0.1'
  ): Promise<{ user: User; setupToken?: string; setupUrl?: string; message: string }> {
    if (actorUser.role !== 'super_admin') {
      throw new Error('เฉพาะผู้ดูแลระบบสูงสุด (Super Admin) เท่านั้นที่สามารถสร้างบัญชีผู้ใช้ได้');
    }

    await initDb();
    const db = getDb();

    const cleanFirst = (input.firstName || '').trim();
    const cleanLast = (input.lastName || '').trim();
    const cleanEmail = (input.email || '').trim().toLowerCase();
    const cleanPhone = (input.phone || '').trim().replace(/[^0-9]/g, '');

    if (!cleanFirst || !cleanLast) {
      throw new Error('กรุณาระบุชื่อและนามสกุล');
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      throw new Error('รูปแบบอีเมลไม่ถูกต้อง');
    }

    // Check email uniqueness
    const existing = await db.execute({
      sql: `SELECT id FROM users WHERE LOWER(email) = ?`,
      args: [cleanEmail],
    });
    if (existing.rows.length > 0) {
      throw new Error('อีเมลนี้มีอยู่ในระบบแล้ว กรุณาใช้อีเมลอื่น');
    }

    // Lookup branch & dept names
    let branchName = 'สำนักงานใหญ่ กรุงเทพฯ';
    let deptName = 'ส่วนกลาง';

    const bRes = await db.execute({ sql: `SELECT name FROM branches WHERE id = ?`, args: [input.branchId] });
    if (bRes.rows.length > 0) branchName = String(bRes.rows[0].name);

    const dRes = await db.execute({ sql: `SELECT name FROM departments WHERE id = ?`, args: [input.departmentId] });
    if (dRes.rows.length > 0) deptName = String(dRes.rows[0].name);

    // Map role title
    const roleTitles: Record<UserRole, string> = {
      super_admin: 'ผู้ดูแลระบบสูงสุด (Super Admin)',
      executive: 'ผู้บริหาร / ประธานมูลนิธิ (Executive)',
      officer: 'เจ้าหน้าที่ช่วยเหลือสังคม (Help Officer)',
      approver: 'ผู้อนุมัติคำร้อง / ชะรีอะฮ์ (Approver)',
      finance: 'หัวหน้าฝ่ายการเงินและบัญชี (Finance)',
      member: 'สมาชิกทั่วไป (Member)',
      public: 'ผู้เยี่ยมชมทั่วไป',
    };
    const roleTitleTh = roleTitles[input.role] || 'เจ้าหน้าที่';

    const userId = `u-staff-${Date.now()}`;
    const fullName = `${cleanFirst} ${cleanLast}`;
    const timestampNow = new Date().toLocaleString('th-TH', { hour12: false });

    // Insert user with status 'active', password_setup_status 'pending_setup', NO password_hash
    await db.execute({
      sql: `INSERT INTO users (
        id, email, name, first_name, last_name, role, role_title_th, phone, branch, branch_id, department_id,
        status, password_setup_status, password_hash, salt, last_login, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', 'pending_setup', NULL, NULL, 'ยังไม่เคยเข้าสู่ระบบ', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      args: [
        userId,
        cleanEmail,
        fullName,
        cleanFirst,
        cleanLast,
        input.role,
        roleTitleTh,
        cleanPhone || '08X-XXX-XXXX',
        branchName,
        input.branchId,
        input.departmentId,
      ],
    });

    let rawToken: string | undefined;
    let setupUrl: string | undefined;

    if (input.sendInvite !== false) {
      rawToken = this.generateRandomToken(32);
      const tokenHash = this.hashToken(rawToken);
      const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(); // 48 hours for setup invite

      await db.execute({
        sql: `INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at, used, created_ip)
              VALUES (?, ?, ?, ?, 0, ?)`,
        args: [`prt-inv-${Date.now()}`, userId, tokenHash, expiresAt, ipAddress],
      });

      setupUrl = `/reset-password?token=${rawToken}`;
    }

    // Audit Log
    await db.execute({
      sql: `INSERT INTO audit_logs (id, timestamp, user_id, user_name, user_role, action, entity_type, entity_id, description, ip_address)
            VALUES (?, ?, ?, ?, ?, 'USER_CREATED_BY_ADMIN', 'users', ?, ?, ?)`,
      args: [
        `log-auth-${Date.now()}`,
        timestampNow,
        actorUser.id,
        actorUser.name,
        actorUser.role,
        userId,
        `ผู้ดูแลระบบสร้างผู้ใช้ใหม่: ${fullName} (${cleanEmail}, Role: ${input.role}, Branch: ${branchName}, Dept: ${deptName})`,
        ipAddress,
      ],
    });

    const createdUser: User = {
      id: userId,
      name: fullName,
      firstName: cleanFirst,
      lastName: cleanLast,
      email: cleanEmail,
      phone: cleanPhone || '08X-XXX-XXXX',
      role: input.role,
      roleTitleTh,
      branch: branchName,
      branchId: input.branchId,
      branchName,
      departmentId: input.departmentId,
      departmentName: deptName,
      status: 'active',
      passwordSetupStatus: 'pending_setup',
      hasPassword: false,
    };

    return {
      user: createdUser,
      setupToken: rawToken,
      setupUrl,
      message: `สร้างบัญชีผู้ใช้ ${fullName} เรียบร้อยแล้ว พร้อมสร้างลิงก์คำเชิญตั้งรหัสผ่าน`,
    };
  }

  /**
   * 12. Admin: Send/Resend Password Setup Invitation Link
   */
  static async sendPasswordSetupInvite(
    targetUserId: string,
    actorUser: User,
    ipAddress: string = '127.0.0.1'
  ): Promise<{ success: boolean; message: string; setupUrl: string; rawToken: string }> {
    if (actorUser.role !== 'super_admin') {
      throw new Error('เฉพาะผู้ดูแลระบบสูงสุด (Super Admin) เท่านั้นที่สามารถส่งคำเชิญตั้งรหัสผ่านได้');
    }

    await initDb();
    const db = getDb();

    const userRes = await db.execute({
      sql: `SELECT id, name, email, role, status FROM users WHERE id = ?`,
      args: [targetUserId],
    });

    if (userRes.rows.length === 0) {
      throw new Error('ไม่พบข้อมูลผู้ใช้งานที่ระบุ');
    }

    const targetUser: any = userRes.rows[0];
    if (String(targetUser.status) === 'disabled') {
      throw new Error('ไม่สามารถส่งคำเชิญให้บัญชีที่ถูกปิดใช้งานได้');
    }

    // Invalidate any existing unused tokens for this user
    await db.execute({
      sql: `UPDATE password_reset_tokens SET used = 1 WHERE user_id = ? AND used = 0`,
      args: [targetUserId],
    });

    // Generate fresh secure 32-byte token
    const rawToken = this.generateRandomToken(32);
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(); // 48 hours validity
    const timestampNow = new Date().toLocaleString('th-TH', { hour12: false });

    await db.execute({
      sql: `INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at, used, created_ip)
            VALUES (?, ?, ?, ?, 0, ?)`,
      args: [`prt-inv-${Date.now()}`, targetUserId, tokenHash, expiresAt, ipAddress],
    });

    // Mark password_setup_status = 'pending_setup' if it wasn't completed
    await db.execute({
      sql: `UPDATE users SET password_setup_status = 'pending_setup', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND password_hash IS NULL`,
      args: [targetUserId],
    });

    // Audit log
    await db.execute({
      sql: `INSERT INTO audit_logs (id, timestamp, user_id, user_name, user_role, action, entity_type, entity_id, description, ip_address)
            VALUES (?, ?, ?, ?, ?, 'USER_INVITATION_SENT', 'auth', ?, ?, ?)`,
      args: [
        `log-auth-${Date.now()}`,
        timestampNow,
        actorUser.id,
        actorUser.name,
        actorUser.role,
        targetUserId,
        `ส่งลิงก์คำเชิญตั้งรหัสผ่านให้แก่: ${targetUser.name} (${targetUser.email}) โดย ${actorUser.name}`,
        ipAddress,
      ],
    });

    return {
      success: true,
      message: `สร้างลิงก์คำเชิญตั้งรหัสผ่านสำหรับ ${targetUser.name} เรียบร้อยแล้ว (มีอายุใช้งาน 48 ชั่วโมง)`,
      rawToken,
      setupUrl: `/reset-password?token=${rawToken}`,
    };
  }

  /**
   * 13. Admin: Update Account Status (active, suspended, disabled)
   */
  static async updateUserStatus(
    targetUserId: string,
    newStatus: 'active' | 'suspended' | 'disabled',
    actorUser: User,
    ipAddress: string = '127.0.0.1'
  ): Promise<{ success: boolean; user: any; message: string }> {
    if (actorUser.role !== 'super_admin') {
      throw new Error('เฉพาะผู้ดูแลระบบสูงสุด (Super Admin) เท่านั้นที่สามารถเปลี่ยนสถานะผู้ใช้ได้');
    }

    if (targetUserId === actorUser.id && newStatus !== 'active') {
      throw new Error('ไม่อนุญาตให้ระงับหรือปิดใช้งานบัญชีของตนเอง');
    }

    if (!['active', 'suspended', 'disabled'].includes(newStatus)) {
      throw new Error('สถานะผู้ใช้งานไม่ถูกต้อง (ต้องเป็น active, suspended หรือ disabled)');
    }

    await initDb();
    const db = getDb();

    const userRes = await db.execute({
      sql: `SELECT id, name, email, role, status FROM users WHERE id = ?`,
      args: [targetUserId],
    });

    if (userRes.rows.length === 0) {
      throw new Error('ไม่พบผู้ใช้งานที่ระบุ');
    }

    const targetUser: any = userRes.rows[0];

    // Protection: Prevent suspending or disabling the last active Super Admin
    if (String(targetUser.role) === 'super_admin' && (newStatus === 'suspended' || newStatus === 'disabled')) {
      const saCountRes = await db.execute(`SELECT COUNT(*) as count FROM users WHERE role = 'super_admin' AND status = 'active'`);
      const activeSuperAdmins = Number(saCountRes.rows[0].count);
      if (activeSuperAdmins <= 1) {
        throw new Error('ไม่อนุญาตให้ระงับหรือปิดใช้งาน Super Admin คนสุดท้ายของระบบ เพื่อป้องกันความเสียหายต่อการดูแลระบบ');
      }
    }

    const timestampNow = new Date().toLocaleString('th-TH', { hour12: false });

    // If suspended or disabled, revoke any active session tokens immediately
    if (newStatus === 'suspended' || newStatus === 'disabled') {
      await db.execute({
        sql: `UPDATE users SET status = ?, session_token = NULL, session_expires_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        args: [newStatus, targetUserId],
      });
    } else {
      await db.execute({
        sql: `UPDATE users SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        args: [newStatus, targetUserId],
      });
    }

    // Audit Log
    const statusLabels: Record<string, string> = {
      active: 'เปิดใช้งาน (Active)',
      suspended: 'ระงับชั่วคราว (Suspended)',
      disabled: 'ปิดใช้งาน (Disabled)',
    };

    await db.execute({
      sql: `INSERT INTO audit_logs (id, timestamp, user_id, user_name, user_role, action, entity_type, entity_id, description, ip_address)
            VALUES (?, ?, ?, ?, ?, 'USER_STATUS_CHANGED', 'users', ?, ?, ?)`,
      args: [
        `log-auth-${Date.now()}`,
        timestampNow,
        actorUser.id,
        actorUser.name,
        actorUser.role,
        targetUserId,
        `เปลี่ยนสถานะบัญชี ${targetUser.name} (${targetUser.email}) เป็น: ${statusLabels[newStatus]} โดย ${actorUser.name}`,
        ipAddress,
      ],
    });

    return {
      success: true,
      user: { id: targetUserId, status: newStatus },
      message: `เปลี่ยนสถานะบัญชีของ ${targetUser.name} เป็น ${statusLabels[newStatus]} เรียบร้อยแล้ว`,
    };
  }

  /**
   * 14. Admin: Update User Profile & Role/Branch/Department Assignment
   */
  static async updateUserByAdmin(
    targetUserId: string,
    input: {
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
      role?: UserRole;
      branchId?: string;
      departmentId?: string;
    },
    actorUser: User,
    ipAddress: string = '127.0.0.1'
  ): Promise<{ success: boolean; user: User; message: string }> {
    if (actorUser.role !== 'super_admin') {
      throw new Error('เฉพาะผู้ดูแลระบบสูงสุด (Super Admin) เท่านั้นที่สามารถแก้ไขข้อมูลผู้ใช้งานได้');
    }

    await initDb();
    const db = getDb();

    const userRes = await db.execute({
      sql: `SELECT id, email, name, first_name, last_name, phone, role, branch, branch_id, department_id, status, password_setup_status
            FROM users WHERE id = ?`,
      args: [targetUserId],
    });

    if (userRes.rows.length === 0) {
      throw new Error('ไม่พบข้อมูลผู้ใช้งานที่ระบุ');
    }

    const current: any = userRes.rows[0];

    // Clean inputs
    const newFirstName = input.firstName !== undefined ? input.firstName.trim() : (current.first_name || '');
    const newLastName = input.lastName !== undefined ? input.lastName.trim() : (current.last_name || '');
    const newEmail = input.email !== undefined ? input.email.trim().toLowerCase() : current.email;
    const newPhone = input.phone !== undefined ? input.phone.trim().replace(/[^0-9]/g, '') : current.phone;
    const newRole = input.role || current.role;
    const newBranchId = input.branchId || current.branch_id;
    const newDepartmentId = input.departmentId || current.department_id;

    if (!newFirstName || !newLastName) {
      throw new Error('กรุณาระบุชื่อและนามสกุล');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      throw new Error('รูปแบบอีเมลไม่ถูกต้อง');
    }

    // Check email uniqueness if email changed
    if (newEmail !== current.email) {
      const emailDupCheck = await db.execute({
        sql: `SELECT id FROM users WHERE LOWER(email) = ? AND id != ?`,
        args: [newEmail, targetUserId],
      });
      if (emailDupCheck.rows.length > 0) {
        throw new Error('อีเมลนี้ถูกใช้งานโดยผู้ใช้อื่นในระบบแล้ว');
      }
    }

    // Protection: Prevent demoting the last active Super Admin
    if (current.role === 'super_admin' && newRole !== 'super_admin') {
      const saCountRes = await db.execute(`SELECT COUNT(*) as count FROM users WHERE role = 'super_admin' AND status = 'active'`);
      const activeSuperAdmins = Number(saCountRes.rows[0].count);
      if (activeSuperAdmins <= 1) {
        throw new Error('ไม่อนุญาตให้ลดระดับสิทธิ์ Super Admin คนสุดท้ายของระบบ');
      }
    }

    // Protection: Self-demotion guard
    if (targetUserId === actorUser.id && newRole !== 'super_admin') {
      throw new Error('ไม่อนุญาตให้ลดระดับสิทธิ์ Super Admin ของตนเอง');
    }

    // Resolve branch and department names
    let branchName = current.branch || 'สำนักงานใหญ่ กรุงเทพฯ';
    let departmentName = 'ส่วนกลาง';

    if (newBranchId) {
      const bRes = await db.execute({ sql: `SELECT name FROM branches WHERE id = ?`, args: [newBranchId] });
      if (bRes.rows.length > 0) branchName = String(bRes.rows[0].name);
    }
    if (newDepartmentId) {
      const dRes = await db.execute({ sql: `SELECT name FROM departments WHERE id = ?`, args: [newDepartmentId] });
      if (dRes.rows.length > 0) departmentName = String(dRes.rows[0].name);
    }

    const roleTitles: Record<UserRole, string> = {
      super_admin: 'ผู้ดูแลระบบสูงสุด (Super Admin)',
      executive: 'ผู้บริหาร / ประธานมูลนิธิ (Executive)',
      officer: 'เจ้าหน้าที่ช่วยเหลือสังคม (Help Officer)',
      approver: 'ผู้อนุมัติคำร้อง / ชะรีอะฮ์ (Approver)',
      finance: 'หัวหน้าฝ่ายการเงินและบัญชี (Finance)',
      member: 'สมาชิกทั่วไป (Member)',
      public: 'ผู้เยี่ยมชมทั่วไป',
    };
    const roleTitleTh = roleTitles[newRole as UserRole] || 'เจ้าหน้าที่';
    const fullName = `${newFirstName} ${newLastName}`;
    const timestampNow = new Date().toLocaleString('th-TH', { hour12: false });

    // Update DB
    await db.execute({
      sql: `UPDATE users
            SET name = ?, first_name = ?, last_name = ?, email = ?, phone = ?,
                role = ?, role_title_th = ?, branch = ?, branch_id = ?, department_id = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
      args: [
        fullName,
        newFirstName,
        newLastName,
        newEmail,
        newPhone || '08X-XXX-XXXX',
        newRole,
        roleTitleTh,
        branchName,
        newBranchId,
        newDepartmentId,
        targetUserId,
      ],
    });

    // Audit Log with diff details
    const changes: string[] = [];
    if (current.name !== fullName) changes.push(`ชื่อ: ${current.name} -> ${fullName}`);
    if (current.email !== newEmail) changes.push(`อีเมล: ${current.email} -> ${newEmail}`);
    if (current.role !== newRole) changes.push(`Role: ${current.role} -> ${newRole}`);
    if (current.branch_id !== newBranchId) changes.push(`สาขา: ${branchName}`);
    if (current.department_id !== newDepartmentId) changes.push(`แผนก: ${departmentName}`);

    await db.execute({
      sql: `INSERT INTO audit_logs (id, timestamp, user_id, user_name, user_role, action, entity_type, entity_id, description, ip_address)
            VALUES (?, ?, ?, ?, ?, 'USER_UPDATED_BY_ADMIN', 'users', ?, ?, ?)`,
      args: [
        `log-auth-${Date.now()}`,
        timestampNow,
        actorUser.id,
        actorUser.name,
        actorUser.role,
        targetUserId,
        `ผู้ดูแลระบบแก้ไขข้อมูลผู้ใช้ ${fullName}: ${changes.join(', ') || 'บันทึกข้อมูลทั่วไป'} โดย ${actorUser.name}`,
        ipAddress,
      ],
    });

    const updatedUser: User = {
      id: targetUserId,
      name: fullName,
      firstName: newFirstName,
      lastName: newLastName,
      email: newEmail,
      phone: newPhone || '08X-XXX-XXXX',
      role: newRole as UserRole,
      roleTitleTh,
      branch: branchName,
      branchId: newBranchId,
      branchName,
      departmentId: newDepartmentId,
      departmentName,
      status: current.status,
      passwordSetupStatus: current.password_setup_status,
    };

    return {
      success: true,
      user: updatedUser,
      message: `อัปเดตข้อมูลของ ${fullName} เรียบร้อยแล้ว`,
    };
  }

  /**
   * 15. Admin: Trigger Password Reset for User (Secure Single-Use Token)
   */
  static async sendPasswordResetByAdmin(
    targetUserId: string,
    actorUser: User,
    ipAddress: string = '127.0.0.1'
  ): Promise<{ success: boolean; message: string; resetUrl: string; rawToken: string; emailStatus: string }> {
    if (actorUser.role !== 'super_admin') {
      throw new Error('เฉพาะผู้ดูแลระบบสูงสุด (Super Admin) เท่านั้นที่สามารถสั่งรีเซ็ตรหัสผ่านได้');
    }

    await initDb();
    const db = getDb();

    const userRes = await db.execute({
      sql: `SELECT id, name, email, role, status FROM users WHERE id = ?`,
      args: [targetUserId],
    });

    if (userRes.rows.length === 0) {
      throw new Error('ไม่พบข้อมูลผู้ใช้งานที่ระบุ');
    }

    const targetUser: any = userRes.rows[0];
    if (String(targetUser.status) === 'disabled') {
      throw new Error('ไม่สามารถรีเซ็ตรหัสผ่านให้บัญชีที่ถูกปิดใช้งานได้');
    }

    // Revoke any active session immediately per security policy
    await db.execute({
      sql: `UPDATE users SET session_token = NULL, session_expires_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      args: [targetUserId],
    });

    // Invalidate existing unused tokens for this user
    await db.execute({
      sql: `UPDATE password_reset_tokens SET used = 1 WHERE user_id = ? AND used = 0`,
      args: [targetUserId],
    });

    // Generate fresh secure 32-byte token
    const rawToken = this.generateRandomToken(32);
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(); // 48 hours validity
    const timestampNow = new Date().toLocaleString('th-TH', { hour12: false });

    await db.execute({
      sql: `INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at, used, created_ip)
            VALUES (?, ?, ?, ?, 0, ?)`,
      args: [`prt-adm-reset-${Date.now()}`, targetUserId, tokenHash, expiresAt, ipAddress],
    });

    // Audit Log
    await db.execute({
      sql: `INSERT INTO audit_logs (id, timestamp, user_id, user_name, user_role, action, entity_type, entity_id, description, ip_address)
            VALUES (?, ?, ?, ?, ?, 'PASSWORD_RESET_TRIGGERED_BY_ADMIN', 'auth', ?, ?, ?)`,
      args: [
        `log-auth-${Date.now()}`,
        timestampNow,
        actorUser.id,
        actorUser.name,
        actorUser.role,
        targetUserId,
        `ผู้ดูแลระบบส่งคำขอรีเซ็ตรหัสผ่านสำหรับ: ${targetUser.name} (${targetUser.email}) และเพิกถอน Session เดิมทั้งหมด`,
        ipAddress,
      ],
    });

    return {
      success: true,
      message: `สร้างลิงก์รีเซ็ตรหัสผ่านสำหรับ ${targetUser.name} สำเร็จ (มีอายุใช้งาน 48 ชั่วโมง) และเพิกถอน Session เดิมทั้งหมดแล้ว`,
      rawToken,
      resetUrl: `/reset-password?token=${rawToken}`,
      emailStatus: 'ระบบยังไม่ได้เชื่อมต่อ SMTP Server จริง โทเคนถูกสร้างและเข้ารหัส SHA-256 บันทึกในฐานข้อมูลแล้ว',
    };
  }

  /**
   * 16. Admin: Revoke User Active Session
   */
  static async revokeUserSession(
    targetUserId: string,
    actorUser: User,
    ipAddress: string = '127.0.0.1'
  ): Promise<{ success: boolean; message: string }> {
    if (actorUser.role !== 'super_admin') {
      throw new Error('เฉพาะผู้ดูแลระบบสูงสุด (Super Admin) เท่านั้นที่สามารถยกเลิก Session ได้');
    }

    await initDb();
    const db = getDb();

    const userRes = await db.execute({
      sql: `SELECT id, name, email, role FROM users WHERE id = ?`,
      args: [targetUserId],
    });

    if (userRes.rows.length === 0) {
      throw new Error('ไม่พบข้อมูลผู้ใช้งานที่ระบุ');
    }

    const targetUser: any = userRes.rows[0];
    const timestampNow = new Date().toLocaleString('th-TH', { hour12: false });

    // Revoke session
    await db.execute({
      sql: `UPDATE users SET session_token = NULL, session_expires_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      args: [targetUserId],
    });

    // Audit Log
    await db.execute({
      sql: `INSERT INTO audit_logs (id, timestamp, user_id, user_name, user_role, action, entity_type, entity_id, description, ip_address)
            VALUES (?, ?, ?, ?, ?, 'USER_SESSION_REVOKED_BY_ADMIN', 'auth', ?, ?, ?)`,
      args: [
        `log-auth-${Date.now()}`,
        timestampNow,
        actorUser.id,
        actorUser.name,
        actorUser.role,
        targetUserId,
        `ผู้ดูแลระบบ ${actorUser.name} สั่งยกเลิก Session ของผู้ใช้งาน ${targetUser.name} (${targetUser.email})`,
        ipAddress,
      ],
    });

    return {
      success: true,
      message: `ยกเลิก Session ของ ${targetUser.name} เรียบร้อยแล้ว ผู้ใช้จะต้องเข้าสู่ระบบใหม่เพื่อใช้งาน`,
    };
  }

  /**
   * 17. Admin: Get Audit Logs for Specific User
   */
  static async getUserAuditLogs(
    targetUserId: string,
    actorUser: User
  ): Promise<{ success: boolean; logs: any[] }> {
    if (actorUser.role !== 'super_admin') {
      throw new Error('เฉพาะผู้ดูแลระบบสูงสุด (Super Admin) เท่านั้นที่สามารถดูประวัติการแก้ไขได้');
    }

    await initDb();
    const db = getDb();

    const res = await db.execute({
      sql: `SELECT id, timestamp, user_id, user_name, user_role, action, entity_type, entity_id, description, ip_address
            FROM audit_logs
            WHERE entity_id = ? OR user_id = ?
            ORDER BY timestamp DESC
            LIMIT 50`,
      args: [targetUserId, targetUserId],
    });

    return {
      success: true,
      logs: res.rows.map((r: any) => ({
        id: String(r.id),
        timestamp: String(r.timestamp),
        userId: String(r.user_id),
        userName: String(r.user_name),
        userRole: String(r.user_role),
        action: String(r.action),
        entityType: String(r.entity_type),
        entityId: String(r.entity_id),
        description: String(r.description),
        ipAddress: String(r.ip_address),
      })),
    };
  }
}
