import { NextRequest, NextResponse } from 'next/server';
import { getDb, initDb } from '@/lib/db';
import { maskNationalId } from '@/services/beneficiaryService';

export async function POST(request: NextRequest) {
  try {
    await initDb();
    const db = getDb();
    const body = await request.json();
    const nationalId = (body.nationalId || '').replace(/[^0-9]/g, '');
    const actor = body.actor || { role: 'member' };

    if (!nationalId || nationalId.length !== 13) {
      return NextResponse.json(
        {
          success: false,
          found: false,
          canApply: false,
          error: 'กรุณากรอกเลขประจำตัวประชาชน 13 หลักให้ถูกต้อง',
        },
        { status: 400 }
      );
    }

    // Upfront check for Member Role: cannot query or submit on behalf of other national IDs
    if (actor.role === 'member') {
      const actorCleanNationalId = actor.nationalId ? String(actor.nationalId).replace(/[^0-9]/g, '') : '';
      if (actorCleanNationalId && nationalId !== actorCleanNationalId) {
        return NextResponse.json(
          {
            success: false,
            found: false,
            canApply: false,
            error: 'ท่านไม่มีสิทธิ์ยื่นคำร้องแทนบุคคลอื่น หรือไม่มีความเชื่อมโยงกับทะเบียนนี้',
          },
          { status: 403 }
        );
      }
    }

    const benRes = await db.execute({
      sql: `SELECT b.id, b.full_name, b.national_id, b.member_id, b.asnaf_category, b.branch_id, b.branch_name, 
                   b.registration_no, b.registration_status, b.phone, b.email,
                   h.address, h.province, h.district, h.community
            FROM beneficiaries b
            LEFT JOIN households h ON b.household_id = h.id
            WHERE b.national_id = ?`,
      args: [nationalId],
    });

    if (benRes.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          found: false,
          canApply: false,
          error: 'เลขบัตรประชาชนนี้ยังไม่ได้ขึ้นทะเบียนผู้มีสิทธิ์รับซะกาต กรุณาดำเนินการขึ้นทะเบียนผู้มีสิทธิ์รับซะกาตก่อนยื่นคำร้องขอความช่วยเหลือ',
        },
        { status: 404 }
      );
    }

    const ben = benRes.rows[0];

    // Check Member Ownership if actor is member
    if (actor.role === 'member') {
      const actorCleanNationalId = actor.nationalId ? String(actor.nationalId).replace(/[^0-9]/g, '') : '';
      const isOwner =
        (ben.member_id && String(ben.member_id) === actor.id) ||
        (actorCleanNationalId && String(ben.national_id) === actorCleanNationalId) ||
        (actor.beneficiaryId && String(ben.id) === String(actor.beneficiaryId));

      if (!isOwner) {
        return NextResponse.json(
          {
            success: false,
            found: true,
            canApply: false,
            error: 'ท่านไม่มีสิทธิ์ยื่นคำร้องแทนบุคคลอื่น หรือไม่มีความเชื่อมโยงกับทะเบียนนี้',
          },
          { status: 403 }
        );
      }

      if (['suspended', 'disqualified'].includes(String(ben.registration_status))) {
        const statusLabel = ben.registration_status === 'suspended' ? 'ระงับทะเบียน' : 'ไม่มีคุณสมบัติตามเกณฑ์';
        return NextResponse.json(
          {
            success: false,
            found: true,
            canApply: false,
            error: `ทะเบียนนี้อยู่ในสถานะ "${statusLabel}" จึงไม่สามารถยื่นคำร้องขอความช่วยเหลือได้`,
          },
          { status: 400 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      found: true,
      canApply: true,
      beneficiary: {
        id: String(ben.id),
        registrationNo: String(ben.registration_no || ''),
        fullName: String(ben.full_name),
        nationalId: String(ben.national_id),
        nationalIdMasked: maskNationalId(String(ben.national_id)),
        phone: String(ben.phone || ''),
        email: ben.email ? String(ben.email) : '',
        asnafCategory: String(ben.asnaf_category || 'miskin'),
        branchId: String(ben.branch_id || 'br-hq'),
        branchName: String(ben.branch_name || 'สำนักงานใหญ่ กรุงเทพมหานคร'),
        registrationStatus: String(ben.registration_status || 'qualified'),
        address: ben.address ? String(ben.address) : '',
        province: ben.province ? String(ben.province) : '',
        district: ben.district ? String(ben.district) : '',
        community: ben.community ? String(ben.community) : '',
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
