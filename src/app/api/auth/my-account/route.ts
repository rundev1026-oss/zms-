import { NextResponse } from 'next/server';
import { AuthService } from '@/services/authService';
import { StorageService } from '@/services/storageService';
import { getDb, initDb } from '@/lib/db';

function extractToken(req: Request): string {
  const authHeader = req.headers.get('authorization') || '';
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.replace('Bearer ', '').trim();
  }
  const cookieHeader = req.headers.get('cookie') || '';
  const match = cookieHeader.match(/zms_session=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : '';
}

export async function GET(req: Request) {
  try {
    const token = extractToken(req);
    if (!token) {
      return NextResponse.json({ success: false, error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
    }

    const user = await AuthService.validateSession(token);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Session หมดอายุหรือไม่ถูกต้อง' }, { status: 401 });
    }

    await initDb();
    const db = getDb();

    // 1. Fetch user's branch and department info
    let branchName = 'สำนักงานใหญ่';
    let departmentName = 'ประชาชนและผู้บริจาคทั่วไป';

    if (user.branchId) {
      const bRes = await db.execute({
        sql: `SELECT name FROM branches WHERE id = ?`,
        args: [user.branchId],
      });
      if (bRes.rows.length > 0) branchName = String(bRes.rows[0].name);
    }

    if (user.departmentId) {
      const dRes = await db.execute({
        sql: `SELECT name FROM departments WHERE id = ?`,
        args: [user.departmentId],
      });
      if (dRes.rows.length > 0) departmentName = String(dRes.rows[0].name);
    }

    // 2. Fetch strictly this user's personal transactions
    // Query matches payer_or_payee with user name, email, or user ID
    const firstName = user.firstName || user.name.split(' ')[0];
    const txnRes = await db.execute({
      sql: `
        SELECT 
          id, transaction_no, date, type, fund_id, fund_name, category, 
          amount, payment_method, payer_or_payee, reference_no, receipt_url, 
          status, created_at
        FROM financial_transactions
        WHERE 
          (payer_or_payee = ? OR payer_or_payee LIKE ? OR payer_or_payee LIKE ? OR payer_or_payee = ?)
        ORDER BY date DESC, created_at DESC
      `,
      args: [user.name, `%${firstName}%`, `%${user.email}%`, user.email],
    });

    const transactions = txnRes.rows.map((r) => ({
      id: String(r.id),
      transactionNo: String(r.transaction_no),
      date: String(r.date),
      type: String(r.type),
      fundId: String(r.fund_id),
      fundName: String(r.fund_name),
      category: String(r.category),
      amount: Number(r.amount) || 0,
      paymentMethod: String(r.payment_method),
      payerOrPayee: String(r.payer_or_payee),
      referenceNo: String(r.reference_no),
      receiptUrl: r.receipt_url ? String(r.receipt_url) : undefined,
      status: String(r.status),
      createdAt: String(r.created_at),
    }));

    // 3. Fetch user's assistance applications (if user is also registered as an asnaf/beneficiary)
    const beneRes = await db.execute({
      sql: `
        SELECT b.id as beneficiary_id, b.full_name, b.asnaf_category,
               a.id as application_id, a.application_no, a.requested_amount, 
               a.approved_amount, a.status, a.applied_date as submitted_at, a.approved_date as approved_at
        FROM beneficiaries b
        LEFT JOIN assistance_applications a ON a.beneficiary_id = b.id
        WHERE b.email = ? OR b.phone = ? OR b.full_name = ?
        ORDER BY a.applied_date DESC
      `,
      args: [user.email, user.phone || '---', user.name],
    });

    const rawApplications = beneRes.rows
      .filter((r) => r.application_id)
      .map((r) => ({
        id: String(r.application_id),
        applicationNo: String(r.application_no),
        asnafCategory: String(r.asnaf_category),
        requestedAmount: Number(r.requested_amount) || 0,
        approvedAmount: r.approved_amount ? Number(r.approved_amount) : null,
        status: String(r.status),
        submittedAt: String(r.submitted_at || ''),
        approvedAt: r.approved_at ? String(r.approved_at) : null,
      }));

    // Fetch documents for each of these applications
    const appIds = rawApplications.map((a) => a.id);
    const documentsMap: Record<string, any[]> = {};

    if (appIds.length > 0) {
      const placeholders = appIds.map(() => '?').join(',');
      const docRes = await db.execute({
        sql: `SELECT id, name, file_url, file_size, mime_type, storage_path, storage_provider, category, status, upload_date, application_id, beneficiary_id, checksum, uploaded_by_name
              FROM application_documents
              WHERE application_id IN (${placeholders})
              ORDER BY upload_date DESC`,
        args: appIds,
      });

      for (const row of docRes.rows) {
        const appId = String(row.application_id);
        if (!documentsMap[appId]) documentsMap[appId] = [];
        const isPdf = String(row.mime_type || '').includes('pdf') || String(row.name).toLowerCase().endsWith('.pdf');
        const fileCheck = StorageService.checkPhysicalFile({
          storagePath: String(row.storage_path || ''),
          fileUrl: String(row.file_url || ''),
          storageProvider: String(row.storage_provider || 'local')
        });

        documentsMap[appId].push({
          id: String(row.id),
          name: String(row.name || row.file_name),
          fileUrl: String(row.file_url || `/api/storage/file/${row.id}`),
          uploadDate: String(row.uploaded_at || ''),
          category: String(row.category || 'other_doc') as any,
          fileSize: Number(row.file_size || fileCheck.fileSize || 0),
          mimeType: String(row.mime_type || StorageService.getMimeType(String(row.name))),
          storageProvider: (row.storage_provider as any) || 'local',
          storagePath: row.storage_path ? String(row.storage_path) : undefined,
          checksum: row.checksum ? String(row.checksum) : undefined,
          uploadedByName: row.uploaded_by_name ? String(row.uploaded_by_name) : 'ผู้ยื่นคำร้อง',
          fileExists: fileCheck.exists,
          status: String(row.status || 'pending') as any,
        });
      }
    }

    const applications = rawApplications.map((a) => ({
      ...a,
      documents: documentsMap[a.id] || [],
    }));

    // Calculate totals strictly from user's completed transactions
    const totalDonations = transactions
      .filter((t) => t.type === 'income' && t.status === 'completed')
      .reduce((sum, t) => sum + t.amount, 0);

    return NextResponse.json({
      success: true,
      data: {
        user: {
          ...user,
          branchName,
          departmentName,
        },
        summary: {
          totalDonations,
          transactionCount: transactions.length,
          applicationCount: applications.length,
        },
        transactions,
        applications,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'ไม่สามารถดึงข้อมูลบัญชีผู้ใช้ได้' },
      { status: 500 }
    );
  }
}
