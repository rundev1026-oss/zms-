import crypto from 'crypto';
import { createClient } from '@libsql/client';

const JWT_SECRET = process.env.JWT_ACCESS_SECRET || 'dev-only-access-secret-change-me';
const SYSTEM_ADMIN_ID = process.env.SYSTEM_ADMIN_ID || 'dffb49d1-7cf3-4593-bb58-a82b25f5bff4';

function createServiceToken(userId = SYSTEM_ADMIN_ID) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(JSON.stringify({ sub: userId, exp: now + 3600, iat: now })).toString('base64url');
  const sig = crypto.createHmac('sha256', JWT_SECRET).update(header + '.' + payload).digest('base64url');
  return header + '.' + payload + '.' + sig;
}

async function syncAssessment() {
  const token = createServiceToken();
  const appId = 'a9d6e5c1-c480-4a10-ab41-a3a2d0e723b4';

  const res = await fetch(`http://localhost:4000/api/v1/assessments/${appId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    console.error('NestJS assessment fetch failed:', res.status);
    return;
  }
  const asm = await res.json();
  console.log('Fetched assessment from NestJS:', asm.id, asm.livingScore, asm.assessedByName);

  const db = createClient({ url: 'file:data/zms.db' });
  await db.execute({
    sql: `INSERT OR REPLACE INTO beneficiary_assessments (
      id, application_id, assessed_by_id, assessed_by_name, assessed_date,
      living_score, housing_condition, housing_notes, debt_burden_summary,
      primary_hardship, officer_recommendation, recommended_amount, recommended_fund_id, recommended_specific_fund_id, general_notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      asm.id,
      appId,
      asm.assessedById,
      asm.assessedByName,
      asm.assessedDate,
      asm.livingScore,
      asm.housingCondition,
      asm.housingNotes,
      asm.debtBurdenSummary,
      asm.primaryHardship,
      asm.officerRecommendation,
      asm.recommendedAmount,
      asm.recommendedFundId,
      asm.recommendedSpecificFundId,
      asm.generalNotes,
    ]
  });

  await db.execute({
    sql: `UPDATE assistance_applications 
          SET status = 'pending_approval', 
              assessment_status = 'completed',
              assessment_id = ?,
              assessment_date = ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?`,
    args: [asm.id, asm.assessedDate, appId]
  });

  const check = await db.execute({
    sql: 'SELECT id, application_no, status, assessment_status, approval_status, assessment_id FROM assistance_applications WHERE id = ?',
    args: [appId]
  });
  console.log('Synced SQLite application:', check.rows[0]);
}

syncAssessment().catch(console.error);
