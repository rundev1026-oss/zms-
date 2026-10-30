import { type PermissionCode } from '@zms/shared';
export declare const PERMISSIONS: {
    code: "beneficiaries.read" | "beneficiaries.read.sensitive" | "beneficiaries.write" | "beneficiaries.submit" | "beneficiaries.review" | "beneficiaries.assess" | "beneficiaries.decide" | "beneficiaries.aid.view" | "documents.read" | "documents.write" | "documents.review" | "documents.delete" | "reports.export" | "audit.read" | "dashboard.access" | "dashboard.view" | "dashboard.view.kpi.financial" | "dashboard.view.kpi.org" | "beneficiaries.view" | "beneficiaries.create" | "beneficiaries.edit" | "beneficiaries.delete" | "beneficiaries.verify" | "beneficiaries.export" | "requests.view" | "requests.create" | "requests.edit" | "requests.submit" | "requests.cancel" | "requests.assign" | "assessment.view" | "assessment.perform" | "assessment.edit" | "assessment.submit" | "assessment.verify_docs" | "approvals.view" | "approvals.approve" | "approvals.reject" | "approvals.return" | "approvals.delegate" | "assistance.view" | "assistance.create" | "assistance.edit_draft" | "assistance.confirm_handover" | "assistance.confirm_actual" | "assistance.upload_evidence" | "followup.view" | "followup.create" | "followup.edit" | "followup.upload_evidence" | "followup.close" | "finance.dashboard.view" | "finance.income.view" | "finance.income.create" | "finance.bank.view" | "finance.bank.manage" | "finance.txn.view" | "finance.txn.create" | "finance.txn.approve" | "finance.expense.record" | "finance.handover.record" | "finance.reconcile" | "finance.reports.export" | "reports.view" | "reports.generate" | "reports.export_excel" | "reports.export_pdf" | "reports.view_sensitive" | "users.view" | "users.create" | "users.edit" | "users.suspend" | "roles.manage" | "permissions.manage" | "users.reset_password" | "users.manage_2fa" | "branches.view" | "branches.create" | "branches.edit" | "departments.manage" | "branches.assign_staff" | "zakat_calc.view" | "zakat_calc.use" | "zakat_calc.manage_rules" | "zakat_calc.history" | "donations.view" | "donations.create" | "donations.confirm_payment" | "donations.issue_receipt" | "donations.refund" | "audit.view" | "audit.search" | "audit.export" | "settings.view" | "settings.manage" | "backup.create" | "backup.restore" | "settings.config";
    description: string;
}[];
export type { PermissionCode };
export declare const ROLES: readonly [{
    readonly code: "SUPER_ADMIN";
    readonly name: "ผู้ดูแลระบบ";
    readonly description: "บทบาทสมมติสำหรับพัฒนา ใช้สิทธิ์ทั้งหมดจนกว่ามูลนิธิจะยืนยัน";
}, {
    readonly code: "REGISTRAR";
    readonly name: "เจ้าหน้าที่ทะเบียน";
    readonly description: "บันทึกและส่งตรวจทะเบียน";
}, {
    readonly code: "REVIEWER";
    readonly name: "ผู้ตรวจสอบข้อมูล";
    readonly description: "ตรวจความครบของทะเบียนและเอกสาร";
}, {
    readonly code: "ASSESSOR";
    readonly name: "ผู้ประเมิน";
    readonly description: "บันทึกการประเมินอัสนัฟ ไม่ได้ตัดสินคุณสมบัติอัตโนมัติ";
}, {
    readonly code: "APPROVER";
    readonly name: "ผู้อนุมัติ";
    readonly description: "บันทึกผลคุณสมบัติ ระงับ และเก็บถาวรทะเบียน โดยไม่คำนวณจากเกณฑ์ศาสนา";
}, {
    readonly code: "FINANCE_VIEWER";
    readonly name: "ผู้ดูการเงิน";
    readonly description: "เห็นยอดช่วยเหลือสะสมและส่งออกรายงาน";
}, {
    readonly code: "AUDITOR";
    readonly name: "ผู้สอบทาน";
    readonly description: "ดูบันทึกการตรวจสอบและข้อมูลทะเบียนแบบปกปิด";
}];
export type RoleCode = (typeof ROLES)[number]['code'];
export declare const ROLE_PERMISSIONS: Record<RoleCode, readonly PermissionCode[]>;
export declare const ASNAF_CATEGORIES: readonly [{
    readonly code: "FAQIR";
    readonly nameTh: "ฟากีร";
    readonly sortOrder: 1;
}, {
    readonly code: "MISKIN";
    readonly nameTh: "มิสกิน";
    readonly sortOrder: 2;
}, {
    readonly code: "AMIL";
    readonly nameTh: "อามีลีน";
    readonly sortOrder: 3;
}, {
    readonly code: "MUALLAF";
    readonly nameTh: "มุอัลลัฟ";
    readonly sortOrder: 4;
}, {
    readonly code: "GHARIM";
    readonly nameTh: "อัลฆอริมีน";
    readonly sortOrder: 5;
}, {
    readonly code: "FISABILILLAH";
    readonly nameTh: "ฟีสะบีลิลลาฮ์";
    readonly sortOrder: 6;
}, {
    readonly code: "IBNUS_SABIL";
    readonly nameTh: "อิบนุสสะบีล";
    readonly sortOrder: 7;
}, {
    readonly code: "OTHER";
    readonly nameTh: "หมวดอื่นที่มูลนิธิอนุมัติให้ใช้งาน";
    readonly sortOrder: 8;
}];
export declare const SEED_USERS: readonly [{
    readonly email: "super-admin@zms.local";
    readonly displayName: "ผู้ดูแลระบบ (ข้อมูลสมมติ)";
    readonly roleCode: "SUPER_ADMIN";
}, {
    readonly email: "registrar@zms.local";
    readonly displayName: "เจ้าหน้าที่ทะเบียน (ข้อมูลสมมติ)";
    readonly roleCode: "REGISTRAR";
}, {
    readonly email: "reviewer@zms.local";
    readonly displayName: "ผู้ตรวจสอบข้อมูล (ข้อมูลสมมติ)";
    readonly roleCode: "REVIEWER";
}, {
    readonly email: "assessor@zms.local";
    readonly displayName: "ผู้ประเมิน (ข้อมูลสมมติ)";
    readonly roleCode: "ASSESSOR";
}, {
    readonly email: "approver@zms.local";
    readonly displayName: "ผู้อนุมัติ (ข้อมูลสมมติ)";
    readonly roleCode: "APPROVER";
}, {
    readonly email: "finance@zms.local";
    readonly displayName: "ผู้ดูการเงิน (ข้อมูลสมมติ)";
    readonly roleCode: "FINANCE_VIEWER";
}, {
    readonly email: "auditor@zms.local";
    readonly displayName: "ผู้สอบทาน (ข้อมูลสมมติ)";
    readonly roleCode: "AUDITOR";
}];
