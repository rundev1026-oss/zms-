const BASE_URL = 'http://localhost:3000';

async function testApis() {
  console.log('Testing APIs on', BASE_URL);

  // 1. Beneficiaries
  try {
    const resBen = await fetch(`${BASE_URL}/api/beneficiaries`);
    const jsonBen = await resBen.json();
    const count = Array.isArray(jsonBen) ? jsonBen.length : (jsonBen?.data?.length ?? jsonBen?.beneficiaries?.length ?? 0);
    console.log('GET /api/beneficiaries:', {
      status: resBen.status,
      count
    });
  } catch (e) {
    console.error('Beneficiaries API error:', e.message);
  }

  // 2. Assistance Requests
  try {
    const resApp = await fetch(`${BASE_URL}/api/assistance-requests`);
    const jsonApp = await resApp.json();
    const count = Array.isArray(jsonApp) ? jsonApp.length : (jsonApp?.data?.length ?? jsonApp?.applications?.length ?? 0);
    console.log('GET /api/assistance-requests:', {
      status: resApp.status,
      count
    });
  } catch (e) {
    console.error('Assistance Requests API error:', e.message);
  }

  // 3. Assistance Financial Link (Disbursements & Aid)
  try {
    const resAid = await fetch(`${BASE_URL}/api/finance/assistance-link?actorId=u-admin&actorName=Admin&actorRole=super_admin`);
    const jsonAid = await resAid.json();
    console.log('GET /api/finance/assistance-link:', {
      status: resAid.status,
      success: jsonAid.success,
      count: jsonAid?.data?.length ?? 0
    });
  } catch (e) {
    console.error('Assistance Link API error:', e.message);
  }

  // 4. Financial Transactions
  try {
    const resTx = await fetch(`${BASE_URL}/api/financial-transactions`);
    const jsonTx = await resTx.json();
    const count = Array.isArray(jsonTx) ? jsonTx.length : (jsonTx?.data?.length ?? jsonTx?.transactions?.length ?? 0);
    console.log('GET /api/financial-transactions:', {
      status: resTx.status,
      count
    });
  } catch (e) {
    console.error('Financial Transactions API error:', e.message);
  }
}

testApis();
