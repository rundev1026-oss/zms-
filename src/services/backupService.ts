import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { createClient } from '@libsql/client';
import { getDb, initDb } from '@/lib/db';

export interface BackupMetadata {
  filename: string;
  sizeBytes: number;
  createdAt: string;
  checksum: string;
  integrityOk: boolean;
}

export class BackupService {
  private static getPaths() {
    const dataDir = path.join(process.cwd(), 'data');
    const dbPath = path.join(dataDir, 'zms.db');
    const backupsDir = path.join(dataDir, 'backups');

    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true });
    }

    return { dataDir, dbPath, backupsDir };
  }

  /**
   * Calculate SHA-256 Checksum of a file
   */
  static calculateChecksum(filePath: string): string {
    const fileBuffer = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(fileBuffer).digest('hex');
  }

  /**
   * Verify SQLite integrity of a database file
   */
  static async verifyFileIntegrity(filePath: string): Promise<boolean> {
    const normalizedUrl = `file:${filePath.replace(/\\/g, '/')}`;
    const testClient = createClient({ url: normalizedUrl });
    try {
      const res = await testClient.execute('PRAGMA integrity_check;');
      return res.rows.length > 0 && String(res.rows[0].integrity_check) === 'ok';
    } catch {
      return false;
    }
  }

  /**
   * 1. Create a full database backup with SHA-256 Checksum and Integrity Verification
   */
  static async createBackup(
    note: string = 'สำรองข้อมูลตามรอบปกติ',
    actor: { id: string; name: string; role: string } = { id: 'u-1', name: 'ระบบอัตโนมัติ', role: 'super_admin' }
  ): Promise<BackupMetadata> {
    await initDb();
    const db = getDb();
    const { dbPath, backupsDir } = this.getPaths();

    if (!fs.existsSync(dbPath)) {
      throw new Error(`ไม่พบไฟล์ฐานข้อมูลต้นทางที่ ${dbPath}`);
    }

    const timestampStr = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFilename = `zms-backup-${timestampStr}.db`;
    const backupFilePath = path.join(backupsDir, backupFilename);

    // 1. Safe atomic copy
    fs.copyFileSync(dbPath, backupFilePath);

    // 2. Calculate Checksum
    const checksum = this.calculateChecksum(backupFilePath);
    const stats = fs.statSync(backupFilePath);

    // 3. Verify Integrity
    const integrityOk = await this.verifyFileIntegrity(backupFilePath);
    if (!integrityOk) {
      fs.unlinkSync(backupFilePath); // Remove corrupt file
      throw new Error('การสำรองข้อมูลล้มเหลว: ตรวจพบความเสียหายของไฟล์สำรอง (Integrity Check Failed)');
    }

    const timestampNow = new Date().toLocaleString('th-TH', { hour12: false });

    // 4. Audit Log
    await db.execute({
      sql: `INSERT INTO audit_logs (id, timestamp, user_id, user_name, user_role, action, entity_type, entity_id, description)
            VALUES (?, ?, ?, ?, ?, 'DATABASE_BACKUP_CREATED', 'system', ?, ?)`,
      args: [
        `log-backup-${Date.now()}`,
        timestampNow,
        actor.id,
        actor.name,
        actor.role,
        backupFilename,
        `สร้างไฟล์สำรองฐานข้อมูล ${backupFilename} (ขนาด ${(stats.size / 1024).toFixed(1)} KB, SHA-256: ${checksum.slice(0, 12)}...) หมายเหตุ: ${note}`,
      ],
    });

    return {
      filename: backupFilename,
      sizeBytes: stats.size,
      createdAt: timestampNow,
      checksum,
      integrityOk,
    };
  }

  /**
   * 2. List all available backups
   */
  static async listBackups(): Promise<BackupMetadata[]> {
    const { backupsDir } = this.getPaths();
    const files = fs.readdirSync(backupsDir).filter((f) => f.endsWith('.db'));

    const list: BackupMetadata[] = [];
    for (const f of files) {
      const p = path.join(backupsDir, f);
      const stat = fs.statSync(p);
      const checksum = this.calculateChecksum(p);
      const integrityOk = await this.verifyFileIntegrity(p);

      list.push({
        filename: f,
        sizeBytes: stat.size,
        createdAt: stat.mtime.toLocaleString('th-TH', { hour12: false }),
        checksum,
        integrityOk,
      });
    }

    return list.sort((a, b) => b.filename.localeCompare(a.filename));
  }

  /**
   * 3. Disaster Recovery: Restore Database from a Verified Backup
   */
  static async restoreBackup(
    backupFilename: string,
    actor: { id: string; name: string; role: string }
  ): Promise<{ success: boolean; restoredFrom: string; timestamp: string }> {
    // Only Super Admin can restore database
    if (actor.role !== 'super_admin') {
      throw new Error(`การละเมิดสิทธิ์ความปลอดภัย: เฉพาะผู้ดูแลระบบสูงสุด (Super Admin) เท่านั้นที่มีสิทธิ์กู้คืนฐานข้อมูลระบบ`);
    }

    const { dbPath, backupsDir, dataDir } = this.getPaths();
    const backupFilePath = path.join(backupsDir, backupFilename);

    if (!fs.existsSync(backupFilePath)) {
      throw new Error(`ไม่พบไฟล์สำรองข้อมูล "${backupFilename}" ในระบบ`);
    }

    // 1. Verify backup file integrity before touching active DB
    const integrityOk = await this.verifyFileIntegrity(backupFilePath);
    if (!integrityOk) {
      throw new Error(`ไม่สามารถกู้คืนได้: ไฟล์สำรองข้อมูลมีความเสียหาย (Integrity Check Failed)`);
    }

    // 2. Create safety snapshot of currently active DB before replacing it
    const safetySnapshotPath = path.join(dataDir, `zms-active-pre-restore-snapshot.db`);
    if (fs.existsSync(dbPath)) {
      fs.copyFileSync(dbPath, safetySnapshotPath);
    }

    // 3. Atomically overwrite active database with backup
    fs.copyFileSync(backupFilePath, dbPath);

    // 4. Verify restored active database
    const activeIntegrityOk = await this.verifyFileIntegrity(dbPath);
    if (!activeIntegrityOk) {
      // Emergency rollback to safety snapshot
      fs.copyFileSync(safetySnapshotPath, dbPath);
      throw new Error('เกิดข้อผิดพลาดร้ายแรงระหว่างการกู้คืน: ทำการ Rollback กลับสู่ฐานข้อมูลเดิมเรียบร้อย');
    }

    // Re-initialize DB
    await initDb();
    const db = getDb();
    const timestampNow = new Date().toLocaleString('th-TH', { hour12: false });

    // 5. Write audit log
    await db.execute({
      sql: `INSERT INTO audit_logs (id, timestamp, user_id, user_name, user_role, action, entity_type, entity_id, description)
            VALUES (?, ?, ?, ?, ?, 'DATABASE_RESTORED', 'system', ?, ?)`,
      args: [
        `log-restore-${Date.now()}`,
        timestampNow,
        actor.id,
        actor.name,
        actor.role,
        backupFilename,
        `กู้คืนฐานข้อมูลสำเร็จจากไฟล์ ${backupFilename} โดย ${actor.name} (${actor.role})`,
      ],
    });

    return {
      success: true,
      restoredFrom: backupFilename,
      timestamp: timestampNow,
    };
  }
}
