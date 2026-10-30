import { createClient } from '@libsql/client';
import path from 'path';

async function main() {
  const client = createClient({ url: 'file:' + path.resolve('data/zms.db').replace(/\\/g, '/') });
  const apps = await client.execute("SELECT id, application_no, beneficiary_id, assistance_type, status, disbursed_amount FROM assistance_applications WHERE status = 'disbursed' LIMIT 5");
  console.log('Disbursed applications:', apps.rows);

  // Check if we have career application, if not let's set one disbursed application to 'ต่อยอดอาชีพ'
  const career = await client.execute("SELECT id FROM assistance_applications WHERE assistance_type LIKE '%อาชีพ%' OR assistance_type LIKE '%career%'");
  if (career.rows.length === 0 && apps.rows.length > 0) {
    const targetId = apps.rows[0].id;
    await client.execute({
      sql: "UPDATE assistance_applications SET assistance_type = 'ต่อยอดอาชีพ' WHERE id = ?",
      args: [targetId]
    });
    console.log('Updated app', targetId, 'to ต่อยอดอาชีพ');
    // Also delete any existing plan for this so backfill creates a fresh one with min_visits=6
    await client.execute({
      sql: "DELETE FROM follow_up_plans WHERE assistance_record_id = ?",
      args: [targetId]
    });
  }

  // Check housing application plans
  const housing = await client.execute("SELECT id, application_no, assistance_type FROM assistance_applications WHERE assistance_type LIKE '%housing%' OR assistance_type LIKE '%ซ่อม%'");
  console.log('Housing apps found:', housing.rows);
}

main().catch(console.error);
