// scripts/test_task5_ux_ui_accessibility.mjs
import http from 'http';

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function runTest() {
  console.log('=== TASK 5: UX/UI & Operational Dashboard Verification ===\n');

  try {
    const res = await fetchJson('http://localhost:3000/api/finance/dashboard');
    if (!res.success) {
      console.error('API call failed:', res.error);
      process.exit(1);
    }

    const data = res.data;
    console.log('✓ Successfully connected to /api/finance/dashboard');

    // 1. Verify operationalOverview exists
    if (!data.operationalOverview) {
      console.error('FAIL: operationalOverview is missing from response');
      process.exit(1);
    }
    console.log('✓ operationalOverview object exists in dashboard response');

    const hub = data.operationalOverview;
    const requiredKeys = [
      'cashOnHand',
      'pendingApprovals',
      'pendingHandovers',
      'pendingAssistanceConfirmations',
      'pendingPettyClearances',
      'recentDisbursements',
    ];

    for (const key of requiredKeys) {
      const item = hub[key];
      if (!item) {
        console.error(`FAIL: Missing ${key} in operationalOverview`);
        process.exit(1);
      }
      if (typeof item.amount !== 'number') {
        console.error(`FAIL: ${key}.amount is not a number:`, item.amount);
        process.exit(1);
      }
      if (typeof item.count !== 'number') {
        console.error(`FAIL: ${key}.count is not a number:`, item.count);
        process.exit(1);
      }
      if (!item.title || !item.targetTab) {
        console.error(`FAIL: ${key} missing title or targetTab:`, item);
        process.exit(1);
      }

      console.log(`✓ [${key}]:`);
      console.log(`   - หัวข้อ: "${item.title}"`);
      console.log(`   - ยอดเงิน: ฿${item.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท`);
      console.log(`   - จำนวน: ${item.count} รายการ/รอบ`);
      console.log(`   - เป้าหมายนำทาง (ดูรายการ): "${item.targetTab}"`);
      if (key === 'recentDisbursements') {
        console.log(`   - ตัวอย่างรายการล่าสุด: ${item.items ? item.items.length : 0} รายการ`);
      }
    }

    console.log('\n=== All 6 Operational Action Hub Metrics Verified Successfully! ===');
  } catch (err) {
    console.error('Test execution failed:', err);
    process.exit(1);
  }
}

runTest();
