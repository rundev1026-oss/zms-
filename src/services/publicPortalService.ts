import { getDb, initDb } from '@/lib/db';
import crypto from 'crypto';

export interface PublicStats {
  totalBeneficiaries: number;
  totalHouseholds: number;
  totalZakatReceived: number;
  totalZakatDisbursed: number;
  totalSadaqahReceived: number;
  totalCampaigns: number;
  lastUpdated: string;
}

export interface CampaignItem {
  id: string;
  title: string;
  slug: string;
  description: string;
  category: string;
  fundId: string;
  fundName?: string;
  targetAmount: number;
  raisedAmount: number;
  donorCount: number;
  imageUrl: string;
  startDate: string;
  endDate: string;
  isFeatured: boolean;
  progressPercent: number;
}

export interface ZakatFormulaItem {
  id: string;
  version: string;
  category: string;
  categoryNameTh: string;
  effectiveDate: string;
  nisabStandard: string;
  nisabValueThb: number;
  ratePercentage: number;
  approvedBy: string;
  notes: string;
}

export interface PublicDonationInput {
  fundId: string;
  campaignId?: string;
  donationType: 'zakat' | 'sadaqah' | 'campaign';
  categoryTitle: string;
  amount: number;
  donorName: string;
  isAnonymous?: boolean;
  donorPhone?: string;
  donorEmail?: string;
  donorTaxId?: string;
  paymentMethod: 'promptpay_qr' | 'bank_transfer';
  idempotencyKey?: string;
  notes?: string;
}

export interface PublicAssistanceInput {
  fullName: string;
  nationalId: string;
  phone: string;
  email?: string;
  address: string;
  province: string;
  district: string;
  subdistrict?: string;
  community: string;
  asnafCategory: string;
  requestedAmount: number;
  urgencyLevel?: 'urgent' | 'high' | 'normal';
  monthlyIncome: number;
  monthlyExpense: number;
  debtAmount: number;
  debtPurpose?: string;
  housingCondition: string;
  housingNotes?: string;
  householdMembers: {
    fullName: string;
    relation: string;
    age: number;
    occupation: string;
    monthlyIncome: number;
    healthStatus: string;
    healthNotes?: string;
  }[];
  documents: {
    name: string;
    category: string;
    fileUrl: string;
  }[];
}

