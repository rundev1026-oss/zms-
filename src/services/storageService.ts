import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { getDb, initDb } from '@/lib/db';
import { ActorContext } from './registryService';

// ============================================================================
// Types & Configuration
// ============================================================================

export type StorageProvider = 's3' | 'cloudinary' | 'local';

export interface StorageConfig {
  provider: StorageProvider;
  s3?: {
    bucket: string;
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    endpoint?: string;
    publicDomain?: string;
    forcePathStyle?: boolean;
  };
  cloudinary?: {
    cloudName: string;
    apiKey: string;
    apiSecret: string;
    uploadPreset?: string;
  };
  local: {
    uploadDir: string;
    publicPath: string;
  };
}

export interface PresignedUrlRequest {
  fileName: string;
  fileType: string;
  fileSize: number;
  category: string;
  entityType: 'beneficiary' | 'assistance_request';
  entityId?: string;
}

export interface PresignedUrlResponse {
  provider: StorageProvider;
  uploadUrl: string;
  downloadUrl: string;
  fileKey: string;
  fields?: Record<string, string>;
  headers?: Record<string, string>;
  maxSizeBytes: number;
  expiresInSeconds: number;
}

export interface RegisterDocumentInput {
  name: string;
  category: string;
  fileUrl: string;
  storageProvider: StorageProvider;
  storagePath: string;
  fileSize?: number;
  mimeType?: string;
  checksum?: string;
  entityType: 'beneficiary' | 'assistance_request';
  entityId: string;
}

// Allowed MIME types for ZMS (High-res PDF scans, images)
export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
];

export const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

// ============================================================================
// AWS Signature Version 4 Helpers (Zero-dependency S3 Presigner)
// ============================================================================

function hmac(key: string | Buffer, string: string): Buffer {
  return crypto.createHmac('sha256', key).update(string).digest();
}

function hexHmac(key: string | Buffer, string: string): string {
  return crypto.createHmac('sha256', key).update(string).digest('hex');
}

