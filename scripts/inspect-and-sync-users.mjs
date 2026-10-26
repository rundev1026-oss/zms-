// scripts/inspect-and-sync-users.mjs
import { createClient } from '@libsql/client';
import path from 'path';

const DB_PATH = path.resolve(process.cwd(), 'data', 'zms.db');
const db = createClient({
  url: `file:${DB_PATH.replace(/\\/g, '/')}`,
});

async function main() {
  console.log('Inspecting and syncing user accounts in DB...');

  // 1. Check table info
  const tableInfo = await db.execute("PRAGMA table_info(users)");
  const cols = tableInfo.rows.map(r => r.name);
  console.log('Users columns:', cols);

  if (!cols.includes('password_setup_status')) {
    console.log('Adding column password_setup_status...');
    await db.execute("ALTER TABLE users ADD COLUMN password_setup_status TEXT DEFAULT 'pending_setup'");
  }

  // 2. Ensure Super Admin (u-1) has password_setup_status = 'completed' and is active
  await db.execute(`
    UPDATE users 
    SET password_setup_status = 'completed', status = 'active'
    WHERE id = 'u-1'
  `);

  // 3. Ensure Member (u-6) has password_setup_status = 'completed' and is active
  await db.execute(`
    UPDATE users 
    SET password_setup_status = 'completed', status = 'active'
    WHERE id = 'u-6'
  `);

  // 4. Ensure Department Users (u-2, u-3, u-4, u-5) are 'pending_setup' and have NO hardcoded password
  // This satisfies:
  // "ผู้ใช้งานในแต่ละแผนกยังไม่ได้กำหนดรหัสผ่าน ทำให้ไม่สามารถเข้าสู่ระบบได้"
  // "ห้ามใช้รหัสผ่านเริ่มต้นเดียวกันสำหรับทุกแผนก และห้ามบันทึกรหัสผ่านในไฟล์ User, Source Code, Database Profile หรือ Log"
  await db.execute(`
    UPDATE users 
    SET password_setup_status = 'pending_setup',
        password_hash = NULL,
        salt = NULL,
        session_token = NULL,
        session_expires_at = NULL
    WHERE id IN ('u-2', 'u-3', 'u-4', 'u-5')
  `);

  // 5. Query and display all users
  const users = await db.execute(`
    SELECT u.id, u.name, u.email, u.role, u.branch, u.status, u.password_setup_status,
           CASE WHEN u.password_hash IS NULL THEN 0 ELSE 1 END as has_password,
           d.name as dept_name
    FROM users u
    LEFT JOIN departments d ON u.department_id = d.id
    ORDER BY u.id ASC
  `);

  console.log('\n--- Current Users in Database ---');
  console.table(users.rows);

  const pendingCount = users.rows.filter(r => r.password_setup_status === 'pending_setup').length;
  console.log(`\nTotal users: ${users.rows.length}`);
  console.log(`Users pending password setup: ${pendingCount}`);
}

main().catch(console.error);
