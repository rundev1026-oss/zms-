import { getDb, initDb } from '@/lib/db';
import { Branch, BranchType, Department, User, UserRole } from '@/types';
import { validateAddress } from '@/lib/thaiAddress';
import { AuthService } from './authService';

export interface OrganizationActor {
  id: string;
  name: string;
  role: UserRole;
  branchId?: string;
  departmentId?: string;
}

export interface BranchInput {
  code: string;
  name: string;
  nameEn?: string;
  branchType?: BranchType;
  parentBranchId?: string | null;
  address?: string;
  subdistrict?: string;
  district?: string;
  province: string;
  postcode?: string;
  phone?: string;
  email?: string;
  managerUserId?: string | null;
  managerName?: string;
  isHeadquarters?: boolean;
  status?: 'active' | 'inactive';
}

export interface DepartmentInput {
  code: string;
  name: string;
  nameEn?: string;
  description?: string;
  branchId: string;
  headUserId?: string | null;
  headName?: string;
  allowedRoles?: UserRole[];
  status?: 'active' | 'inactive';
  transferHeadToDepartment?: boolean;
}

export interface ReferenceImpactSummary {
  staffCount: number;
  departmentCount: number;
  beneficiaryCount: number;
  applicationCount: number;
  followUpCount: number;
  ChildBranchCount?: number;
  totalReferences: number;
  canHardDelete: boolean;
}

export class OrganizationService {
  /**
   * Resolve and verify actor from session token or verified actor headers/body
   */
  static async resolveActor(req: Request, bodyActor?: any): Promise<OrganizationActor | null> {
    await initDb();
    const db = getDb();

    // 1. Check Authorization Bearer token or zms_session cookie
    const authHeader = req.headers.get('authorization') || '';
    let token = '';
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.replace('Bearer ', '').trim();
    }
    if (!token || token === 'cookie-session') {
      const cookieHeader = req.headers.get('cookie') || '';
      const match = cookieHeader.match(/zms_session=([^;]+)/);
      if (match) token = decodeURIComponent(match[1]);
    }

    if (token && token !== 'cookie-session' && token.length >= 16) {
      const sessionUser = await AuthService.validateSession(token);
      if (sessionUser) {
        return {
          id: sessionUser.id,
          name: sessionUser.name,
          role: sessionUser.role,
          branchId: sessionUser.branchId,
          departmentId: sessionUser.departmentId,
        };
      }
    }

    // 2. Check x-actor-id header or bodyActor (verified against users table in DB)
    const candidateId = req.headers.get('x-actor-id') || bodyActor?.id;
    const candidateRole = req.headers.get('x-actor-role') || bodyActor?.role;

    if (candidateId && candidateId !== 'guest') {
      const userRes = await db.execute({
        sql: `SELECT id, name, role, status, branch_id, department_id FROM users WHERE id = ?`,
        args: [String(candidateId)],
      });
      if (userRes.rows.length > 0) {
        const row = userRes.rows[0];
        if (String(row.status) !== 'active') {
          return null;
        }
        // If candidateRole was supplied by RBAC switcher, verify it matches DB user role
        const dbRole = String(row.role) as UserRole;
        if (candidateRole && candidateRole !== dbRole) {
          return null;
        }
        return {
          id: String(row.id),
          name: String(row.name),
          role: dbRole,
          branchId: row.branch_id ? String(row.branch_id) : undefined,
          departmentId: row.department_id ? String(row.department_id) : undefined,
        };
      }
    }