function sha256Hex(data: string | Buffer): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function getSigningKey(secretKey: string, dateStamp: string, region: string, service: string): Buffer {
  const kDate = hmac('AWS4' + secretKey, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  return hmac(kService, 'aws4_request');
}

function uriEncode(string: string, encodeSlash = true): string {
  let result = '';
  for (let i = 0; i < string.length; i++) {
    const ch = string[i];
    if (
      (ch >= 'A' && ch <= 'Z') ||
      (ch >= 'a' && ch <= 'z') ||
      (ch >= '0' && ch <= '9') ||
      ch === '_' ||
      ch === '-' ||
      ch === '~' ||
      ch === '.'
    ) {
      result += ch;
    } else if (ch === '/' && !encodeSlash) {
      result += ch;
    } else {
      const hex = ch.charCodeAt(0).toString(16).toUpperCase();
      result += '%' + (hex.length < 2 ? '0' : '') + hex;
    }
  }
  return result;
}

// ============================================================================
// Storage Service Implementation
// ============================================================================

export class StorageService {
  /**
   * Resolve current active storage configuration from environment variables
   */
  static getConfig(): StorageConfig {
    const s3Bucket = process.env.S3_BUCKET || process.env.AWS_S3_BUCKET;
    const s3Key = process.env.S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
    const s3Secret = process.env.S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;
    const s3Region = process.env.S3_REGION || process.env.AWS_REGION || 'ap-southeast-1';
    const s3Endpoint = process.env.S3_ENDPOINT; // e.g. https://<account_id>.r2.cloudflarestorage.com or minio

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const cloudApiKey = process.env.CLOUDINARY_API_KEY;
    const cloudApiSecret = process.env.CLOUDINARY_API_SECRET;

    let provider: StorageProvider = 'local';
    if (s3Bucket && s3Key && s3Secret) {
      provider = 's3';
    } else if (cloudName && cloudApiKey && cloudApiSecret) {
      provider = 'cloudinary';
    }

    const localUploadDir = path.join(process.cwd(), 'public', 'uploads', 'documents');

    return {
      provider,
      s3: s3Bucket && s3Key && s3Secret ? {
        bucket: s3Bucket,
        region: s3Region,
        accessKeyId: s3Key,
        secretAccessKey: s3Secret,
        endpoint: s3Endpoint,
        publicDomain: process.env.S3_PUBLIC_DOMAIN,
        forcePathStyle: Boolean(process.env.S3_FORCE_PATH_STYLE === 'true'),
      } : undefined,
      cloudinary: cloudName && cloudApiKey && cloudApiSecret ? {
        cloudName,
        apiKey: cloudApiKey,
        apiSecret: cloudApiSecret,
        uploadPreset: process.env.CLOUDINARY_UPLOAD_PRESET || 'zms_docs',
      } : undefined,
      local: {
        uploadDir: localUploadDir,
        publicPath: '/uploads/documents',
      },
    };
  }

  /**
   * Generate Presigned Upload URL for Direct Client Upload
   */
  static async generatePresignedUploadUrl(
    req: PresignedUrlRequest,
    actor?: ActorContext
  ): Promise<PresignedUrlResponse> {
    // 1. Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(req.fileType.toLowerCase())) {
      throw new Error(
        `ประเภทไฟล์ไม่ได้รับอนุญาต (${req.fileType}) รองรับเฉพาะ PDF (*.pdf) และรูปภาพ (*.jpg, *.png, *.webp) เท่านั้น`
      );
    }

    // 2. Validate File Size
    if (req.fileSize > MAX_FILE_SIZE) {
      throw new Error(`ขนาดไฟล์เกินกำหนด (สูงสุดไม่เกิน ${MAX_FILE_SIZE / (1024 * 1024)} MB)`);
    }

    const config = this.getConfig();
    const cleanFileName = req.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const timestamp = Date.now();
    const fileId = `doc-${timestamp}-${Math.random().toString(36).substring(2, 7)}`;
    const storageKey = `${req.entityType}/${req.entityId || 'general'}/${fileId}_${cleanFileName}`;

    // A. Amazon S3 / Cloudflare R2 / MinIO Direct Presigned PUT URL
    if (config.provider === 's3' && config.s3) {
      return this.createS3PresignedPut(config.s3, storageKey, req.fileType, cleanFileName);
    }

    // B. Cloudinary Direct Upload Signature
    if (config.provider === 'cloudinary' && config.cloudinary) {
      return this.createCloudinarySignedParams(config.cloudinary, storageKey, req.fileType);
    }

    // C. Local Server Storage Fallback
    return {
      provider: 'local',
      uploadUrl: '/api/storage/upload',
      downloadUrl: `/uploads/documents/${fileId}_${cleanFileName}`,
      fileKey: storageKey,
      fields: {
        entityType: req.entityType,
        entityId: req.entityId || '',
        category: req.category,
      },
      headers: {},
      maxSizeBytes: MAX_FILE_SIZE,
      expiresInSeconds: 900,
    };
  }

  /**
   * Internal: Generate AWS Signature v4 Presigned PUT URL for S3
   */
  private static createS3PresignedPut(
    s3: NonNullable<StorageConfig['s3']>,
    key: string,
    contentType: string,
    originalName: string
  ): PresignedUrlResponse {
    const expiresIn = 900; // 15 minutes
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.substring(0, 8);

    // Host & Path resolution
    let host = `${s3.bucket}.s3.${s3.region}.amazonaws.com`;
    let pathPart = `/${uriEncode(key, false)}`;

    if (s3.endpoint) {
      const url = new URL(s3.endpoint);
      host = url.host;
      pathPart = `/${s3.bucket}/${uriEncode(key, false)}`;
    }

    const credentialScope = `${dateStamp}/${s3.region}/s3/aws4_request`;

    const queryParams: Record<string, string> = {
      'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
      'X-Amz-Credential': `${s3.accessKeyId}/${credentialScope}`,
      'X-Amz-Date': amzDate,
      'X-Amz-Expires': String(expiresIn),
      'X-Amz-SignedHeaders': 'content-type;host',
    };

    const canonicalQueryString = Object.keys(queryParams)
      .sort()
      .map((k) => `${k}=${uriEncode(queryParams[k], true)}`)
      .join('&');

    const canonicalHeaders = `content-type:${contentType.trim()}\nhost:${host}\n`;
    const signedHeaders = 'content-type;host';
    const payloadHash = 'UNSIGNED-PAYLOAD';

    const canonicalRequest = `PUT\n${pathPart}\n${canonicalQueryString}\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
    const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${sha256Hex(canonicalRequest)}`;

    const signingKey = getSigningKey(s3.secretAccessKey, dateStamp, s3.region, 's3');
    const signature = hexHmac(signingKey, stringToSign);

    const presignedUrl = `https://${host}${pathPart}?${canonicalQueryString}&X-Amz-Signature=${signature}`;

    const publicUrl = s3.publicDomain
      ? `${s3.publicDomain}/${key}`
      : `https://${host}${pathPart}`;

    return {
      provider: 's3',
      uploadUrl: presignedUrl,
      downloadUrl: publicUrl,
      fileKey: key,
      headers: {
        'Content-Type': contentType,
      },
      maxSizeBytes: MAX_FILE_SIZE,
      expiresInSeconds: expiresIn,
    };
  }

  /**
   * Internal: Generate Cloudinary Signature
   */
  private static createCloudinarySignedParams(
    cloudinary: NonNullable<StorageConfig['cloudinary']>,
    key: string,
    contentType: string
  ): PresignedUrlResponse {
    const timestamp = Math.round(Date.now() / 1000);
    const folder = `zms/${key.split('/')[0]}`;
    const paramsToSign = `folder=${folder}&timestamp=${timestamp}${cloudinary.apiSecret}`;
    const signature = crypto.createHash('sha1').update(paramsToSign).digest('hex');

    const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudinary.cloudName}/auto/upload`;
    const publicUrl = `https://res.cloudinary.com/${cloudinary.cloudName}/image/upload/${folder}/${path.basename(key)}`;

    return {
      provider: 'cloudinary',
      uploadUrl,
      downloadUrl: publicUrl,
      fileKey: key,
      fields: {
        timestamp: String(timestamp),
        api_key: cloudinary.apiKey,
        signature,
        folder,
      },
      headers: {},
      maxSizeBytes: MAX_FILE_SIZE,
      expiresInSeconds: 900,
    };
  }

  /**
   * Save uploaded file to local filesystem (Local Engine)
   */
  static async saveLocalFile(
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string,
    category: string,
    entityType: 'beneficiary' | 'assistance_request',
    entityId?: string
  ): Promise<{ fileUrl: string; storagePath: string; checksum: string; fileSize: number }> {
    const config = this.getConfig();
    const uploadDir = config.local.uploadDir;

    // Ensure upload directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const cleanFileName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileId = `doc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const savedName = `${fileId}_${cleanFileName}`;
    const targetPath = path.join(uploadDir, savedName);

    await fs.promises.writeFile(targetPath, fileBuffer);

    const checksum = sha256Hex(fileBuffer);
    const fileUrl = `${config.local.publicPath}/${savedName}`;

    return {
      fileUrl,
      storagePath: savedName,
      checksum,
      fileSize: fileBuffer.length,
    };
  }

  /**
   * Register document in SQLite database
   */
  static async registerDocument(
    input: RegisterDocumentInput,
    actor?: ActorContext
  ) {
    await initDb();
    const db = getDb();

    const docId = `doc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const uploadDateStr = new Date().toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    const isBeneficiary = input.entityType === 'beneficiary';
    let applicationId = isBeneficiary ? '' : (input.entityId || '');
    const beneficiaryId = isBeneficiary ? input.entityId : null;

    let appExists = false;
    if (applicationId) {
      const checkRes = await db.execute({
        sql: 'SELECT id FROM assistance_applications WHERE id = ?',
        args: [applicationId],
      });
      appExists = checkRes.rows.length > 0;
    }

    if (!appExists) {
      const fallbackApp = await db.execute('SELECT id FROM assistance_applications LIMIT 1');
      if (fallbackApp.rows.length > 0) {
        applicationId = String(fallbackApp.rows[0].id);
      }
    }

    await db.execute({
      sql: `INSERT INTO application_documents (
        id, application_id, beneficiary_id, name, category, file_url, status,
        upload_date, storage_provider, storage_path, file_size, mime_type, checksum, is_confidential,
        uploaded_by_id, uploaded_by_name
      ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      args: [
        docId,
        applicationId,
        beneficiaryId,
        input.name,
        input.category,
        input.fileUrl,
        uploadDateStr,
        input.storageProvider,
        input.storagePath,
        input.fileSize || 0,
        input.mimeType || 'application/pdf',
        input.checksum || '',
        actor?.id || null,
        actor?.name || null,
      ],
    });

    // Record Audit Log
    if (actor) {
      await db.execute({
        sql: `INSERT INTO audit_logs (
          id, timestamp, user_id, user_name, user_role, action, entity_type, entity_id, description
        ) VALUES (?, ?, ?, ?, ?, 'DOCUMENT_UPLOADED', ?, ?, ?)`,
        args: [
          `log-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
          new Date().toISOString(),
          actor.id,
          actor.name,
          actor.role || 'user',
          input.entityType === 'beneficiary' ? 'beneficiary' : 'assistance_application',
          input.entityId,
          `อัปโหลดเอกสาร ${input.name} (${input.category}) ผ่าน ${input.storageProvider}`,
        ],
      });
    }

    return {
      id: docId,
      name: input.name,
      category: input.category,
      fileUrl: input.fileUrl,
      uploadDate: uploadDateStr,
      status: 'pending',
      storageProvider: input.storageProvider,
      fileSize: input.fileSize,
      mimeType: input.mimeType,
      uploadedById: actor?.id,
      uploadedByName: actor?.name,
    };
  }

  /**
   * Check if a document's physical file exists on disk
   */
  static checkPhysicalFile(doc: {
    file_url?: string;
    fileUrl?: string;
    storage_path?: string;
    storagePath?: string;
    storage_provider?: string;
    storageProvider?: string;
  }): { exists: boolean; fullPath?: string; fileSize?: number } {
    const provider = doc.storage_provider || doc.storageProvider || 'local';
    if (provider !== 'local') {
      return { exists: true }; // Remote storage (S3 / Cloudinary)
    }

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'documents');
    const storagePath = doc.storage_path || doc.storagePath;
    const fileUrl = doc.file_url || doc.fileUrl;

    if (storagePath) {
      const candidate = path.join(uploadDir, path.basename(storagePath));
      if (fs.existsSync(candidate)) {
        try {
          const stat = fs.statSync(candidate);
          return { exists: true, fullPath: candidate, fileSize: stat.size };
        } catch {}
      }
    }

    if (fileUrl) {
      const relPath = fileUrl.startsWith('/') ? fileUrl.slice(1) : fileUrl;
      const candidate = path.join(process.cwd(), 'public', relPath);
      if (fs.existsSync(candidate)) {
        try {
          const stat = fs.statSync(candidate);
          return { exists: true, fullPath: candidate, fileSize: stat.size };
        } catch {}
      }
      const base = path.basename(fileUrl);
      const candidate2 = path.join(uploadDir, base);
      if (fs.existsSync(candidate2)) {
        try {
          const stat = fs.statSync(candidate2);
          return { exists: true, fullPath: candidate2, fileSize: stat.size };
        } catch {}
      }
    }

    return { exists: false };
  }

  /**
   * Helper to derive MIME type from file extension
   */
  static getMimeType(fileName: string, defaultMime?: string): string {
    if (defaultMime && defaultMime !== 'application/octet-stream') return defaultMime;
    const ext = path.extname(fileName).toLowerCase();
    switch (ext) {
      case '.pdf': return 'application/pdf';
      case '.jpg':
      case '.jpeg': return 'image/jpeg';
      case '.png': return 'image/png';
      case '.webp': return 'image/webp';
      case '.docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      case '.xlsx': return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      case '.doc': return 'application/msword';
      case '.xls': return 'application/vnd.ms-excel';
      default: return 'application/octet-stream';
    }
  }

  /**
   * Securely retrieve file content or redirect URL with permission checks & audit logs
   */
  static async getFileContent(
    docId: string,
    actor: ActorContext,
    mode: 'preview' | 'download'
  ): Promise<{
    type: 'buffer' | 'redirect';
    buffer?: Buffer;
    url?: string;
    fileName: string;
    mimeType: string;
    fileSize: number;
  }> {
    await initDb();
    const db = getDb();

    const res = await db.execute({
      sql: `SELECT d.*, a.member_id as app_member_id, b.member_id as ben_member_id, b.national_id as ben_national_id
            FROM application_documents d
            LEFT JOIN assistance_applications a ON d.application_id = a.id
            LEFT JOIN beneficiaries b ON d.beneficiary_id = b.id
            WHERE d.id = ?`,
      args: [docId],
    });

    if (res.rows.length === 0) {
      throw new Error('ไม่พบเอกสารที่ระบุในระบบ');
    }

    const doc = res.rows[0];

    // Privacy Guard: Member can only view/download their own documents
    if (actor.role === 'member') {
      const isOwner =
        (doc.app_member_id && String(doc.app_member_id) === actor.id) ||
        (doc.ben_member_id && String(doc.ben_member_id) === actor.id) ||
        (doc.uploaded_by_id && String(doc.uploaded_by_id) === actor.id) ||
        (doc.uploaded_by_name && String(doc.uploaded_by_name) === actor.name) ||
        (actor.nationalId && doc.ben_national_id && String(doc.ben_national_id).replace(/[^0-9]/g, '') === actor.nationalId.replace(/[^0-9]/g, ''));

      if (!isOwner) {
        throw new Error('ท่านไม่มีสิทธิ์เข้าถึงหรือดาวน์โหลดเอกสารของผู้อื่น');
      }
    }

    // Record Audit Log (without sensitive personal data)
    const action = mode === 'preview' ? 'DOCUMENT_PREVIEWED' : 'DOCUMENT_DOWNLOADED';
    const actionTh = mode === 'preview' ? 'เปิดดูตัวอย่างเอกสาร' : 'ดาวน์โหลดเอกสารต้นฉบับ';
    await db.execute({
      sql: `INSERT INTO audit_logs (
        id, timestamp, user_id, user_name, user_role, action, entity_type, entity_id, description
      ) VALUES (?, ?, ?, ?, ?, ?, 'document', ?, ?)`,
      args: [
        `log-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        new Date().toISOString(),
        actor.id,
        actor.name,
        actor.role || 'user',
        action,
        docId,
        `${actionTh}: "${String(doc.name)}" (รหัสเอกสาร: ${docId})`,
      ],
    });

    const provider = String(doc.storage_provider || 'local') as StorageProvider;
    const config = this.getConfig();

    if (provider === 's3' && config.s3) {
      const presignedUrl = this.createS3PresignedGet(config.s3, String(doc.storage_path));
      return {
        type: 'redirect',
        url: presignedUrl,
        fileName: String(doc.name),
        mimeType: this.getMimeType(String(doc.name), doc.mime_type ? String(doc.mime_type) : undefined),
        fileSize: Number(doc.file_size) || 0,
      };
    }

    // Local Storage: check physical file on disk
    const check = this.checkPhysicalFile(doc as any);
    if (!check.exists || !check.fullPath) {
      throw new Error(`ไม่พบไฟล์ต้นฉบับในระบบจัดเก็บ (พาธไฟล์ "${doc.file_url}" ไม่มีอยู่จริงบนเซิร์ฟเวอร์)`);
    }

    const buffer = await fs.promises.readFile(check.fullPath);
    const mimeType = this.getMimeType(String(doc.name), doc.mime_type ? String(doc.mime_type) : undefined);

    return {
      type: 'buffer',
      buffer,
      fileName: String(doc.name),
      mimeType,
      fileSize: buffer.length,
    };
  }

  /**
   * Delete document record and physical file (with permission check and audit log)
   */
  static async deleteDocument(docId: string, actor: ActorContext): Promise<boolean> {
    await initDb();
    const db = getDb();

    const res = await db.execute({
      sql: `SELECT d.*, a.member_id as app_member_id, b.member_id as ben_member_id
            FROM application_documents d
            LEFT JOIN assistance_applications a ON d.application_id = a.id
            LEFT JOIN beneficiaries b ON d.beneficiary_id = b.id
            WHERE d.id = ?`,
      args: [docId],
    });

    if (res.rows.length === 0) {
      throw new Error('ไม่พบเอกสารที่ต้องการลบ');
    }

    const doc = res.rows[0];

    // Authorization: Super Admin, Officer, or document owner
    const isOwner =
      (doc.app_member_id && String(doc.app_member_id) === actor.id) ||
      (doc.ben_member_id && String(doc.ben_member_id) === actor.id) ||
      (doc.uploaded_by_id && String(doc.uploaded_by_id) === actor.id);
    const isStaff = ['officer', 'super_admin'].includes(actor.role);

    if (!isOwner && !isStaff) {
      throw new Error('ท่านไม่มีสิทธิ์ในการลบเอกสารนี้');
    }

    // Remove local file if present
    const check = this.checkPhysicalFile(doc as any);
    if (check.exists && check.fullPath) {
      try {
        await fs.promises.unlink(check.fullPath);
      } catch (err) {
        console.warn('Could not unlink local file:', err);
      }
    }

    await db.execute({
      sql: 'DELETE FROM application_documents WHERE id = ?',
      args: [docId],
    });

    // Audit Log
    await db.execute({
      sql: `INSERT INTO audit_logs (
        id, timestamp, user_id, user_name, user_role, action, entity_type, entity_id, description
      ) VALUES (?, ?, ?, ?, ?, 'DOCUMENT_DELETED', 'document', ?, ?)`,
      args: [
        `log-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        new Date().toISOString(),
        actor.id,
        actor.name,
        actor.role || 'user',
        docId,
        `ลบเอกสาร "${String(doc.name)}" ออกจากระบบ (รหัส: ${docId})`,
      ],
    });

    return true;
  }

  /**
   * Generate secure download URL with permission check
   */
  static async getSecureDownloadUrl(docId: string, actor: ActorContext): Promise<string> {
    await initDb();
    const db = getDb();

    const res = await db.execute({
      sql: `SELECT d.*, a.member_id as app_member_id, b.member_id as ben_member_id, b.national_id as ben_national_id
            FROM application_documents d
            LEFT JOIN assistance_applications a ON d.application_id = a.id
            LEFT JOIN beneficiaries b ON d.beneficiary_id = b.id
            WHERE d.id = ?`,
      args: [docId],
    });

    if (res.rows.length === 0) {
      throw new Error('ไม่พบเอกสารที่ระบุในระบบ');
    }

    const doc = res.rows[0];

    // Privacy Guard: Member can only view their own documents
    if (actor.role === 'member') {
      const isOwner =
        (doc.app_member_id && String(doc.app_member_id) === actor.id) ||
        (doc.ben_member_id && String(doc.ben_member_id) === actor.id) ||
        (actor.nationalId && String(doc.ben_national_id) === actor.nationalId.replace(/[^0-9]/g, ''));

      if (!isOwner) {
        throw new Error('ท่านไม่มีสิทธิ์เข้าถึงหรือดาวน์โหลดเอกสารของผู้อื่น');
      }
    }

    const provider = String(doc.storage_provider || 'local') as StorageProvider;
    const config = this.getConfig();

    if (provider === 's3' && config.s3) {
      // Generate Presigned GET with 1 hour expiration
      return this.createS3PresignedGet(config.s3, String(doc.storage_path));
    }

    // Default to stored file URL
    return String(doc.file_url);
  }

  /**
   * Internal: Generate AWS Signature v4 Presigned GET URL for S3
   */
  private static createS3PresignedGet(
    s3: NonNullable<StorageConfig['s3']>,
    key: string
  ): string {
    const expiresIn = 3600; // 1 hour
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.substring(0, 8);

    let host = `${s3.bucket}.s3.${s3.region}.amazonaws.com`;
    let pathPart = `/${uriEncode(key, false)}`;

    if (s3.endpoint) {
      const url = new URL(s3.endpoint);
      host = url.host;
      pathPart = `/${s3.bucket}/${uriEncode(key, false)}`;
    }

    const credentialScope = `${dateStamp}/${s3.region}/s3/aws4_request`;

    const queryParams: Record<string, string> = {
      'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
      'X-Amz-Credential': `${s3.accessKeyId}/${credentialScope}`,
      'X-Amz-Date': amzDate,
      'X-Amz-Expires': String(expiresIn),
      'X-Amz-SignedHeaders': 'host',
    };

    const canonicalQueryString = Object.keys(queryParams)
      .sort()
      .map((k) => `${k}=${uriEncode(queryParams[k], true)}`)
      .join('&');

    const canonicalHeaders = `host:${host}\n`;
    const signedHeaders = 'host';
    const payloadHash = 'UNSIGNED-PAYLOAD';

    const canonicalRequest = `GET\n${pathPart}\n${canonicalQueryString}\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
    const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${sha256Hex(canonicalRequest)}`;

    const signingKey = getSigningKey(s3.secretAccessKey, dateStamp, s3.region, 's3');
    const signature = hexHmac(signingKey, stringToSign);

    return `https://${host}${pathPart}?${canonicalQueryString}&X-Amz-Signature=${signature}`;
  }
}
