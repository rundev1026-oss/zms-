import { NextRequest, NextResponse } from 'next/server';
import {
  formatPersonName,
  getRegistryStatusLabelTh,
  normalizeRegistryStatusCode,
} from '@zms/shared';
import { proxyToNest } from '@/lib/apiProxy';
import { getDb, initDb } from '@/lib/db';
import { LEVEL_1_ASNAFS, resolveAsnafGroupCode } from '@/lib/constants/asnafRelationshipCatalog';
import { mapStatusToFrontend } from '@/lib/registrySurvey';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rawNationalId = (body.nationalId || '').replace(/[^0-9]/g, '');
    const nationalId = rawNationalId.length === 13 ? rawNationalId : undefined;
    const registrationNo = body.registrationNo ? String(body.registrationNo).trim() : undefined;
    const memberId = body.memberId ? String(body.memberId).trim() : undefined;
    const beneficiaryId = body.beneficiaryId ? String(body.beneficiaryId).trim() : undefined;

    if (!nationalId && !registrationNo && !memberId && !beneficiaryId) {
      return NextResponse.json(
        {
          success: false,
          found: false,
          canApply: false,
          error: 'กรุณากรอกเลขประจำตัวประชาชน 13 หลัก หรือรหัสสมาชิก (MB-...) ให้ถูกต้อง',
        },
        { status: 400 }
      );
    }

    let beneficiaryData: any = null;

    // 1. Try NestJS backend first
    try {
      const res = await proxyToNest('/assistance-requests/check-beneficiary', request, {
        method: 'POST',
        body: {
          nationalId,
          registrationNo,
          memberId,
          beneficiaryId,
        },
      });

      if (res.ok) {
        const json = await res.json();
        if (json.beneficiary) {
          beneficiaryData = json.beneficiary;
        }
      } else if (res.status === 400 || res.status === 404 || res.status === 422) {
        const errJson = await res.json().catch(() => ({}));
        const errMessage = Array.isArray(errJson?.message)
          ? errJson.message[0]
          : errJson?.message || errJson?.error;
        if (errMessage) {
          return NextResponse.json(
            {
              success: false,
              found: errJson?.code === 'BENEFICIARY_INELIGIBLE',
              canApply: false,
              code: errJson?.code,
              error: errMessage,
            },
            { status: res.status },
          );
        }
      }
    } catch {
      // NestJS service unavailable or unauthenticated
    }

    await initDb();
    const db = getDb();

    // 2. Fallback to SQLite data/zms.db if not resolved by NestJS
    if (!beneficiaryData) {
      let querySql = `
        SELECT b.*,
               h.address as household_address,
               h.community as household_community,
               h.subdistrict as household_subdistrict,
               h.district as household_district,
               h.province as household_province,
               h.monthly_income as household_income,
               h.monthly_expense as household_expense,
               h.debt_amount as household_debt
        FROM beneficiaries b
        LEFT JOIN households h ON b.household_id = h.id
        WHERE 1=1
      `;
      const args: any[] = [];

      if (beneficiaryId) {
        querySql += ` AND (b.id = ? OR b.member_id = ? OR b.registration_no = ?)`;
        args.push(beneficiaryId, beneficiaryId, beneficiaryId);
      } else if (nationalId) {
        querySql += ` AND b.national_id = ?`;
        args.push(nationalId);
      } else if (memberId) {
        querySql += ` AND b.member_id = ?`;
        args.push(memberId);
      } else if (registrationNo) {
        querySql += ` AND (b.registration_no = ? OR b.member_id = ?)`;
        args.push(registrationNo, registrationNo);
      }
      querySql += ` LIMIT 1`;

      const dbRes = await db.execute({ sql: querySql, args });
      if (dbRes.rows.length === 0) {
        return NextResponse.json(
          {
            success: false,
            found: false,
            canApply: false,
            error: 'ไม่พบข้อมูลผู้มีสิทธิ์รับซะกาตตามที่ระบุในฐานข้อมูลทะเบียน',
          },
          { status: 404 }
        );
      }

      const row = dbRes.rows[0];
      const memberCode = String(row.member_id || row.registration_no || `MB-${row.id}`);
      const canonicalStatus = normalizeRegistryStatusCode(String(row.registration_status || 'under_review'));
      const regStatus = mapStatusToFrontend(canonicalStatus || 'under_review');

      if (canonicalStatus !== 'QUALIFIED') {
        const label = getRegistryStatusLabelTh(canonicalStatus || 'UNDER_REVIEW');
        return NextResponse.json(
          {
            success: false,
            found: true,
            canApply: false,
            code: 'BENEFICIARY_INELIGIBLE',
            error: `ไม่สามารถยื่นคำร้องขอความช่วยเหลือได้ เนื่องจากสถานะสมาชิกปัจจุบันคือ "${label}" (ต้องมีคุณสมบัติตามเกณฑ์เท่านั้น)`,
          },
          { status: 400 },
        );
      }

      beneficiaryData = {
        id: String(row.id),
        memberId: memberCode,
        memberCode: memberCode,
        registrationNo: String(row.registration_no || memberCode),
        titlePrefix: String(row.title_prefix || ''),
        fullName: String(row.full_name || ''),
        nationalId: String(row.national_id || ''),
        phone: String(row.phone || ''),
        birthDate: row.birth_date ? String(row.birth_date) : null,
        age: row.age ? Number(row.age) : null,
        occupation: row.occupation ? String(row.occupation) : '',
        maritalStatus: row.marital_status ? String(row.marital_status) : '',
        branchId: String(row.branch_id || 'br-hq'),
        branchName: String(row.branch_name || 'สำนักงานใหญ่ กรุงเทพมหานคร'),
        registrationStatus: regStatus,
        registrationDate: row.registered_date ? String(row.registered_date) : String(row.created_at || '').slice(0, 10),
        address: String(row.household_address || row.residence_address || ''),
        community: String(row.household_community || ''),
        subdistrict: String(row.household_subdistrict || row.subdistrict || ''),
        district: String(row.household_district || ''),
        province: String(row.household_province || ''),
        postcode: String(row.household_postcode || row.postcode || ''),
        monthlyIncome: Number(row.household_income || 0),
        monthlyExpense: Number(row.household_expense || 0),
        debtAmount: Number(row.household_debt || 0),
        asnafCategory: String(row.asnaf_category || ''),
      };
    }

    const targetBeneficiaryId = String(beneficiaryData.id);

    // 2.1 Ensure the beneficiary exists in SQLite if it originated from external backend (NestJS/PostgreSQL)
    let localBeneficiaryId = targetBeneficiaryId;
    try {
      const localCheck = await db.execute({
        sql: `SELECT id FROM beneficiaries 
              WHERE id = ? 
                 OR (national_id = ? AND national_id != '') 
                 OR (member_id = ? AND member_id != '')
                 OR (registration_no = ? AND registration_no != '')
              LIMIT 1`,
        args: [
          targetBeneficiaryId,
          beneficiaryData.nationalId || '',
          beneficiaryData.memberId || '',
          beneficiaryData.registrationNo || '',
        ],
      });

      if (localCheck.rows.length > 0) {
        localBeneficiaryId = String(localCheck.rows[0].id);
      } else if (beneficiaryData.fullName) {
        // Safe mirror of beneficiary profile into SQLite to satisfy FOREIGN KEY constraints
        const mirrorHhId = `hh-${targetBeneficiaryId.slice(0, 20)}`;
        await db.execute({
          sql: `INSERT OR IGNORE INTO households (
                  id, household_no, address, province, district, subdistrict, community
                ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          args: [
            mirrorHhId,
            `HH-${targetBeneficiaryId.slice(-8)}`,
            beneficiaryData.address || 'ตามทะเบียนผู้มีสิทธิ์',
            beneficiaryData.province || 'กรุงเทพมหานคร',
            beneficiaryData.district || 'มีนบุรี',
            beneficiaryData.subdistrict || null,
            beneficiaryData.community || 'ทั่วไป',
          ],
        });

        const cleanNatId = (beneficiaryData.nationalId || '').replace(/[^0-9]/g, '');
        const asnafCategoryCode = resolveAsnafGroupCode(String(beneficiaryData.asnafCategory || 'faqir_miskin'));
        await db.execute({
          sql: `INSERT OR IGNORE INTO beneficiaries (
                  id, household_id, full_name, national_id, phone, email, asnaf_category, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
          args: [
            targetBeneficiaryId,
            mirrorHhId,
            beneficiaryData.fullName,
            cleanNatId || `NAT-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            beneficiaryData.phone || '0000000000',
            beneficiaryData.email || null,
            asnafCategoryCode,
          ],
        });
        localBeneficiaryId = targetBeneficiaryId;
      }
    } catch (mirrorErr) {
      console.warn('beneficiary SQLite mirror notice:', mirrorErr);
    }

    // 3. Query beneficiary_asnaf table to get all confirmed Asnafs for this beneficiary
    const asnafRows = await db.execute({
      sql: `SELECT id, asnaf_code, is_primary, qualification_date, qualification_notes, is_active
            FROM beneficiary_asnaf
            WHERE (beneficiary_id = ? OR beneficiary_id = ?) AND is_active = 1
            ORDER BY is_primary DESC, created_at ASC`,
      args: [localBeneficiaryId, targetBeneficiaryId],
    });

    let eligibleAsnafs: Array<{
      id: string;
      asnafCode: string;
      asnafNameTh: string;
      asnafNameAr?: string;
      isPrimary: boolean;
      qualificationDate?: string | null;
      qualificationNotes?: string | null;
    }> = [];

    if (asnafRows.rows.length > 0) {
      eligibleAsnafs = asnafRows.rows.map((r) => {
        const code = String(r.asnaf_code);
        const resolvedCode = resolveAsnafGroupCode(code);
        const meta = LEVEL_1_ASNAFS.find((a) => a.code === resolvedCode) || {
          nameTh: code,
          nameAr: '',
        };
        return {
          id: String(r.id),
          asnafCode: resolvedCode,
          asnafNameTh: meta.nameTh,
          asnafNameAr: meta.nameAr,
          isPrimary: Boolean(r.is_primary),
          qualificationDate: r.qualification_date ? String(r.qualification_date) : null,
          qualificationNotes: r.qualification_notes ? String(r.qualification_notes) : null,
        };
      });
    } else if (beneficiaryData.asnafCategory) {
      // Automatic migration fallback if beneficiary_asnaf record was missing
      const resolvedCode = resolveAsnafGroupCode(String(beneficiaryData.asnafCategory));
      const meta = LEVEL_1_ASNAFS.find((a) => a.code === resolvedCode) || {
        nameTh: String(beneficiaryData.asnafCategory),
        nameAr: '',
      };
      const fallbackId = `ba-${targetBeneficiaryId}-${resolvedCode}`;

      // Safely insert into beneficiary_asnaf without failing request on foreign key constraint
      try {
        await db.execute({
          sql: `INSERT OR IGNORE INTO beneficiary_asnaf (
                  id, beneficiary_id, asnaf_code, is_primary, is_active, created_at, updated_at
                ) VALUES (?, ?, ?, 1, 1, datetime('now'), datetime('now'))`,
          args: [fallbackId, localBeneficiaryId, resolvedCode],
        });
      } catch (asnafInsertErr) {
        console.warn('beneficiary_asnaf fallback insert notice (non-fatal):', asnafInsertErr);
      }

      eligibleAsnafs = [
        {
          id: fallbackId,
          asnafCode: resolvedCode,
          asnafNameTh: meta.nameTh,
          asnafNameAr: meta.nameAr,
          isPrimary: true,
          qualificationDate: beneficiaryData.registrationDate || null,
          qualificationNotes: 'กำหนดตามทะเบียนผู้มีสิทธิ์หลัก',
        },
      ];
    }

    // Phase 4 Rules:
    // If NO Asnaf is found: block application creation
    if (eligibleAsnafs.length === 0) {
      return NextResponse.json(
        {
          success: false,
          found: true,
          canApply: false,
          asnafStatus: 'NO_ASNAF',
          error: 'ทะเบียนนี้ยังไม่ได้รับการรับรองหมวดหมู่อัสนัฟ ไม่สามารถสร้างคำร้องขอความช่วยเหลือได้ กรุณาประเมินสิทธิ์ก่อน',
          beneficiary: {
            ...beneficiaryData,
            eligibleAsnafs: [],
            asnafStatus: 'NO_ASNAF',
            hasSingleAsnaf: false,
            hasMultipleAsnafs: false,
          },
        },
        { status: 422 }
      );
    }

    const primaryAsnaf = eligibleAsnafs.find((a) => a.isPrimary) || eligibleAsnafs[0];
    const hasSingleAsnaf = eligibleAsnafs.length === 1;
    const hasMultipleAsnafs = eligibleAsnafs.length > 1;

    return NextResponse.json({
      success: true,
      found: true,
      canApply: true,
      beneficiary: {
        ...beneficiaryData,
        registrationStatus: mapStatusToFrontend(beneficiaryData.registrationStatus || beneficiaryData.status || 'qualified'),
        status: 'qualified',
        asnafCategory: primaryAsnaf.asnafCode,
        asnafNameTh: primaryAsnaf.asnafNameTh,
        selectedAsnafId: primaryAsnaf.id,
        asnafStatus: hasSingleAsnaf ? 'SINGLE_ASNAF' : 'MULTI_ASNAF',
        hasSingleAsnaf,
        hasMultipleAsnafs,
        eligibleAsnafs,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        found: false,
        canApply: false,
        error: error.message || 'เกิดข้อผิดพลาดในการตรวจสอบทะเบียนผู้มีสิทธิ์',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') || searchParams.get('search') || '').trim();

    // 1. Try NestJS first: only QUALIFIED and active members are eligible candidates
    try {
      const nestQuery = new URLSearchParams();
      nestQuery.set('status', 'QUALIFIED');
      nestQuery.set('pageSize', '20');
      if (q) nestQuery.set('q', q);

      const nestRes = await proxyToNest(`/beneficiaries?${nestQuery.toString()}`, request, {
        method: 'GET',
      });
      if (nestRes.ok) {
        const data = await nestRes.json();
        const candidates = (data.items || [])
          .filter((item: any) => {
            const memberStatusUpper = String(item.memberStatus || 'ACTIVE').toUpperCase();
            const canonical = normalizeRegistryStatusCode(item.status || item.registrationStatus);
            return (
              canonical === 'QUALIFIED' &&
              memberStatusUpper !== 'SUSPENDED' &&
              memberStatusUpper !== 'ARCHIVED'
            );
          })
          .map((item: any) => {
            const rawAsnaf = String(
              item.asnaf?.code || item.asnafCategory || 'faqir_miskin',
            );
            const resolvedCode = resolveAsnafGroupCode(rawAsnaf);
            const meta = LEVEL_1_ASNAFS.find((a) => a.code === resolvedCode) || {
              nameTh: rawAsnaf,
            };
            const fullName =
              item.fullName ||
              formatPersonName({
                prefix: item.titlePrefix || item.title,
                firstName: item.firstName,
                lastName: item.lastName,
              }) ||
              '-';
            return {
              id: String(item.id),
              fullName: String(fullName).trim(),
              nationalId: String(item.identityNumberNormalized || item.nationalId || ''),
              memberId: String(item.memberId || item.registryNumber || item.id),
              phone: String(item.phone || ''),
              asnafCode: resolvedCode,
              asnafNameTh: meta.nameTh,
              asnafCount: Number(item.assessmentCount || 1),
              registrationStatus: 'qualified',
              status: 'qualified',
            };
          });
        return NextResponse.json({ success: true, candidates });
      }
    } catch {
      // Fallback to SQLite below when NestJS is unavailable or unauthenticated
    }

    await initDb();
    const db = getDb();

    let sql = `
      SELECT b.id, b.full_name, b.national_id, b.member_id, b.registration_no,
             b.phone, b.asnaf_category, b.registration_status,
             (SELECT COUNT(*) FROM beneficiary_asnaf ba WHERE ba.beneficiary_id = b.id AND ba.is_active = 1) as asnaf_count
      FROM beneficiaries b
      WHERE LOWER(TRIM(COALESCE(b.registration_status, ''))) IN ('qualified', 'eligible', 'approved')
    `;
    const args: any[] = [];
    if (q) {
      const cleanDigits = q.replace(/[^0-9]/g, '');
      if (cleanDigits.length >= 3) {
        sql += ` AND (b.national_id LIKE ? OR b.phone LIKE ? OR b.full_name LIKE ? OR b.member_id LIKE ? OR b.registration_no LIKE ?)`;
        const wildDigits = `%${cleanDigits}%`;
        const wildText = `%${q}%`;
        args.push(wildDigits, wildDigits, wildText, wildText, wildText);
      } else {
        sql += ` AND (b.full_name LIKE ? OR b.member_id LIKE ? OR b.registration_no LIKE ?)`;
        const wildText = `%${q}%`;
        args.push(wildText, wildText, wildText);
      }
    }
    sql += ` ORDER BY b.created_at DESC LIMIT 20`;
    const res = await db.execute({ sql, args });

    return NextResponse.json({
      success: true,
      candidates: res.rows.map((r) => {
        const rawAsnaf = String(r.asnaf_category || 'faqir_miskin');
        const resolvedCode = resolveAsnafGroupCode(rawAsnaf);
        const meta = LEVEL_1_ASNAFS.find((a) => a.code === resolvedCode) || { nameTh: rawAsnaf };
        return {
          id: String(r.id),
          fullName: String(r.full_name || '').trim(),
          nationalId: String(r.national_id || ''),
          memberId: String(r.member_id || r.registration_no || r.id),
          phone: String(r.phone || ''),
          asnafCode: resolvedCode,
          asnafNameTh: meta.nameTh,
          asnafCount: Number(r.asnaf_count || 1),
          registrationStatus: mapStatusToFrontend(String(r.registration_status || 'qualified')),
          status: mapStatusToFrontend(String(r.registration_status || 'qualified')),
        };
      }),
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, candidates: [], error: error.message }, { status: 500 });
  }
}