    return null;
  }

  /**
   * Get complete Organization Structure (Branches, Departments, Summary Metrics, Unassigned/Invalid Users)
   */
  static async getOrganizationStructure(filters?: {
    search?: string;
    branchId?: string;
    departmentId?: string;
    status?: string;
    staffFilter?: string;
    activeOnly?: boolean;
    page?: number;
    pageSize?: number;
  }): Promise<{
    branches: Branch[];
    departments: Department[];
    totalBranches: number;
    totalDepartments: number;
    summary: {
      totalBranches: number;
      activeBranches: number;
      inactiveBranches: number;
      totalDepartments: number;
      activeDepartments: number;
      totalStaff: number;
      unassignedStaffCount: number;
      inactiveAffiliationStaffCount: number;
    };
  }> {
    await initDb();
    const db = getDb();

    // 1. Query all branches with real-time relational counts (Avoiding N+1 and cartesian product duplication)
    const branchQuery = `
      SELECT 
        b.id, b.code, b.name, b.name_en, b.branch_type, b.parent_branch_id,
        pb.name as parent_branch_name,
        b.address, b.subdistrict, b.district, b.province, b.postcode,
        b.phone, b.email, b.manager_user_id, b.manager_name,
        mu.name as manager_db_name, mu.role_title_th as manager_role_title,
        b.is_headquarters, COALESCE(b.status, 'active') as status, b.deactivated_reason,
        b.created_by_id, b.created_by_name, b.updated_by_id, b.updated_by_name,
        b.created_at, b.updated_at,
        (SELECT COUNT(*) FROM users u WHERE u.branch_id = b.id AND u.status != 'disabled') as staff_count,
        (SELECT COUNT(*) FROM departments d WHERE d.branch_id = b.id AND COALESCE(d.status, 'active') = 'active') as department_count,
        (SELECT COUNT(*) FROM beneficiaries ben WHERE ben.branch_id = b.id) as beneficiary_count,
        (SELECT COUNT(*) FROM assistance_applications app WHERE app.branch_id = b.id AND app.id != 'REGISTRY-DOCS') as application_count,
        (SELECT COALESCE(SUM(app.disbursed_amount), 0) FROM assistance_applications app WHERE app.branch_id = b.id AND app.status IN ('disbursed', 'closed')) as disbursed_amount_total,
        (SELECT COUNT(*) FROM follow_up_plans fp WHERE fp.branch_id = b.id) as active_followup_count
      FROM branches b
      LEFT JOIN branches pb ON b.parent_branch_id = pb.id
      LEFT JOIN users mu ON b.manager_user_id = mu.id
      ORDER BY b.is_headquarters DESC, b.code ASC
    `;
    const branchRes = await db.execute(branchQuery);

    // 2. Query all departments with real-time relational counts
    const deptQuery = `
      SELECT 
        d.id, d.code, d.name, d.name_en, d.description,
        d.branch_id, b.name as branch_name, b.code as branch_code,
        d.head_user_id, d.head_name,
        hu.name as head_db_name, hu.role_title_th as head_role_title,
        d.allowed_roles, COALESCE(d.status, 'active') as status, d.deactivated_reason,
        d.created_by_id, d.created_by_name, d.updated_by_id, d.updated_by_name,
        d.created_at, d.updated_at,
        (SELECT COUNT(*) FROM users u WHERE u.department_id = d.id AND u.status != 'disabled') as member_count
      FROM departments d
      LEFT JOIN branches b ON d.branch_id = b.id
      LEFT JOIN users hu ON d.head_user_id = hu.id
      ORDER BY d.code ASC
    `;
    const deptRes = await db.execute(deptQuery);

    // If search query is provided, also find matching staff user branch_ids and department_ids
    let staffMatchBranchIds = new Set<string>();
    let staffMatchDeptIds = new Set<string>();
    const searchTerm = (filters?.search || '').trim().toLowerCase();

    if (searchTerm) {
      const userSearchRes = await db.execute({
        sql: `SELECT branch_id, department_id FROM users WHERE LOWER(name) LIKE ? OR LOWER(email) LIKE ? OR LOWER(id) LIKE ?`,
        args: [`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`],
      });
      for (const r of userSearchRes.rows) {
        if (r.branch_id) staffMatchBranchIds.add(String(r.branch_id));
        if (r.department_id) staffMatchDeptIds.add(String(r.department_id));
      }
    }

    const allBranches: Branch[] = branchRes.rows.map((b: any) => ({
      id: String(b.id),
      code: String(b.code),
      name: String(b.name),
      nameEn: b.name_en ? String(b.name_en) : undefined,
      branchType: (b.branch_type ? String(b.branch_type) : (b.is_headquarters ? 'headquarters' : 'regional_branch')) as BranchType,
      parentBranchId: b.parent_branch_id ? String(b.parent_branch_id) : null,
      parentBranchName: b.parent_branch_name ? String(b.parent_branch_name) : null,
      address: b.address ? String(b.address) : '',
      subdistrict: b.subdistrict ? String(b.subdistrict) : '',
      district: b.district ? String(b.district) : '',
      province: String(b.province || ''),
      postcode: b.postcode ? String(b.postcode) : '',
      phone: b.phone ? String(b.phone) : '',
      email: b.email ? String(b.email) : '',
      managerUserId: b.manager_user_id ? String(b.manager_user_id) : null,
      managerName: b.manager_db_name ? String(b.manager_db_name) : (b.manager_name ? String(b.manager_name) : 'ยังไม่ได้ระบุผู้จัดการสาขา'),
      managerRoleTitle: b.manager_role_title ? String(b.manager_role_title) : undefined,
      isHeadquarters: Boolean(b.is_headquarters),
      status: (b.status === 'inactive' ? 'inactive' : 'active') as 'active' | 'inactive',
      deactivatedReason: b.deactivated_reason ? String(b.deactivated_reason) : null,
      staffCount: Number(b.staff_count || 0),
      departmentCount: Number(b.department_count || 0),
      beneficiaryCount: Number(b.beneficiary_count || 0),
      applicationCount: Number(b.application_count || 0),
      disbursedAmountTotal: Number(b.disbursed_amount_total || 0),
      activeFollowUpCount: Number(b.active_followup_count || 0),
      createdById: b.created_by_id ? String(b.created_by_id) : undefined,
      createdByName: b.created_by_name ? String(b.created_by_name) : undefined,
      updatedById: b.updated_by_id ? String(b.updated_by_id) : undefined,
      updatedByName: b.updated_by_name ? String(b.updated_by_name) : undefined,
      createdAt: b.created_at ? String(b.created_at) : undefined,
      updatedAt: b.updated_at ? String(b.updated_at) : undefined,
    }));

    const allDepartments: Department[] = deptRes.rows.map((d: any) => {
      let parsedRoles: UserRole[] = ['officer'];
      if (d.allowed_roles) {
        try {
          const parsed = JSON.parse(String(d.allowed_roles));
          if (Array.isArray(parsed)) parsedRoles = parsed;
        } catch {}
      }
      return {
        id: String(d.id),
        code: String(d.code),
        name: String(d.name),
        nameEn: d.name_en ? String(d.name_en) : undefined,
        description: d.description ? String(d.description) : '',
        branchId: d.branch_id ? String(d.branch_id) : 'br-hq',
        branchName: d.branch_name ? String(d.branch_name) : 'สำนักงานใหญ่ กรุงเทพมหานคร',
        branchCode: d.branch_code ? String(d.branch_code) : 'BR-BKK',
        headUserId: d.head_user_id ? String(d.head_user_id) : null,
        headName: d.head_db_name ? String(d.head_db_name) : (d.head_name ? String(d.head_name) : 'ยังไม่ได้ระบุหัวหน้าแผนก'),
        headRoleTitle: d.head_role_title ? String(d.head_role_title) : undefined,
        allowedRoles: parsedRoles,
        status: (d.status === 'inactive' ? 'inactive' : 'active') as 'active' | 'inactive',
        deactivatedReason: d.deactivated_reason ? String(d.deactivated_reason) : null,
        memberCount: Number(d.member_count || 0),
        createdById: d.created_by_id ? String(d.created_by_id) : undefined,
        createdByName: d.created_by_name ? String(d.created_by_name) : undefined,
        updatedById: d.updated_by_id ? String(d.updated_by_id) : undefined,
        updatedByName: d.updated_by_name ? String(d.updated_by_name) : undefined,
        createdAt: d.created_at ? String(d.created_at) : undefined,
        updatedAt: d.updated_at ? String(d.updated_at) : undefined,
      };
    });

    // Calculate global summary metrics
    const staffCheckRes = await db.execute(`
      SELECT 
        COUNT(*) as total_users,
        SUM(CASE WHEN u.branch_id IS NULL OR u.branch_id = '' OR u.department_id IS NULL OR u.department_id = '' OR b.id IS NULL OR d.id IS NULL THEN 1 ELSE 0 END) as unassigned_count,
        SUM(CASE WHEN COALESCE(b.status, 'active') = 'inactive' OR COALESCE(d.status, 'active') = 'inactive' THEN 1 ELSE 0 END) as inactive_affiliation_count
      FROM users u
      LEFT JOIN branches b ON u.branch_id = b.id
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE u.status != 'disabled'
    `);
    const summaryRow: any = staffCheckRes.rows[0] || {};

    const summary = {
      totalBranches: allBranches.length,
      activeBranches: allBranches.filter((b) => b.status === 'active').length,
      inactiveBranches: allBranches.filter((b) => b.status === 'inactive').length,
      totalDepartments: allDepartments.length,
      activeDepartments: allDepartments.filter((d) => d.status === 'active').length,
      totalStaff: Number(summaryRow.total_users || 0),
      unassignedStaffCount: Number(summaryRow.unassigned_count || 0),
      inactiveAffiliationStaffCount: Number(summaryRow.inactive_affiliation_count || 0),
    };

    // Apply filters
    let filteredBranches = allBranches;
    let filteredDepartments = allDepartments;

    if (filters?.activeOnly) {
      filteredBranches = filteredBranches.filter((b) => b.status === 'active');
      filteredDepartments = filteredDepartments.filter((d) => d.status === 'active');
    }

    if (filters?.status && filters.status !== 'all') {
      filteredBranches = filteredBranches.filter((b) => b.status === filters.status);
      filteredDepartments = filteredDepartments.filter((d) => d.status === filters.status);
    }

    if (filters?.branchId && filters.branchId !== 'all') {
      filteredBranches = filteredBranches.filter((b) => b.id === filters.branchId);
      filteredDepartments = filteredDepartments.filter((d) => d.branchId === filters.branchId);
    }

    if (filters?.departmentId && filters.departmentId !== 'all') {
      filteredDepartments = filteredDepartments.filter((d) => d.id === filters.departmentId);
      const targetDept = allDepartments.find((d) => d.id === filters.departmentId);
      if (targetDept?.branchId) {
        filteredBranches = filteredBranches.filter((b) => b.id === targetDept.branchId);
      }
    }

    if (filters?.staffFilter && filters.staffFilter !== 'all') {
      if (filters.staffFilter === 'has_staff') {
        filteredBranches = filteredBranches.filter((b) => (b.staffCount || 0) > 0);
        filteredDepartments = filteredDepartments.filter((d) => (d.memberCount || 0) > 0);
      } else if (filters.staffFilter === 'no_staff') {
        filteredBranches = filteredBranches.filter((b) => (b.staffCount || 0) === 0);
        filteredDepartments = filteredDepartments.filter((d) => (d.memberCount || 0) === 0);
      } else if (filters.staffFilter === 'min_3') {
        filteredBranches = filteredBranches.filter((b) => (b.staffCount || 0) >= 3);
        filteredDepartments = filteredDepartments.filter((d) => (d.memberCount || 0) >= 3);
      }
    }

    if (searchTerm) {
      // Also find departments matching search to include their parent branch
      const matchingDeptBranchIds = new Set(
        allDepartments
          .filter(
            (d) =>
              d.name.toLowerCase().includes(searchTerm) ||
              d.code.toLowerCase().includes(searchTerm) ||
              (d.nameEn || '').toLowerCase().includes(searchTerm) ||
              (d.headName || '').toLowerCase().includes(searchTerm)
          )
          .map((d) => d.branchId)
      );

      filteredBranches = filteredBranches.filter(
        (b) =>
          b.name.toLowerCase().includes(searchTerm) ||
          b.code.toLowerCase().includes(searchTerm) ||
          (b.nameEn || '').toLowerCase().includes(searchTerm) ||
          (b.province || '').toLowerCase().includes(searchTerm) ||
          (b.district || '').toLowerCase().includes(searchTerm) ||
          (b.managerName || '').toLowerCase().includes(searchTerm) ||
          staffMatchBranchIds.has(b.id) ||
          matchingDeptBranchIds.has(b.id)
      );

      filteredDepartments = filteredDepartments.filter(
        (d) =>
          d.name.toLowerCase().includes(searchTerm) ||
          d.code.toLowerCase().includes(searchTerm) ||
          (d.nameEn || '').toLowerCase().includes(searchTerm) ||
          (d.description || '').toLowerCase().includes(searchTerm) ||
          (d.headName || '').toLowerCase().includes(searchTerm) ||
          (d.branchName || '').toLowerCase().includes(searchTerm) ||
          (d.branchCode || '').toLowerCase().includes(searchTerm) ||
          staffMatchDeptIds.has(d.id)
      );
    }

    return {
      branches: filteredBranches,
      departments: filteredDepartments,
      totalBranches: filteredBranches.length,
      totalDepartments: filteredDepartments.length,
      summary,
    };
  }

  /**
   * Calculate reference impact before deactivating or deleting a Branch
   */
  static async getBranchImpactSummary(branchId: string): Promise<ReferenceImpactSummary> {
    await initDb();
    const db = getDb();

    const res = await db.execute({
      sql: `
        SELECT
          (SELECT COUNT(*) FROM users WHERE branch_id = ?) as staff_count,
          (SELECT COUNT(*) FROM departments WHERE branch_id = ?) as dept_count,
          (SELECT COUNT(*) FROM beneficiaries WHERE branch_id = ?) as ben_count,
          (SELECT COUNT(*) FROM assistance_applications WHERE branch_id = ? AND id != 'REGISTRY-DOCS') as app_count,
          (SELECT COUNT(*) FROM follow_up_plans WHERE branch_id = ?) as fup_count,
          (SELECT COUNT(*) FROM branches WHERE parent_branch_id = ?) as child_branch_count
      `,
      args: [branchId, branchId, branchId, branchId, branchId, branchId],
    });

    const row: any = res.rows[0] || {};
    const staffCount = Number(row.staff_count || 0);
    const departmentCount = Number(row.dept_count || 0);
    const beneficiaryCount = Number(row.ben_count || 0);
    const applicationCount = Number(row.app_count || 0);
    const followUpCount = Number(row.fup_count || 0);
    const ChildBranchCount = Number(row.child_branch_count || 0);

    const totalReferences =
      staffCount + departmentCount + beneficiaryCount + applicationCount + followUpCount + ChildBranchCount;

    return {
      staffCount,
      departmentCount,
      beneficiaryCount,
      applicationCount,
      followUpCount,
      ChildBranchCount,
      totalReferences,
      canHardDelete: totalReferences === 0,
    };
  }

  /**
   * Calculate reference impact before deactivating or deleting a Department
   */
  static async getDepartmentImpactSummary(departmentId: string): Promise<ReferenceImpactSummary> {
    await initDb();
    const db = getDb();

    const res = await db.execute({
      sql: `SELECT COUNT(*) as staff_count FROM users WHERE department_id = ?`,
      args: [departmentId],
    });
    const staffCount = Number(res.rows[0]?.staff_count || 0);

    return {
      staffCount,
      departmentCount: 0,
      beneficiaryCount: 0,
      applicationCount: 0,
      followUpCount: 0,
      totalReferences: staffCount,
      canHardDelete: staffCount === 0,
    };
  }

  /**
   * Create a new Branch
   */
  static async createBranch(
    input: BranchInput,
    actor: OrganizationActor,
    ipAddress: string = '127.0.0.1'
  ): Promise<{ branch: Branch; message: string }> {
    if (actor.role !== 'super_admin') {
      throw new Error('เฉพาะผู้ดูแลระบบสูงสุด (Super Admin) เท่านั้นที่มีสิทธิ์เพิ่มสาขาใหม่');
    }

    await initDb();
    const db = getDb();

    const cleanCode = (input.code || '').trim().toUpperCase();
    const cleanName = (input.name || '').trim();
    const cleanNameEn = (input.nameEn || '').trim();
    const cleanProvince = (input.province || '').trim();
    const cleanDistrict = (input.district || '').trim();
    const cleanSubdistrict = (input.subdistrict || '').trim();
    const cleanPostcode = (input.postcode || '').trim();
    const cleanAddress = (input.address || '').trim();
    const cleanPhone = (input.phone || '').trim();
    const cleanEmail = (input.email || '').trim().toLowerCase();

    if (!cleanCode) {
      throw new Error('กรุณาระบุรหัสสาขา (เช่น BR-YLA)');
    }
    if (!/^[A-Z0-9\-_]{3,20}$/.test(cleanCode)) {
      throw new Error('รหัสสาขาต้องเป็นตัวอักษรภาษาอังกฤษพิมพ์ใหญ่ ตัวเลข หรือขีด (-) ความยาว 3-20 ตัวอักษร');
    }
    if (!cleanName) {
      throw new Error('กรุณาระบุชื่อสาขาภาษาไทย');
    }
    if (!cleanProvince) {
      throw new Error('กรุณาเลือกจังหวัดที่ตั้งของสาขา');
    }
    if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      throw new Error('รูปแบบอีเมลติดต่อสาขาไม่ถูกต้อง');
    }

    // Validate Thai Address consistency if full address fields are given
    if (cleanPostcode && cleanProvince && cleanDistrict && cleanSubdistrict) {
      const addrCheck = validateAddress(cleanPostcode, cleanProvince, cleanDistrict, cleanSubdistrict);
      if (!addrCheck.isValid) {
        throw new Error(`ข้อมูลที่อยู่ไม่สอดคล้องกัน: ${addrCheck.message}`);
      }
    }

    // Check duplicate code
    const dupCode = await db.execute({
      sql: `SELECT id, name FROM branches WHERE UPPER(code) = ?`,
      args: [cleanCode],
    });
    if (dupCode.rows.length > 0) {
      throw new Error(`รหัสสาขา "${cleanCode}" มีอยู่ในระบบแล้ว (${dupCode.rows[0].name}) กรุณาใช้รหัสอื่น`);
    }

    // Check duplicate Thai name
    const dupName = await db.execute({
      sql: `SELECT id, code FROM branches WHERE TRIM(name) = ?`,
      args: [cleanName],
    });
    if (dupName.rows.length > 0) {
      throw new Error(`ชื่อสาขา "${cleanName}" ซ้ำกับสาขาที่มีอยู่แล้ว (${dupName.rows[0].code})`);
    }

    // Validate parent branch if specified
    let parentBranchId: string | null = input.parentBranchId ? String(input.parentBranchId).trim() : null;
    if (parentBranchId) {
      const pRes = await db.execute({
        sql: `SELECT id, name, COALESCE(status, 'active') as status FROM branches WHERE id = ?`,
        args: [parentBranchId],
      });
      if (pRes.rows.length === 0) {
        throw new Error('ไม่พบข้อมูลสาขาหลัก (สาขาแม่) ที่อ้างอิงในระบบ');
      }
      if (String(pRes.rows[0].status) !== 'active') {
        throw new Error('ไม่สามารถเลือกสาขาหลักที่ถูกปิดใช้งานแล้วได้');
      }
    }

    // Validate manager if specified
    let managerUserId: string | null = input.managerUserId ? String(input.managerUserId).trim() : null;
    let managerName = (input.managerName || '').trim();
    if (managerUserId) {
      const mRes = await db.execute({
        sql: `SELECT id, name, status FROM users WHERE id = ?`,
        args: [managerUserId],
      });
      if (mRes.rows.length === 0) {
        throw new Error('ไม่พบข้อมูลบุคลากรที่เลือกเป็นผู้จัดการสาขาในระบบ');
      }
      if (String(mRes.rows[0].status) !== 'active') {
        throw new Error('ไม่สามารถแต่งตั้งบุคลากรที่บัญชีถูกระงับหรือปิดใช้งานเป็นผู้จัดการสาขาได้');
      }
      managerName = String(mRes.rows[0].name);
    }

    const branchType: BranchType = input.branchType || (input.isHeadquarters ? 'headquarters' : 'regional_branch');
    const isHq = branchType === 'headquarters' || Boolean(input.isHeadquarters) ? 1 : 0;
    const status = input.status === 'inactive' ? 'inactive' : 'active';
    const branchId = `br-${Date.now()}`;
    const timestampNow = new Date().toLocaleString('th-TH', { hour12: false });

    await db.execute({
      sql: `INSERT INTO branches (
        id, code, name, name_en, branch_type, parent_branch_id,
        address, subdistrict, district, province, postcode,
        phone, email, manager_user_id, manager_name,
        is_headquarters, status, created_by_id, created_by_name, updated_by_id, updated_by_name,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      args: [
        branchId,
        cleanCode,
        cleanName,
        cleanNameEn || null,
        branchType,
        parentBranchId,
        cleanAddress || null,
        cleanSubdistrict || null,
        cleanDistrict || null,
        cleanProvince,
        cleanPostcode || null,
        cleanPhone || null,
        cleanEmail || null,
        managerUserId,
        managerName || null,
        isHq,
        status,
        actor.id,
        actor.name,
        actor.id,
        actor.name,
      ],
    });

    // Write Audit Log
    await db.execute({
      sql: `INSERT INTO audit_logs (id, timestamp, user_id, user_name, user_role, action, entity_type, entity_id, description, ip_address, new_values)
            VALUES (?, ?, ?, ?, ?, 'BRANCH_CREATED', 'organization', ?, ?, ?, ?)`,
      args: [
        `log-org-${Date.now()}`,
        timestampNow,
        actor.id,
        actor.name,
        actor.role,
        branchId,
        `เพิ่มสาขาใหม่: ${cleanName} (รหัส: ${cleanCode}, จังหวัด: ${cleanProvince}) โดย ${actor.name}`,
        ipAddress,
        JSON.stringify({ id: branchId, code: cleanCode, name: cleanName, province: cleanProvince, status }),
      ],
    });

    const structure = await this.getOrganizationStructure();
    const created = structure.branches.find((b) => b.id === branchId)!;

    return {
      branch: created,
      message: `เพิ่มสาขา "${cleanName}" (${cleanCode}) เรียบร้อยแล้ว`,
    };
  }

  /**
   * Update an existing Branch
   */
  static async updateBranch(
    branchId: string,
    input: Partial<BranchInput> & { deactivatedReason?: string },
    actor: OrganizationActor,
    ipAddress: string = '127.0.0.1'
  ): Promise<{ branch: Branch; message: string }> {
    if (actor.role !== 'super_admin') {
      throw new Error('เฉพาะผู้ดูแลระบบสูงสุด (Super Admin) เท่านั้นที่มีสิทธิ์แก้ไขข้อมูลสาขา');
    }

    await initDb();
    const db = getDb();

    const curRes = await db.execute({
      sql: `SELECT * FROM branches WHERE id = ?`,
      args: [branchId],
    });
    if (curRes.rows.length === 0) {
      throw new Error('ไม่พบข้อมูลสาขาที่ต้องการแก้ไขในระบบ');
    }
    const cur: any = curRes.rows[0];

    const cleanCode = input.code !== undefined ? input.code.trim().toUpperCase() : String(cur.code);
    const cleanName = input.name !== undefined ? input.name.trim() : String(cur.name);
    const cleanNameEn = input.nameEn !== undefined ? input.nameEn.trim() : (cur.name_en ? String(cur.name_en) : '');
    const cleanProvince = input.province !== undefined ? input.province.trim() : String(cur.province || '');
    const cleanDistrict = input.district !== undefined ? input.district.trim() : (cur.district ? String(cur.district) : '');
    const cleanSubdistrict = input.subdistrict !== undefined ? input.subdistrict.trim() : (cur.subdistrict ? String(cur.subdistrict) : '');
    const cleanPostcode = input.postcode !== undefined ? input.postcode.trim() : (cur.postcode ? String(cur.postcode) : '');
    const cleanAddress = input.address !== undefined ? input.address.trim() : (cur.address ? String(cur.address) : '');
    const cleanPhone = input.phone !== undefined ? input.phone.trim() : (cur.phone ? String(cur.phone) : '');
    const cleanEmail = input.email !== undefined ? input.email.trim().toLowerCase() : (cur.email ? String(cur.email) : '');

    if (!cleanCode || !/^[A-Z0-9\-_]{3,20}$/.test(cleanCode)) {
      throw new Error('รหัสสาขาต้องเป็นตัวอักษรภาษาอังกฤษพิมพ์ใหญ่ ตัวเลข หรือขีด (-) ความยาว 3-20 ตัวอักษร');
    }
    if (!cleanName) {
      throw new Error('กรุณาระบุชื่อสาขาภาษาไทย');
    }
    if (!cleanProvince) {
      throw new Error('กรุณาเลือกจังหวัดที่ตั้งของสาขา');
    }
    if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      throw new Error('รูปแบบอีเมลติดต่อสาขาไม่ถูกต้อง');
    }

    if (cleanPostcode && cleanProvince && cleanDistrict && cleanSubdistrict) {
      const addrCheck = validateAddress(cleanPostcode, cleanProvince, cleanDistrict, cleanSubdistrict);
      if (!addrCheck.isValid) {
        throw new Error(`ข้อมูลที่อยู่ไม่สอดคล้องกัน: ${addrCheck.message}`);
      }
    }

    // Check duplicate code excluding self
    const dupCode = await db.execute({
      sql: `SELECT id, name FROM branches WHERE UPPER(code) = ? AND id != ?`,
      args: [cleanCode, branchId],
    });
    if (dupCode.rows.length > 0) {
      throw new Error(`รหัสสาขา "${cleanCode}" ซ้ำกับสาขา "${dupCode.rows[0].name}" กรุณาใช้รหัสอื่น`);
    }

    // Check duplicate name excluding self
    const dupName = await db.execute({
      sql: `SELECT id, code FROM branches WHERE TRIM(name) = ? AND id != ?`,
      args: [cleanName, branchId],
    });
    if (dupName.rows.length > 0) {
      throw new Error(`ชื่อสาขา "${cleanName}" ซ้ำกับสาขา (${dupName.rows[0].code})`);
    }

    // Validate parent branch & prevent circular reference
    let parentBranchId: string | null =
      input.parentBranchId !== undefined
        ? (input.parentBranchId ? String(input.parentBranchId).trim() : null)
        : (cur.parent_branch_id ? String(cur.parent_branch_id) : null);

    if (parentBranchId) {
      if (parentBranchId === branchId) {
        throw new Error('ไม่สามารถกำหนดให้สาขาเป็นสาขาแม่ของตัวเองได้ (Circular Reference)');
      }
      // Walk ancestor chain to prevent cycle A -> B -> A
      let currentParentId: string | null = parentBranchId;
      const visited = new Set<string>([branchId]);
      while (currentParentId) {
        if (visited.has(currentParentId)) {
          throw new Error('ตรวจพบโครงสร้างสาขาวนซ้ำ (Circular Hierarchy) ไม่สามารถเลือกสาขาแม่นี้ได้');
        }
        visited.add(currentParentId);
        const pRes: any = await db.execute({
          sql: `SELECT id, parent_branch_id, COALESCE(status, 'active') as status FROM branches WHERE id = ?`,
          args: [currentParentId],
        });
        if (pRes.rows.length === 0) {
          throw new Error('ไม่พบข้อมูลสาขาหลักที่อ้างอิงในระบบ');
        }
        if (currentParentId === parentBranchId && String(pRes.rows[0].status) !== 'active') {
          throw new Error('ไม่สามารถเลือกสาขาหลักที่ถูกปิดใช้งานอยู่ได้');
        }
        currentParentId = pRes.rows[0].parent_branch_id ? String(pRes.rows[0].parent_branch_id) : null;
      }
    }

    // Validate manager
    let managerUserId: string | null =
      input.managerUserId !== undefined
        ? (input.managerUserId ? String(input.managerUserId).trim() : null)
        : (cur.manager_user_id ? String(cur.manager_user_id) : null);
    let managerName =
      input.managerName !== undefined
        ? input.managerName.trim()
        : (cur.manager_name ? String(cur.manager_name) : '');

    if (managerUserId) {
      const mRes = await db.execute({
        sql: `SELECT id, name, status FROM users WHERE id = ?`,
        args: [managerUserId],
      });
      if (mRes.rows.length === 0) {
        throw new Error('ไม่พบข้อมูลบุคลากรที่เลือกเป็นผู้จัดการสาขา');
      }
      if (String(mRes.rows[0].status) !== 'active') {
        throw new Error('ไม่สามารถแต่งตั้งบุคลากรที่ถูกระงับหรือปิดใช้งานเป็นผู้จัดการสาขาได้');
      }
      managerName = String(mRes.rows[0].name);
    }

    const branchType: BranchType =
      input.branchType || (cur.branch_type ? String(cur.branch_type) as BranchType : 'regional_branch');
    const isHq = branchType === 'headquarters' ? 1 : (input.isHeadquarters !== undefined ? (input.isHeadquarters ? 1 : 0) : Number(cur.is_headquarters || 0));
    const newStatus = input.status || String(cur.status || 'active');
    const deactivatedReason =
      newStatus === 'inactive'
        ? (input.deactivatedReason || cur.deactivated_reason || 'ปรับสถานะจากหน้าแก้ไขสาขา')
        : null;

    await db.execute({
      sql: `UPDATE branches SET
        code = ?, name = ?, name_en = ?, branch_type = ?, parent_branch_id = ?,
        address = ?, subdistrict = ?, district = ?, province = ?, postcode = ?,
        phone = ?, email = ?, manager_user_id = ?, manager_name = ?,
        is_headquarters = ?, status = ?, deactivated_reason = ?,
        updated_by_id = ?, updated_by_name = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      args: [
        cleanCode,
        cleanName,
        cleanNameEn || null,
        branchType,
        parentBranchId,
        cleanAddress || null,
        cleanSubdistrict || null,
        cleanDistrict || null,
        cleanProvince,
        cleanPostcode || null,
        cleanPhone || null,
        cleanEmail || null,
        managerUserId,
        managerName || null,
        isHq,
        newStatus,
        deactivatedReason,
        actor.id,
        actor.name,
        branchId,
      ],
    });

    // Sync active users' display branch name if branch name changed (Do NOT overwrite closed/disbursed historical transactions)
    if (cleanName !== String(cur.name)) {
      await db.execute({
        sql: `UPDATE users SET branch = ?, updated_at = CURRENT_TIMESTAMP WHERE branch_id = ?`,
        args: [cleanName, branchId],
      });
    }

    const timestampNow = new Date().toLocaleString('th-TH', { hour12: false });
    await db.execute({
      sql: `INSERT INTO audit_logs (id, timestamp, user_id, user_name, user_role, action, entity_type, entity_id, description, ip_address, old_values, new_values)
            VALUES (?, ?, ?, ?, ?, 'BRANCH_UPDATED', 'organization', ?, ?, ?, ?, ?)`,
      args: [
        `log-org-${Date.now()}`,
        timestampNow,
        actor.id,
        actor.name,
        actor.role,
        branchId,
        `แก้ไขข้อมูลสาขา: ${cleanName} (${cleanCode}) โดย ${actor.name}`,
        ipAddress,
        JSON.stringify({ code: cur.code, name: cur.name, province: cur.province, manager: cur.manager_name, status: cur.status }),
        JSON.stringify({ code: cleanCode, name: cleanName, province: cleanProvince, manager: managerName, status: newStatus }),
      ],
    });

    const structure = await this.getOrganizationStructure();
    const updated = structure.branches.find((b) => b.id === branchId)!;

    return {
      branch: updated,
      message: `บันทึกการแก้ไขสาขา "${cleanName}" เรียบร้อยแล้ว`,
    };
  }

  /**
   * Deactivate, Reactivate, or Delete a Branch safely
   */
  static async changeBranchStatusOrDelete(
    branchId: string,
    action: 'deactivate' | 'activate' | 'delete',
    reason: string,
    actor: OrganizationActor,
    ipAddress: string = '127.0.0.1'
  ): Promise<{ success: boolean; message: string; impact: ReferenceImpactSummary }> {
    if (actor.role !== 'super_admin') {
      throw new Error('เฉพาะผู้ดูแลระบบสูงสุด (Super Admin) เท่านั้นที่มีสิทธิ์ปิดใช้งานหรือลบสาขา');
    }

    await initDb();
    const db = getDb();

    const curRes = await db.execute({
      sql: `SELECT * FROM branches WHERE id = ?`,
      args: [branchId],
    });
    if (curRes.rows.length === 0) {
      throw new Error('ไม่พบข้อมูลสาขาที่ระบุ');
    }
    const cur: any = curRes.rows[0];
    const impact = await this.getBranchImpactSummary(branchId);
    const timestampNow = new Date().toLocaleString('th-TH', { hour12: false });

    if (action === 'delete') {
      if (Boolean(cur.is_headquarters) || branchId === 'br-hq') {
        throw new Error('ไม่สามารถลบสำนักงานใหญ่หลักของมูลนิธิได้');
      }
      if (!impact.canHardDelete) {
        throw new Error(
          `ไม่สามารถลบสาขา "${cur.name}" ได้ เนื่องจากมีข้อมูลอ้างอิงสำคัญในระบบรวม ${impact.totalReferences} รายการ (บุคลากร ${impact.staffCount} คน, แผนก ${impact.departmentCount} แผนก, ทะเบียนผู้มีสิทธิ์ ${impact.beneficiaryCount} ราย, คำร้อง ${impact.applicationCount} รายการ) กรุณาใช้การ "ปิดใช้งาน" แทนการลบ`
        );
      }

      await db.execute({ sql: `DELETE FROM branches WHERE id = ?`, args: [branchId] });
      await db.execute({
        sql: `INSERT INTO audit_logs (id, timestamp, user_id, user_name, user_role, action, entity_type, entity_id, description, ip_address)
              VALUES (?, ?, ?, ?, ?, 'BRANCH_DELETED', 'organization', ?, ?, ?)`,
        args: [
          `log-org-${Date.now()}`,
          timestampNow,
          actor.id,
          actor.name,
          actor.role,
          branchId,
          `ลบสาขาที่ยังไม่มีข้อมูลอ้างอิง: ${cur.name} (${cur.code}) เหตุผล: ${reason || 'ไม่ระบุ'}`,
          ipAddress,
        ],
      });

      return {
        success: true,
        message: `ลบสาขา "${cur.name}" ออกจากระบบเรียบร้อยแล้ว`,
        impact,
      };
    }

    if (action === 'deactivate') {
      if (branchId === 'br-hq') {
        throw new Error('ไม่สามารถปิดใช้งานสำนักงานใหญ่หลัก (BR-BKK) ได้ เนื่องจากเป็นสาขาแกนกลางของระบบ');
      }
      if (!reason || !reason.trim()) {
        throw new Error('กรุณาระบุเหตุผลในการปิดใช้งานสาขาเพื่อบันทึกใน Audit Log');
      }

      await db.execute({
        sql: `UPDATE branches SET status = 'inactive', deactivated_reason = ?, updated_by_id = ?, updated_by_name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        args: [reason.trim(), actor.id, actor.name, branchId],
      });

      await db.execute({
        sql: `INSERT INTO audit_logs (id, timestamp, user_id, user_name, user_role, action, entity_type, entity_id, description, ip_address, old_values, new_values)
              VALUES (?, ?, ?, ?, ?, 'BRANCH_DEACTIVATED', 'organization', ?, ?, ?, ?, ?)`,
        args: [
          `log-org-${Date.now()}`,
          timestampNow,
          actor.id,
          actor.name,
          actor.role,
          branchId,
          `ปิดใช้งานสาขา: ${cur.name} (${cur.code}) เหตุผล: ${reason.trim()} (มีข้อมูลอ้างอิงเดิมคงไว้: บุคลากร ${impact.staffCount} คน, ทะเบียน ${impact.beneficiaryCount} ราย, คำร้อง ${impact.applicationCount} รายการ)`,
          ipAddress,
          JSON.stringify({ status: cur.status }),
          JSON.stringify({ status: 'inactive', reason: reason.trim(), impact }),
        ],
      });

      return {
        success: true,
        message: `ปิดใช้งานสาขา "${cur.name}" เรียบร้อยแล้ว ข้อมูลประวัติและธุรกรรมเดิมทั้งหมดยังคงเก็บรักษาไว้อย่างปลอดภัย`,
        impact,
      };
    }

    // Activate
    await db.execute({
      sql: `UPDATE branches SET status = 'active', deactivated_reason = NULL, updated_by_id = ?, updated_by_name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      args: [actor.id, actor.name, branchId],
    });

    await db.execute({
      sql: `INSERT INTO audit_logs (id, timestamp, user_id, user_name, user_role, action, entity_type, entity_id, description, ip_address)
            VALUES (?, ?, ?, ?, ?, 'BRANCH_ACTIVATED', 'organization', ?, ?, ?)`,
      args: [
        `log-org-${Date.now()}`,
        timestampNow,
        actor.id,
        actor.name,
        actor.role,
        branchId,
        `เปิดใช้งานสาขาอีกครั้ง: ${cur.name} (${cur.code}) โดย ${actor.name}`,
        ipAddress,
      ],
    });

    return {
      success: true,
      message: `เปิดใช้งานสาขา "${cur.name}" อีกครั้งเรียบร้อยแล้ว`,
      impact,
    };
  }

  /**
   * Create a new Department
   */
  static async createDepartment(
    input: DepartmentInput,
    actor: OrganizationActor,
    ipAddress: string = '127.0.0.1'
  ): Promise<{ department: Department; message: string }> {
    if (actor.role !== 'super_admin') {
      throw new Error('เฉพาะผู้ดูแลระบบสูงสุด (Super Admin) เท่านั้นที่มีสิทธิ์เพิ่มแผนกใหม่');
    }

    await initDb();
    const db = getDb();

    const cleanCode = (input.code || '').trim().toUpperCase();
    const cleanName = (input.name || '').trim();
    const cleanNameEn = (input.nameEn || '').trim();
    const cleanDesc = (input.description || '').trim();
    const cleanBranchId = (input.branchId || '').trim();

    if (!cleanCode || !/^[A-Z0-9\-_]{3,20}$/.test(cleanCode)) {
      throw new Error('รหัสแผนกต้องเป็นตัวอักษรภาษาอังกฤษพิมพ์ใหญ่ ตัวเลข หรือขีด (-) ความยาว 3-20 ตัวอักษร');
    }
    if (!cleanName) {
      throw new Error('กรุณาระบุชื่อแผนกภาษาไทย');
    }
    if (!cleanBranchId) {
      throw new Error('กรุณาเลือกสาขาที่แผนกนี้สังกัด');
    }

    // Verify branch exists and is active
    const bRes = await db.execute({
      sql: `SELECT id, name, COALESCE(status, 'active') as status FROM branches WHERE id = ?`,
      args: [cleanBranchId],
    });
    if (bRes.rows.length === 0) {
      throw new Error('ไม่พบข้อมูลสาขาที่เลือกในระบบ');
    }
    if (String(bRes.rows[0].status) !== 'active') {
      throw new Error(`ไม่สามารถสร้างแผนกภายใต้สาขา "${bRes.rows[0].name}" ที่ถูกปิดใช้งานอยู่ได้`);
    }

    // Check duplicate department code
    const dupCode = await db.execute({
      sql: `SELECT id, name FROM departments WHERE UPPER(code) = ?`,
      args: [cleanCode],
    });
    if (dupCode.rows.length > 0) {
      throw new Error(`รหัสแผนก "${cleanCode}" มีอยู่ในระบบแล้ว (${dupCode.rows[0].name}) กรุณาใช้รหัสอื่น`);
    }

    const deptId = `dept-${Date.now()}`;

    // Validate department head
    let headUserId: string | null = input.headUserId ? String(input.headUserId).trim() : null;
    let headName = (input.headName || '').trim();
    if (headUserId) {
      const hRes = await db.execute({
        sql: `SELECT id, name, status, department_id FROM users WHERE id = ?`,
        args: [headUserId],
      });
      if (hRes.rows.length === 0) {
        throw new Error('ไม่พบข้อมูลบุคลากรที่เลือกเป็นหัวหน้าแผนก');
      }
      if (String(hRes.rows[0].status) !== 'active') {
        throw new Error('ไม่สามารถแต่งตั้งบุคลากรที่ถูกระงับการใช้งานเป็นหัวหน้าแผนกได้');
      }
      if (hRes.rows[0].department_id && String(hRes.rows[0].department_id) !== deptId && !input.transferHeadToDepartment) {
        throw new Error('ตามระเบียบองค์กร หัวหน้าแผนกต้องสังกัดอยู่ในแผนกนั้น กรุณาติ๊กเลือก "ย้ายบุคลากรท่านนี้มาสังกัดแผนกนี้พร้อมแต่งตั้งเป็นหัวหน้าแผนก" หรือเว้นว่างไว้ก่อน');
      }
      headName = String(hRes.rows[0].name);
    }

    const allowedRoles = Array.isArray(input.allowedRoles) && input.allowedRoles.length > 0 ? input.allowedRoles : ['officer'];
    const status = input.status === 'inactive' ? 'inactive' : 'active';
    const timestampNow = new Date().toLocaleString('th-TH', { hour12: false });

    await db.execute({
      sql: `INSERT INTO departments (
        id, code, name, name_en, description, branch_id,
        head_user_id, head_name, allowed_roles, status,
        created_by_id, created_by_name, updated_by_id, updated_by_name,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      args: [
        deptId,
        cleanCode,
        cleanName,
        cleanNameEn || null,
        cleanDesc || null,
        cleanBranchId,
        headUserId,
        headName || null,
        JSON.stringify(allowedRoles),
        status,
        actor.id,
        actor.name,
        actor.id,
        actor.name,
      ],
    });

    if (headUserId && input.transferHeadToDepartment) {
      await db.execute({
        sql: `UPDATE users SET department_id = ?, branch_id = ?, branch = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        args: [deptId, cleanBranchId, String(bRes.rows[0].name), headUserId],
      });
    }

    await db.execute({
      sql: `INSERT INTO audit_logs (id, timestamp, user_id, user_name, user_role, action, entity_type, entity_id, description, ip_address, new_values)
            VALUES (?, ?, ?, ?, ?, 'DEPARTMENT_CREATED', 'organization', ?, ?, ?, ?)`,
      args: [
        `log-org-${Date.now()}`,
        timestampNow,
        actor.id,
        actor.name,
        actor.role,
        deptId,
        `เพิ่มแผนกปฏิบัติงานใหม่: ${cleanName} (${cleanCode}) สังกัดสาขา ${bRes.rows[0].name} โดย ${actor.name}`,
        ipAddress,
        JSON.stringify({ id: deptId, code: cleanCode, name: cleanName, branchId: cleanBranchId, status }),
      ],
    });

    const structure = await this.getOrganizationStructure();
    const created = structure.departments.find((d) => d.id === deptId)!;

    return {
      department: created,
      message: `เพิ่มแผนก "${cleanName}" (${cleanCode}) เรียบร้อยแล้ว`,
    };
  }

  /**
   * Update an existing Department
   */
  static async updateDepartment(
    deptId: string,
    input: Partial<DepartmentInput> & { deactivatedReason?: string },
    actor: OrganizationActor,
    ipAddress: string = '127.0.0.1'
  ): Promise<{ department: Department; message: string }> {
    if (actor.role !== 'super_admin') {
      throw new Error('เฉพาะผู้ดูแลระบบสูงสุด (Super Admin) เท่านั้นที่มีสิทธิ์แก้ไขข้อมูลแผนก');
    }

    await initDb();
    const db = getDb();

    const curRes = await db.execute({
      sql: `SELECT * FROM departments WHERE id = ?`,
      args: [deptId],
    });
    if (curRes.rows.length === 0) {
      throw new Error('ไม่พบข้อมูลแผนกที่ต้องการแก้ไขในระบบ');
    }
    const cur: any = curRes.rows[0];

    const cleanCode = input.code !== undefined ? input.code.trim().toUpperCase() : String(cur.code);
    const cleanName = input.name !== undefined ? input.name.trim() : String(cur.name);
    const cleanNameEn = input.nameEn !== undefined ? input.nameEn.trim() : (cur.name_en ? String(cur.name_en) : '');
    const cleanDesc = input.description !== undefined ? input.description.trim() : (cur.description ? String(cur.description) : '');
    const cleanBranchId = input.branchId !== undefined ? input.branchId.trim() : String(cur.branch_id || 'br-hq');

    if (!cleanCode || !/^[A-Z0-9\-_]{3,20}$/.test(cleanCode)) {
      throw new Error('รหัสแผนกต้องเป็นตัวอักษรภาษาอังกฤษพิมพ์ใหญ่ ตัวเลข หรือขีด (-) ความยาว 3-20 ตัวอักษร');
    }
    if (!cleanName) {
      throw new Error('กรุณาระบุชื่อแผนกภาษาไทย');
    }

    // Verify branch exists and is active
    const bRes = await db.execute({
      sql: `SELECT id, name, COALESCE(status, 'active') as status FROM branches WHERE id = ?`,
      args: [cleanBranchId],
    });
    if (bRes.rows.length === 0) {
      throw new Error('ไม่พบข้อมูลสาขาที่เลือกในระบบ');
    }
    if (String(bRes.rows[0].status) !== 'active') {
      throw new Error(`ไม่สามารถย้ายแผนกไปสังกัดสาขา "${bRes.rows[0].name}" ที่ถูกปิดใช้งานอยู่ได้`);
    }

    // Check duplicate code excluding self
    const dupCode = await db.execute({
      sql: `SELECT id, name FROM departments WHERE UPPER(code) = ? AND id != ?`,
      args: [cleanCode, deptId],
    });
    if (dupCode.rows.length > 0) {
      throw new Error(`รหัสแผนก "${cleanCode}" ซ้ำกับแผนก "${dupCode.rows[0].name}"`);
    }

    // Validate department head & affiliation rule
    let headUserId: string | null =
      input.headUserId !== undefined
        ? (input.headUserId ? String(input.headUserId).trim() : null)
        : (cur.head_user_id ? String(cur.head_user_id) : null);
    let headName =
      input.headName !== undefined
        ? input.headName.trim()
        : (cur.head_name ? String(cur.head_name) : '');

    if (headUserId) {
      const hRes = await db.execute({
        sql: `SELECT id, name, status, department_id FROM users WHERE id = ?`,
        args: [headUserId],
      });
      if (hRes.rows.length === 0) {
        throw new Error('ไม่พบข้อมูลบุคลากรที่เลือกเป็นหัวหน้าแผนก');
      }
      if (String(hRes.rows[0].status) !== 'active') {
        throw new Error('ไม่สามารถแต่งตั้งบุคลากรที่ถูกระงับการใช้งานเป็นหัวหน้าแผนกได้');
      }
      if (String(hRes.rows[0].department_id || '') !== deptId) {
        if (input.transferHeadToDepartment) {
          await db.execute({
            sql: `UPDATE users SET department_id = ?, branch_id = ?, branch = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            args: [deptId, cleanBranchId, String(bRes.rows[0].name), headUserId],
          });
        } else {
          throw new Error(
            `บุคลากร "${hRes.rows[0].name}" ไม่ได้สังกัดอยู่ในแผนกนี้ตามกฎขององค์กร กรุณาติ๊กเลือก "ย้ายสังกัดบุคลากรเข้าสู่แผนกนี้พร้อมแต่งตั้ง" หรือเลือกบุคลากรในแผนก`
          );
        }
      }
      headName = String(hRes.rows[0].name);
    }

    let allowedRolesJson = cur.allowed_roles ? String(cur.allowed_roles) : '["officer"]';
    if (input.allowedRoles && Array.isArray(input.allowedRoles)) {
      allowedRolesJson = JSON.stringify(input.allowedRoles);
    }

    const newStatus = input.status || String(cur.status || 'active');
    const deactivatedReason =
      newStatus === 'inactive'
        ? (input.deactivatedReason || cur.deactivated_reason || 'ปรับสถานะจากหน้าแก้ไขแผนก')
        : null;

    await db.execute({
      sql: `UPDATE departments SET
        code = ?, name = ?, name_en = ?, description = ?, branch_id = ?,
        head_user_id = ?, head_name = ?, allowed_roles = ?, status = ?, deactivated_reason = ?,
        updated_by_id = ?, updated_by_name = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      args: [
        cleanCode,
        cleanName,
        cleanNameEn || null,
        cleanDesc || null,
        cleanBranchId,
        headUserId,
        headName || null,
        allowedRolesJson,
        newStatus,
        deactivatedReason,
        actor.id,
        actor.name,
        deptId,
      ],
    });

    const timestampNow = new Date().toLocaleString('th-TH', { hour12: false });
    await db.execute({
      sql: `INSERT INTO audit_logs (id, timestamp, user_id, user_name, user_role, action, entity_type, entity_id, description, ip_address, old_values, new_values)
            VALUES (?, ?, ?, ?, ?, 'DEPARTMENT_UPDATED', 'organization', ?, ?, ?, ?, ?)`,
      args: [
        `log-org-${Date.now()}`,
        timestampNow,
        actor.id,
        actor.name,
        actor.role,
        deptId,
        `แก้ไขข้อมูลแผนก: ${cleanName} (${cleanCode}) โดย ${actor.name}`,
        ipAddress,
        JSON.stringify({ code: cur.code, name: cur.name, branchId: cur.branch_id, head: cur.head_name, status: cur.status }),
        JSON.stringify({ code: cleanCode, name: cleanName, branchId: cleanBranchId, head: headName, status: newStatus }),
      ],
    });

    const structure = await this.getOrganizationStructure();
    const updated = structure.departments.find((d) => d.id === deptId)!;

    return {
      department: updated,
      message: `บันทึกการแก้ไขแผนก "${cleanName}" เรียบร้อยแล้ว`,
    };
  }

  /**
   * Deactivate, Reactivate, or Delete a Department safely
   */
  static async changeDepartmentStatusOrDelete(
    deptId: string,
    action: 'deactivate' | 'activate' | 'delete',
    reason: string,
    actor: OrganizationActor,
    ipAddress: string = '127.0.0.1'
  ): Promise<{ success: boolean; message: string; impact: ReferenceImpactSummary }> {
    if (actor.role !== 'super_admin') {
      throw new Error('เฉพาะผู้ดูแลระบบสูงสุด (Super Admin) เท่านั้นที่มีสิทธิ์ปิดใช้งานหรือลบแผนก');
    }

    await initDb();
    const db = getDb();

    const curRes = await db.execute({
      sql: `SELECT * FROM departments WHERE id = ?`,
      args: [deptId],
    });
    if (curRes.rows.length === 0) {
      throw new Error('ไม่พบข้อมูลแผนกที่ระบุ');
    }
    const cur: any = curRes.rows[0];
    const impact = await this.getDepartmentImpactSummary(deptId);
    const timestampNow = new Date().toLocaleString('th-TH', { hour12: false });

    if (action === 'delete') {
      if (!impact.canHardDelete) {
        throw new Error(
          `ไม่สามารถลบแผนก "${cur.name}" ได้ เนื่องจากมีบุคลากรสังกัดอยู่ ${impact.staffCount} คน กรุณาย้ายสังกัดบุคลากรหรือใช้การ "ปิดใช้งาน" แทนการลบ`
        );
      }

      await db.execute({ sql: `DELETE FROM departments WHERE id = ?`, args: [deptId] });
      await db.execute({
        sql: `INSERT INTO audit_logs (id, timestamp, user_id, user_name, user_role, action, entity_type, entity_id, description, ip_address)
              VALUES (?, ?, ?, ?, ?, 'DEPARTMENT_DELETED', 'organization', ?, ?, ?)`,
        args: [
          `log-org-${Date.now()}`,
          timestampNow,
          actor.id,
          actor.name,
          actor.role,
          deptId,
          `ลบแผนกที่ยังไม่มีบุคลากรสังกัด: ${cur.name} (${cur.code}) เหตุผล: ${reason || 'ไม่ระบุ'}`,
          ipAddress,
        ],
      });

      return {
        success: true,
        message: `ลบแผนก "${cur.name}" ออกจากระบบเรียบร้อยแล้ว`,
        impact,
      };
    }

    if (action === 'deactivate') {
      if (!reason || !reason.trim()) {
        throw new Error('กรุณาระบุเหตุผลในการปิดใช้งานแผนก');
      }

      await db.execute({
        sql: `UPDATE departments SET status = 'inactive', deactivated_reason = ?, updated_by_id = ?, updated_by_name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        args: [reason.trim(), actor.id, actor.name, deptId],
      });

      await db.execute({
        sql: `INSERT INTO audit_logs (id, timestamp, user_id, user_name, user_role, action, entity_type, entity_id, description, ip_address, old_values, new_values)
              VALUES (?, ?, ?, ?, ?, 'DEPARTMENT_DEACTIVATED', 'organization', ?, ?, ?, ?, ?)`,
        args: [
          `log-org-${Date.now()}`,
          timestampNow,
          actor.id,
          actor.name,
          actor.role,
          deptId,
          `ปิดใช้งานแผนก: ${cur.name} (${cur.code}) เหตุผล: ${reason.trim()} (บุคลากรในแผนก ${impact.staffCount} คน)`,
          ipAddress,
          JSON.stringify({ status: cur.status }),
          JSON.stringify({ status: 'inactive', reason: reason.trim(), impact }),
        ],
      });

      return {
        success: true,
        message: `ปิดใช้งานแผนก "${cur.name}" เรียบร้อยแล้ว`,
        impact,
      };
    }

    // Activate
    await db.execute({
      sql: `UPDATE departments SET status = 'active', deactivated_reason = NULL, updated_by_id = ?, updated_by_name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      args: [actor.id, actor.name, deptId],
    });

    await db.execute({
      sql: `INSERT INTO audit_logs (id, timestamp, user_id, user_name, user_role, action, entity_type, entity_id, description, ip_address)
            VALUES (?, ?, ?, ?, ?, 'DEPARTMENT_ACTIVATED', 'organization', ?, ?, ?)`,
      args: [
        `log-org-${Date.now()}`,
        timestampNow,
        actor.id,
        actor.name,
        actor.role,
        deptId,
        `เปิดใช้งานแผนกอีกครั้ง: ${cur.name} (${cur.code}) โดย ${actor.name}`,
        ipAddress,
      ],
    });

    return {
      success: true,
      message: `เปิดใช้งานแผนก "${cur.name}" อีกครั้งเรียบร้อยแล้ว`,
      impact,
    };
  }

  /**
   * Reassign User Affiliation (Branch & Department) without changing User Role or duplicating account
   */
  static async reassignUserAffiliation(
    targetUserId: string,
    branchId: string,
    departmentId: string,
    reason: string,
    actor: OrganizationActor,
    ipAddress: string = '127.0.0.1'
  ): Promise<{ user: User; message: string }> {
    if (actor.role !== 'super_admin') {
      throw new Error('เฉพาะผู้ดูแลระบบสูงสุด (Super Admin) เท่านั้นที่มีสิทธิ์เปลี่ยนสังกัดบุคลากร');
    }

    await initDb();
    const db = getDb();

    const uRes = await db.execute({
      sql: `SELECT id, name, email, role, role_title_th, phone, branch, branch_id, department_id, status FROM users WHERE id = ?`,
      args: [targetUserId],
    });
    if (uRes.rows.length === 0) {
      throw new Error('ไม่พบข้อมูลบุคลากรที่ต้องการย้ายสังกัด');
    }
    const targetUser: any = uRes.rows[0];

    const bRes = await db.execute({
      sql: `SELECT id, name, COALESCE(status, 'active') as status FROM branches WHERE id = ?`,
      args: [branchId],
    });
    if (bRes.rows.length === 0) {
      throw new Error('ไม่พบข้อมูลสาขาปลายทางในระบบ');
    }
    if (String(bRes.rows[0].status) !== 'active') {
      throw new Error(`ไม่สามารถย้ายบุคลากรไปยังสาขา "${bRes.rows[0].name}" ที่ถูกปิดใช้งานแล้วได้`);
    }

    const dRes = await db.execute({
      sql: `SELECT id, name, branch_id, COALESCE(status, 'active') as status FROM departments WHERE id = ?`,
      args: [departmentId],
    });
    if (dRes.rows.length === 0) {
      throw new Error('ไม่พบข้อมูลแผนกปลายทางในระบบ');
    }
    if (String(dRes.rows[0].status) !== 'active') {
      throw new Error(`ไม่สามารถย้ายบุคลากรไปยังแผนก "${dRes.rows[0].name}" ที่ถูกปิดใช้งานแล้วได้`);
    }

    const newBranchName = String(bRes.rows[0].name);
    const newDeptName = String(dRes.rows[0].name);

    await db.execute({
      sql: `UPDATE users SET branch_id = ?, branch = ?, department_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      args: [branchId, newBranchName, departmentId, targetUserId],
    });

    // If user was head of another department and moved away, clear old head_user_id
    if (targetUser.department_id && String(targetUser.department_id) !== departmentId) {
      await db.execute({
        sql: `UPDATE departments SET head_user_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND head_user_id = ?`,
        args: [String(targetUser.department_id), targetUserId],
      });
    }

    const timestampNow = new Date().toLocaleString('th-TH', { hour12: false });
    await db.execute({
      sql: `INSERT INTO audit_logs (id, timestamp, user_id, user_name, user_role, action, entity_type, entity_id, description, ip_address, old_values, new_values)
            VALUES (?, ?, ?, ?, ?, 'USER_AFFILIATION_CHANGED', 'organization', ?, ?, ?, ?, ?)`,
      args: [
        `log-org-${Date.now()}`,
        timestampNow,
        actor.id,
        actor.name,
        actor.role,
        targetUserId,
        `ย้ายสังกัดบุคลากร "${targetUser.name}" ไปยังสาขา "${newBranchName}" แผนก "${newDeptName}" (Role คงเดิม: ${targetUser.role}) เหตุผล: ${reason || 'ปรับโครงสร้างอัตรากำลัง'}`,
        ipAddress,
        JSON.stringify({ branchId: targetUser.branch_id, departmentId: targetUser.department_id }),
        JSON.stringify({ branchId, departmentId, reason }),
      ],
    });

    return {
      user: {
        id: String(targetUser.id),
        name: String(targetUser.name),
        email: String(targetUser.email),
        role: String(targetUser.role) as UserRole,
        roleTitleTh: String(targetUser.role_title_th),
        phone: String(targetUser.phone),
        branch: newBranchName,
        branchId,
        branchName: newBranchName,
        departmentId,
        departmentName: newDeptName,
        status: String(targetUser.status) as any,
      },
      message: `ย้ายสังกัดของ "${targetUser.name}" ไปยัง ${newBranchName} (${newDeptName}) เรียบร้อยแล้ว`,
    };
  }

  /**
   * Get Personnel List with Affiliation Validation Status
   */
  static async getOrganizationPersonnel(filters?: {
    branchId?: string;
    departmentId?: string;
    search?: string;
    onlyInvalidAffiliation?: boolean;
  }): Promise<User[]> {
    await initDb();
    const db = getDb();

    let query = `
      SELECT 
        u.id, u.name, u.first_name, u.last_name, u.email, u.phone, u.role, u.role_title_th,
        u.branch, u.branch_id, u.department_id, u.status, u.last_login,
        b.name as branch_name, COALESCE(b.status, 'active') as branch_status,
        d.name as department_name, COALESCE(d.status, 'active') as dept_status
      FROM users u
      LEFT JOIN branches b ON u.branch_id = b.id
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE 1=1
    `;
    const args: any[] = [];

    if (filters?.branchId && filters.branchId !== 'all') {
      query += ` AND u.branch_id = ?`;
      args.push(filters.branchId);
    }
    if (filters?.departmentId && filters.departmentId !== 'all') {
      query += ` AND u.department_id = ?`;
      args.push(filters.departmentId);
    }
    if (filters?.search && filters.search.trim()) {
      const term = `%${filters.search.trim().toLowerCase()}%`;
      query += ` AND (LOWER(u.name) LIKE ? OR LOWER(u.email) LIKE ? OR LOWER(u.id) LIKE ? OR u.phone LIKE ?)`;
      args.push(term, term, term, term);
    }
    if (filters?.onlyInvalidAffiliation) {
      query += ` AND (u.branch_id IS NULL OR u.branch_id = '' OR b.id IS NULL OR COALESCE(b.status, 'active') = 'inactive' OR u.department_id IS NULL OR u.department_id = '' OR d.id IS NULL OR COALESCE(d.status, 'active') = 'inactive')`;
    }

    query += ` ORDER BY CASE WHEN u.role = 'super_admin' THEN 1 WHEN u.role = 'executive' THEN 2 WHEN u.role = 'approver' THEN 3 WHEN u.role = 'finance' THEN 4 WHEN u.role = 'officer' THEN 5 ELSE 6 END, u.name ASC`;

    const res = await db.execute({ sql: query, args });
    return res.rows.map((r: any) => ({
      id: String(r.id),
      name: String(r.name),
      firstName: r.first_name ? String(r.first_name) : undefined,
      lastName: r.last_name ? String(r.last_name) : undefined,
      email: String(r.email),
      phone: String(r.phone),
      role: String(r.role) as UserRole,
      roleTitleTh: String(r.role_title_th),
      branch: r.branch_name ? String(r.branch_name) : String(r.branch || 'ไม่ระบุสาขา'),
      branchId: r.branch_id ? String(r.branch_id) : undefined,
      branchName: r.branch_name ? String(r.branch_name) : undefined,
      departmentId: r.department_id ? String(r.department_id) : undefined,
      departmentName: r.department_name ? String(r.department_name) : undefined,
      status: String(r.status) as any,
      lastLogin: r.last_login ? String(r.last_login) : undefined,
    }));
  }
}
