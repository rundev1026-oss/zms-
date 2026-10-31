const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@localhost:5432/zms_db' });

async function check() {
  const client = await pool.connect();
  const res = await client.query("SELECT * FROM beneficiaries WHERE registration_no = 'ZMS-2026-000012'");
  console.log('Beneficiary:', res.rows[0]);
  if (res.rows.length > 0) {
    const id = res.rows[0].id;
    const hh = await client.query('SELECT * FROM households WHERE beneficiary_id = $1', [id]);
    console.log('Household:', hh.rows[0]);
    const inc = await client.query('SELECT * FROM income_profiles WHERE beneficiary_id = $1', [id]);
    console.log('IncomeProfile:', inc.rows[0]);
    const addr = await client.query('SELECT * FROM addresses WHERE beneficiary_id = $1', [id]);
    console.log('Addresses:', addr.rows);
  }
  await client.release();
  await pool.end();
}

check().catch(console.error);

