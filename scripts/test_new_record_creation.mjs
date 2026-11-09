import { createClient } from '@libsql/client';

const client = createClient({ url: 'file:data/zms.db' });
const BASE_URL = 'http://localhost:3000';

async function testNewRecordCreation() {
  console.log('Testing creation of new beneficiary and request via API...');

  const actor = {
    id: 'u-1',
    name: 'ผู้ดูแลระบบ',
    role: 'super_admin'
  };

  const payload = {
    input: {
      titlePrefix: 'นาย',
      fullName: 'มูฮัมหมัด ซาและห์ (ผู้ลงทะเบียนใหม่หลังรีเซ็ต)',
      nationalId: '1900100999888',
      phone: '0819998877',
      maritalStatus: 'married',
      asnafCategory: 'fakir',
      primaryGroupCode: 'faqir_miskin',
      address: '99/1 หมู่ 3 ต.สะเตง',
      subdistrict: 'สะเตง',
      district: 'เมืองยะลา',
      province: 'ยะลา',
      postcode: '95000',
      community: 'ตลาดเก่า',
      monthlyIncome: 3500,
      monthlyExpense: 8000,
      debtAmount: 25000,
      householdMembers: []
    },
    actor
  };

  const res = await fetch(`${BASE_URL}/api/beneficiaries`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const resJson = await res.json();
  console.log('API POST /api/beneficiaries response:', resJson);

  if (resJson.success && resJson.data?.beneficiaryId) {
    const bId = resJson.data.beneficiaryId;
    const hId = resJson.data.householdId;

    const benCheck = await client.execute({
      sql: 'SELECT id, full_name, registration_no FROM beneficiaries WHERE id = ?',
      args: [bId]
    });
    console.log('Verified newly created Beneficiary in DB:', benCheck.rows[0]);

    // Clean up test creation so target modules stay at 0
    await client.execute('PRAGMA foreign_keys = OFF;');
    await client.execute({ sql: 'DELETE FROM beneficiaries WHERE id = ?', args: [bId] });
    await client.execute({ sql: 'DELETE FROM households WHERE id = ?', args: [hId] });
    await client.execute({ sql: 'DELETE FROM beneficiary_asnaf WHERE beneficiary_id = ?', args: [bId] });
    await client.execute('PRAGMA foreign_keys = ON;');
    console.log('Cleaned up verification test records successfully.');
  }
}

testNewRecordCreation().catch(console.error);