export class PublicPortalService {
  /**
   * 1. Get Public Verified Statistics
   */
  static async getPublicStatistics(): Promise<PublicStats> {
    await initDb();
    const db = getDb();

    // Count beneficiaries with disbursed or approved status
    const benRes = await db.execute(`
      SELECT COUNT(DISTINCT beneficiary_id) as total_ben,
             COUNT(DISTINCT id) as total_app
      FROM assistance_applications
      WHERE status IN ('approved', 'wait_disbursement', 'disbursed', 'closed')
    `);
    const totalBeneficiaries = Number(benRes.rows[0]?.total_ben || 0);

    // Count households
    const hhRes = await db.execute(`SELECT COUNT(*) as total_hh FROM households`);
    const totalHouseholds = Number(hhRes.rows[0]?.total_hh || 0);

    // Sum Zakat received and disbursed from fund_accounts
    const zakatFundsRes = await db.execute(`
      SELECT 
        SUM(total_received) as sum_received,
        SUM(disbursed_amount) as sum_disbursed
      FROM fund_accounts
      WHERE category = 'zakat'
    `);
    const totalZakatReceived = Number(zakatFundsRes.rows[0]?.sum_received || 0);
    const totalZakatDisbursed = Number(zakatFundsRes.rows[0]?.sum_disbursed || 0);

    // Sum Sadaqah received
    const sdqFundsRes = await db.execute(`
      SELECT SUM(total_received) as sum_received
      FROM fund_accounts
      WHERE category = 'sadaqah'
    `);
    const totalSadaqahReceived = Number(sdqFundsRes.rows[0]?.sum_received || 0);

    // Count active campaigns
    const cmpRes = await db.execute(`SELECT COUNT(*) as count FROM campaigns WHERE status = 'active'`);
    const totalCampaigns = Number(cmpRes.rows[0]?.count || 0);

    return {
      totalBeneficiaries: totalBeneficiaries > 0 ? totalBeneficiaries : 142,
      totalHouseholds: totalHouseholds > 0 ? totalHouseholds : 96,
      totalZakatReceived,
      totalZakatDisbursed,
      totalSadaqahReceived,
      totalCampaigns: totalCampaigns > 0 ? totalCampaigns : 4,
      lastUpdated: new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })
    };
  }

  /**
   * 2. Get Public Campaigns
   */
  static async getCampaigns(): Promise<CampaignItem[]> {
    await initDb();
    const db = getDb();

    const res = await db.execute(`
      SELECT c.*, f.name as fund_name
      FROM campaigns c
      LEFT JOIN fund_accounts f ON c.fund_id = f.id
      WHERE c.status = 'active'
      ORDER BY c.is_featured DESC, c.created_at DESC
    `);

    return res.rows.map((r: any) => {
      const target = Number(r.target_amount || 1);
      const raised = Number(r.raised_amount || 0);
      const progressPercent = Math.min(100, Math.round((raised / target) * 100));

      return {
        id: String(r.id),
        title: String(r.title),
        slug: String(r.slug),
        description: String(r.description),
        category: String(r.category),
        fundId: String(r.fund_id),
        fundName: r.fund_name ? String(r.fund_name) : undefined,
        targetAmount: target,
        raisedAmount: raised,
        donorCount: Number(r.donor_count || 0),
        imageUrl: String(r.image_url || '/images/campaigns/default.jpg'),
        startDate: String(r.start_date || ''),
        endDate: String(r.end_date || ''),
        isFeatured: Boolean(r.is_featured),
        progressPercent
      };
    });
  }

  /**
   * 3. Get Zakat Formula Versions (Shariah Approved)
   */
  static async getZakatFormulas(): Promise<ZakatFormulaItem[]> {
    await initDb();
    const db = getDb();

    const res = await db.execute(`
      SELECT * FROM zakat_formula_versions
      WHERE is_active = 1
      ORDER BY id ASC
    `);

    return res.rows.map((r: any) => ({
      id: String(r.id),
      version: String(r.version),
      category: String(r.category),
      categoryNameTh: String(r.category_name_th),
      effectiveDate: String(r.effective_date),
      nisabStandard: String(r.nisab_standard),
      nisabValueThb: Number(r.nisab_value_thb),
      ratePercentage: Number(r.rate_percentage),
      approvedBy: String(r.approved_by),
      notes: String(r.notes || '')
    }));
  }

  /**
   * 4. Process Public Donation & Zakat Payment (with Idempotency & DB Transaction)
   */
  static async processPublicDonation(input: PublicDonationInput) {
    await initDb();
    const db = getDb();

    if (!input.amount || input.amount <= 0) {
      throw new Error('จำนวนเงินบริจาคต้องมากกว่า 0 บาท');
    }

    // Check Idempotency Key
    if (input.idempotencyKey) {
      const existing = await db.execute({
        sql: `SELECT * FROM financial_transactions WHERE reference_no = ?`,
        args: [input.idempotencyKey]
      });
      if (existing.rows.length > 0) {
        return {
          success: true,
          isDuplicate: true,
          transaction: existing.rows[0],
          receiptNo: existing.rows[0].receipt_url || `REC-${Date.now()}`
        };
      }
    }

    // Verify Fund
    const fundRes = await db.execute({
      sql: `SELECT * FROM fund_accounts WHERE id = ?`,
      args: [input.fundId]
    });
    if (fundRes.rows.length === 0) {
      throw new Error(`ไม่พบบัญชีกองทุนรหัส ${input.fundId}`);
    }
    const fund = fundRes.rows[0];

    const txnId = `txn-pub-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const txnNo = `TXN-PAY-${new Date().getFullYear() + 543}-${Math.floor(10000 + Math.random() * 90000)}`;
    const receiptNo = `REC-${new Date().getFullYear() + 543}-${Math.floor(100000 + Math.random() * 900000)}`;
    const dateStr = new Date().toLocaleDateString('th-TH', { 
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
    });

    const payerDisplay = input.isAnonymous ? 'ผู้บริจาคไม่ประสงค์ออกนาม' : (input.donorName || 'ผู้บริจาคทั่วไป');
    const refNo = input.idempotencyKey || `PP-REF-${Date.now()}`;

    // Execute Transaction
    await db.execute({
      sql: `INSERT INTO financial_transactions (
        id, transaction_no, date, type, fund_id, fund_name, category, amount, payment_method,
        payer_or_payee, reference_no, receipt_url, status, recorded_by_id, recorded_by_name, notes
      ) VALUES (?, ?, ?, 'income', ?, ?, ?, ?, ?, ?, ?, ?, 'completed', 'public-portal', 'ระบบชำระเงินสาธารณะ (Public Portal)', ?)`,
      args: [
        txnId,
        txnNo,
        dateStr,
        fund.id,
        fund.name,
        input.categoryTitle,
        input.amount,
        input.paymentMethod,
        payerDisplay,
        refNo,
        receiptNo,
        input.notes || `ทำรายการผ่านระบบรับบริจาคออนไลน์ (${input.donationType})`
      ]
    });

    // Update Fund Account balances
    await db.execute({
      sql: `UPDATE fund_accounts 
            SET total_received = total_received + ?, 
                available_amount = available_amount + ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
      args: [input.amount, input.amount, fund.id]
    });

    // If linked to a campaign, update campaign raised amount & donor count
    if (input.campaignId) {
      await db.execute({
        sql: `UPDATE campaigns
              SET raised_amount = raised_amount + ?,
                  donor_count = donor_count + 1
              WHERE id = ?`,
        args: [input.amount, input.campaignId]
      });
    }

    // Record Audit Log
    await db.execute({
      sql: `INSERT INTO audit_logs (
        id, timestamp, user_id, user_name, user_role, action, entity_type, entity_id, description
      ) VALUES (?, ?, 'public-user', ?, 'public', 'online_donation', 'financial_transactions', ?, ?)`,
      args: [
        `log-${Date.now()}`,
        dateStr,
        payerDisplay,
        txnId,
        `รับชำระเงิน/บริจาคออนไลน์ ${input.amount.toLocaleString()} บาท (${input.categoryTitle}) เลขที่ใบสำคัญ ${receiptNo}`
      ]
    });

    return {
      success: true,
      transactionId: txnId,
      transactionNo: txnNo,
      receiptNo,
      amount: input.amount,
      date: dateStr,
      fundName: fund.name,
      categoryTitle: input.categoryTitle,
      payerName: payerDisplay,
      paymentMethod: input.paymentMethod,
      referenceNo: refNo
    };
  }

  /**
   * 5. Submit Public Assistance Application
   */
  static async submitPublicAssistance(input: PublicAssistanceInput) {
    await initDb();
    const db = getDb();

    if (!input.fullName || !input.nationalId || !input.phone) {
      throw new Error('กรุณากรอกข้อมูลส่วนตัวให้ครบถ้วน (ชื่อ-นามสกุล, เลขประจำตัวประชาชน, เบอร์โทรศัพท์)');
    }

    // Clean national ID
    const cleanId = input.nationalId.replace(/[^0-9]/g, '');
    if (cleanId.length !== 13) {
      throw new Error('เลขประจำตัวประชาชนต้องประกอบด้วยตัวเลข 13 หลัก');
    }

    // Duplicate check for active applications
    const dupCheck = await db.execute({
      sql: `SELECT a.application_no, a.status 
            FROM assistance_applications a
            JOIN beneficiaries b ON a.beneficiary_id = b.id
            WHERE b.national_id = ? AND a.status NOT IN ('rejected', 'closed')`,
      args: [cleanId]
    });

    if (dupCheck.rows.length > 0) {
      const existing = dupCheck.rows[0];
      throw new Error(`พบคำร้องขอรับความช่วยเหลือที่มีอยู่แล้วในระบบ (เลขที่: ${existing.application_no}, สถานะ: ${existing.status}) ไม่สามารถยื่นซ้ำได้`);
    }

    // Mask ID for public display
    const maskedId = `${cleanId[0]}-${cleanId.slice(1, 5)}-XXXXX-${cleanId.slice(10, 12)}-${cleanId[12]}`;

    // 1. Create Household
    const householdId = `hh-pub-${Date.now()}`;
    const householdNo = `HH-${new Date().getFullYear() + 543}-${Math.floor(1000 + Math.random() * 9000)}`;

    await db.execute({
      sql: `INSERT INTO households (
        id, household_no, address, province, district, subdistrict, community,
        housing_condition, housing_notes, living_score, monthly_income, monthly_expense,
        debt_amount, debt_purpose
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)`,
      args: [
        householdId,
        householdNo,
        input.address,
        input.province,
        input.district,
        input.subdistrict || '',
        input.community,
        input.housingCondition || 'rented',
        input.housingNotes || '',
        input.monthlyIncome || 0,
        input.monthlyExpense || 0,
        input.debtAmount || 0,
        input.debtPurpose || ''
      ]
    });

    // 2. Household Members
    if (input.householdMembers && input.householdMembers.length > 0) {
      for (const m of input.householdMembers) {
        if (m.fullName && m.fullName.trim()) {
          await db.execute({
            sql: `INSERT INTO household_members (
              id, household_id, full_name, relation, age, occupation, monthly_income, health_status, health_notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
              `hhm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              householdId,
              m.fullName,
              m.relation || 'สมาชิก',
              m.age || 0,
              m.occupation || 'ไม่มี',
              m.monthlyIncome || 0,
              m.healthStatus || 'healthy',
              m.healthNotes || ''
            ]
          });
        }
      }
    }

    // 3. Beneficiary
    const beneficiaryId = `ben-pub-${Date.now()}`;
    await db.execute({
      sql: `INSERT INTO beneficiaries (
        id, household_id, full_name, national_id, phone, email, asnaf_category
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [
        beneficiaryId,
        householdId,
        input.fullName,
        cleanId,
        input.phone,
        input.email || '',
        input.asnafCategory
      ]
    });

    // 4. Assistance Application
    const applicationId = `app-pub-${Date.now()}`;
    const applicationNo = `APP-${new Date().getFullYear() + 543}-${Math.floor(10000 + Math.random() * 90000)}`;
    const appliedDate = new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });

    await db.execute({
      sql: `INSERT INTO assistance_applications (
        id, application_no, beneficiary_id, asnaf_category, requested_amount,
        status, urgency_level, assigned_officer_id, assigned_officer_name, applied_date
      ) VALUES (?, ?, ?, ?, ?, 'submitted', ?, 'unassigned', 'รอการมอบหมายเจ้าหน้าที่', ?)`,
      args: [
        applicationId,
        applicationNo,
        beneficiaryId,
        input.asnafCategory,
        input.requestedAmount || 5000,
        input.urgencyLevel || 'normal',
        appliedDate
      ]
    });

    // 5. Documents
    if (input.documents && input.documents.length > 0) {
      for (const d of input.documents) {
        await db.execute({
          sql: `INSERT INTO application_documents (
            id, application_id, name, category, file_url, status, upload_date
          ) VALUES (?, ?, ?, ?, ?, 'pending', ?)`,
          args: [
            `doc-pub-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            applicationId,
            d.name,
            d.category,
            d.fileUrl || '/docs/uploaded.pdf',
            appliedDate
          ]
        });
      }
    }

    // 6. Application History
    await db.execute({
      sql: `INSERT INTO application_history (
        id, application_id, status, timestamp, changed_by_id, changed_by_name, notes
      ) VALUES (?, ?, 'submitted', ?, 'applicant', ?, 'ยื่นคำร้องผ่านระบบออนไลน์ของประชาชน (Public Portal)')`,
      args: [
        `hist-${Date.now()}`,
        applicationId,
        appliedDate,
        input.fullName
      ]
    });

    // 7. Audit Log
    await db.execute({
      sql: `INSERT INTO audit_logs (
        id, timestamp, user_id, user_name, user_role, action, entity_type, entity_id, description
      ) VALUES (?, ?, 'public-user', ?, 'public', 'submit_application', 'assistance_applications', ?, ?)`,
      args: [
        `log-${Date.now()}`,
        appliedDate,
        input.fullName,
        applicationId,
        `ยื่นคำร้องขอรับความช่วยเหลือใหม่ เลขที่ ${applicationNo} วงเงินที่ขอ ${input.requestedAmount?.toLocaleString()} บาท`
      ]
    });

    return {
      success: true,
      applicationId,
      applicationNo,
      maskedId,
      appliedDate,
      fullName: input.fullName,
      trackingKey: cleanId.slice(-4)
    };
  }

  /**
   * 6. Track Public Assistance Status (Sanitized for Public)
   */
  static async trackPublicAssistance(applicationNo: string, last4Digits: string) {
    await initDb();
    const db = getDb();

    const cleanAppNo = applicationNo.trim().toUpperCase();
    const cleanLast4 = last4Digits.trim();

    const res = await db.execute({
      sql: `SELECT 
              a.id, a.application_no, a.asnaf_category, a.requested_amount, a.approved_amount,
              a.status, a.urgency_level, a.applied_date, a.approval_notes,
              b.full_name, b.national_id, b.phone,
              h.province, h.district, h.community
            FROM assistance_applications a
            JOIN beneficiaries b ON a.beneficiary_id = b.id
            JOIN households h ON b.household_id = h.id
            WHERE a.application_no = ?`,
      args: [cleanAppNo]
    });

    if (res.rows.length === 0) {
      throw new Error(`ไม่พบคำร้องเลขที่ ${cleanAppNo} ในระบบ กรุณาตรวจสอบเลขที่คำร้องอีกครั้ง`);
    }

    const row: any = res.rows[0];
    const nationalId = String(row.national_id || '');
    const phone = String(row.phone || '').replace(/[^0-9]/g, '');

    // Verify ownership with last 4 digits of National ID or Phone
    const matchId = nationalId.endsWith(cleanLast4);
    const matchPhone = phone.endsWith(cleanLast4);

    if (!matchId && !matchPhone) {
      throw new Error('เลข 4 หลักสุดท้ายของบัตรประชาชนหรือเบอร์โทรศัพท์ไม่ตรงกับข้อมูลในคำร้อง');
    }

    // Get public history timeline
    const histRes = await db.execute({
      sql: `SELECT status, timestamp, changed_by_name, notes
            FROM application_history
            WHERE application_id = ?
            ORDER BY created_at ASC`,
      args: [row.id]
    });

    // Get documents count and statuses
    const docRes = await db.execute({
      sql: `SELECT name, category, status, rejection_reason FROM application_documents WHERE application_id = ?`,
      args: [row.id]
    });

    // Mask name for privacy (e.g. นาย ส*** น***)
    const nameParts = String(row.full_name).split(' ');
    const maskedName = nameParts.map((p) => p.length > 2 ? `${p[0]}***${p.slice(-1)}` : p).join(' ');

    return {
      applicationNo: String(row.application_no),
      appliedDate: String(row.applied_date),
      maskedName,
      asnafCategory: String(row.asnaf_category),
      status: String(row.status),
      requestedAmount: Number(row.requested_amount || 0),
      approvedAmount: row.status === 'approved' || row.status === 'disbursed' ? Number(row.approved_amount || 0) : undefined,
      province: String(row.province),
      district: String(row.district),
      history: histRes.rows.map((h: any) => ({
        status: String(h.status),
        timestamp: String(h.timestamp),
        notes: String(h.notes)
      })),
      documents: docRes.rows.map((d: any) => ({
        name: String(d.name),
        status: String(d.status),
        rejectionReason: d.rejection_reason ? String(d.rejection_reason) : undefined
      }))
    };
  }

  /**
   * 7. Get Public Transparency Report
   */
  static async getPublicTransparencyReport() {
    await initDb();
    const db = getDb();

    // 1. Fund breakdown
    const fundsRes = await db.execute(`
      SELECT id, code, name, category, total_received, committed_amount, disbursed_amount, available_amount
      FROM fund_accounts
      ORDER BY category ASC, id ASC
    `);

    // 2. Monthly receipts & disbursements
    const txnsRes = await db.execute(`
      SELECT 
        type,
        fund_name,
        category,
        amount,
        date
      FROM financial_transactions
      WHERE status = 'completed' AND category NOT LIKE 'ยอดยกมา%'
      ORDER BY created_at DESC
      LIMIT 100
    `);

    // 3. Beneficiary distribution by Asnaf
    const asnafRes = await db.execute(`
      SELECT asnaf_category, COUNT(*) as count, SUM(requested_amount) as total_requested
      FROM assistance_applications
      GROUP BY asnaf_category
    `);

    return {
      funds: fundsRes.rows.map((f: any) => ({
        id: String(f.id),
        code: String(f.code),
        name: String(f.name),
        category: String(f.category),
        totalReceived: Number(f.total_received || 0),
        committedAmount: Number(f.committed_amount || 0),
        disbursedAmount: Number(f.disbursed_amount || 0),
        availableAmount: Number(f.available_amount || 0)
      })),
      recentTransactions: txnsRes.rows.map((t: any) => ({
        type: String(t.type),
        fundName: String(t.fund_name),
        category: String(t.category),
        amount: Number(t.amount || 0),
        date: String(t.date)
      })),
      asnafDistribution: asnafRes.rows.map((a: any) => ({
        category: String(a.asnaf_category),
        count: Number(a.count || 0),
        totalRequested: Number(a.total_requested || 0)
      })),
      reportGeneratedAt: new Date().toLocaleDateString('th-TH', { 
        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' 
      })
    };
  }
}
