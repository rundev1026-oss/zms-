# คู่มือการติดตั้งและบริหารจัดการระบบระดับองค์กร (Enterprise Production Deployment & Operations Runbook)
## Zakat Management System (ZMS)

เอกสารฉบับนี้เป็นคู่มือมาตรฐานสำหรับการติดตั้ง (Deployment), การตั้งค่าความปลอดภัย (OWASP Hardening), การสำรองข้อมูล (Backup & Disaster Recovery), และการดูแลรักษาระบบ Zakat Management System (ZMS) ในสภาพแวดล้อมระดับ Production

---

## 1. สถาปัตยกรรมระบบ (System Architecture)

ระบบ ZMS ถูกออกแบบตามหลักการ **Enterprise Separation of Concerns**:
- **Reverse Proxy & Edge Security**: Nginx Reverse Proxy (SSL/TLS, Rate Limiting, OWASP Security Headers)
- **Frontend Layer**: Next.js 16 (App Router, React 19, Tailwind CSS 4, Turbopack, TypeScript)
- **Backend API Layer**: Standalone NestJS 11 REST API (Modular Architecture, Prisma ORM, Helmet, Throttler, Class-Validator)
- **Database Layer**: PostgreSQL 16 Container (ACID Compliant, Exact Satang Decimal(18,2) Precision, Foreign Key Cascades)

```
                       +-----------------------------------+
                       |       Client Browser / User       |
                       +-----------------+-----------------+
                                         |
                                         | HTTPS (:443) / HTTP (:80)
                                         v
                       +-----------------------------------+
                       |        Nginx Reverse Proxy        |
                       |  - Rate Limiting (API & Auth)     |
                       |  - OWASP Security Headers         |
                       |  - SSL/TLS Termination            |
                       +--------+-----------------+--------+
                                |                 |
             Proxy Pass (/)     |                 | Proxy Pass (/api/v1/)
                                v                 v
         +-----------------------------+   +-----------------------------+
         |     Next.js 16 Web App      |   |      NestJS 11 REST API     |
         |  - App Router Views         |   |  - RBAC & JWT Guard         |
         |  - Tailwind CSS 4 & Lucide  |   |  - Helmet & Throttler       |
         |  - BFF API Proxy            |   |  - 14 Enterprise Modules    |
         +-----------------------------+   +--------------+--------------+
                                                          |
                                                          | Prisma ORM (TCP 5432)
                                                          v
                                           +-----------------------------+
                                           |     PostgreSQL 16 Engine    |
                                           |  - 42 Enterprise Tables     |
                                           |  - Strict Audit Logging     |
                                           |  - Decimal(18,2) Satang     |
                                           +-----------------------------+
```

---

## 2. พอร์ตและเน็ตเวิร์ก (Network Topology & Ports)

| Service | Container Name | Internal Port | Host / Exposed Port | Protocol | Purpose |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Nginx** | `zms-nginx` | 80, 443 | `80`, `443` | HTTP/HTTPS | Main Web & API Ingress |
| **Next.js Web** | `zms-web` | 3000 | `3000` (Dev: `3001`) | HTTP | Modern Frontend Application |
| **NestJS API** | `zms-api` | 4000 | `4000` | HTTP | Core REST API Backend |
| **PostgreSQL** | `zms-postgres` | 5432 | `5432` | PostgreSQL | Enterprise Relational Database |

---

## 3. สเปกขั้นต่ำและข้อกำหนดระบบ (System Requirements)

- **Operating System**: Ubuntu 22.04 LTS / Debian 12 / RHEL 9 / Windows Server 2022
- **CPU**: 2 vCPU ขั้นต่ำ (แนะนำ 4 vCPU สำหรับองค์กรขนาดกลาง)
- **RAM**: 4 GB ขั้นต่ำ (แนะนำ 8 GB เพื่อรองรับ NestJS + Next.js build + Postgres cache)
- **Disk Storage**: 40 GB SSD (NVMe แนะนำ) สำหรับระบบและ Snapshot สำรองข้อมูล
- **Docker Engine**: Docker 24.0+ และ Docker Compose v2.20+
- **Node.js**: v22.x LTS (สำหรับการรันแบบ Bare-metal หรือ CI/CD Build)

---

## 4. ตัวแปรสภาพแวดล้อม (Environment Variables Reference)

คัดลอกจาก `.env.example` ไปยัง `.env`:

```bash
cp .env.example .env
```

| Variable | Type | Default Value | Description |
| :--- | :--- | :--- | :--- |
| `POSTGRES_USER` | string | `zms` | ชื่อผู้ใช้ PostgreSQL |
| `POSTGRES_PASSWORD` | string | *Secret* | รหัสผ่าน PostgreSQL (ต้องเปลี่ยนเป็นรหัสที่ซับซ้อนใน Production) |
| `POSTGRES_DB` | string | `zms` | ชื่อฐานข้อมูลระบบ |
| `POSTGRES_PORT` | number | `5432` | พอร์ต PostgreSQL |
| `DATABASE_URL` | string | `postgresql://...` | Connection String สำหรับ Prisma ORM |
| `NODE_ENV` | string | `production` | โหมดการทำงาน (`production` หรือ `development`) |
| `API_PORT` | number | `4000` | พอร์ตของ NestJS REST API |
| `API_PREFIX` | string | `api/v1` | URL Prefix ของ API Endpoints |
| `WEB_ORIGIN` | string | `http://localhost:3000` | โดเมนที่อนุญาตให้เข้าถึง API ผ่าน CORS |
| `JWT_ACCESS_SECRET` | string | *Secret* | คีย์สำหรับเซ็น JWT Token (ความยาวไม่น้อยกว่า 64 ตัวอักษร) |
| `JWT_ACCESS_TTL_SECONDS` | number | `900` | อายุ Access Token (15 นาที = 900 วินาที) |
| `REFRESH_TTL_SECONDS` | number | `604800` | อายุ Refresh Token (7 วัน = 604,800 วินาที) |
| `TRUST_PROXY` | number | `1` | จำนวน Proxy hops หน้า API (Nginx = 1) |

---

## 5. การติดตั้งและเปิดใช้งานด้วย Docker Compose (Production Deployment)

### 5.1 เริ่มต้นสร้างและรัน Container ทั้งหมด

```bash
# 1. โคลนคลังโค้ดและเตรียมสภาพแวดล้อม
git clone https://github.com/organization/zms.git
cd zms
cp .env.example .env

# 2. แก้ไขรหัสผ่านและ Secret ใน .env ให้ปลอดภัย
nano .env

# 3. สั่ง Build และรันคอนเทนเนอร์ในโหมด Background Daemon
docker compose up -d --build

# 4. ตรวจสอบสถานะการทำงานของคอนเทนเนอร์
docker compose ps
```

### 5.2 การตรวจสอบ Health Check

```bash
# ตรวจสอบสถานะ Nginx
curl -I http://localhost/nginx-health

# ตรวจสอบสถานะ NestJS API และการเชื่อมต่อฐานข้อมูล
curl -s http://localhost/api/v1/health | jq .

# ตรวจสอบ Log การทำงานแบบ Realtime
docker compose logs -f api
docker compose logs -f web
```

---

## 6. มาตรการความปลอดภัยระดับองค์กร (OWASP Top 10 Hardening)

ระบบ ZMS ผ่านการตรวจสอบและติดตั้งกลไกความปลอดภัยครอบคลุมมาตรฐาน OWASP Top 10:

1. **A01: Broken Access Control**:
   - ควบคุมการเข้าถึงตามบทบาท (RBAC) 8 ระดับ: `super_admin`, `admin`, `approver`, `auditor`, `officer`, `surveyor`, `treasurer`, `beneficiary`
   - ป้องกัน IDOR ด้วยการตรวจสอบความเป็นเจ้าของข้อมูลและสาขา (`branchId`)
2. **A02: Cryptographic Failures**:
   - เข้ารหัสรหัสผ่านด้วยอัลกอริทึม `scrypt` (มาตรฐานความปลอดภัยระดับสูงกว่า bcrypt)
   - สลับ Session และหมุนเวียน Token ด้วย HttpOnly SameSite Cookie
   - Masking เลขบัตรประชาชน 13 หลักและเลขที่บัญชีธนาคารในระดับ Presentation Layer
3. **A03: Injection**:
   - ป้องกัน SQL Injection 100% ด้วย Prisma Parameterized Queries
   - ป้องกัน Parameter Tampering และ Mass Assignment ด้วย `ValidationPipe` (`whitelist: true, forbidNonWhitelisted: true`)
4. **A04: Insecure Design & Idempotency**:
   - ป้องกันการเบิกจ่ายซ้ำซ้อน (Double Disbursement Prevention) ด้วย Unique Constraints และ Transaction Isolation
   - ตรวจสอบยอดเงินคงเหลือในบัญชีธนาคาร (Solvency Verification) ก่อนอนุมัติการจ่ายเงินทุกครั้ง
5. **A05: Security Misconfiguration**:
   - ติดตั้ง `Helmet` ใน NestJS และ Security Headers ใน Next.js & Nginx
   - บังคับใช้ CSP, HSTS (`max-age=63072000`), X-Frame-Options (`SAMEORIGIN`), X-Content-Type-Options (`nosniff`)
   - ใช้งาน Non-root User (`USER node`) ใน Docker Container ทั้งหมด
6. **A07: Identification and Authentication Failures**:
   - ป้องกัน Brute-force Attacks ด้วย Rate Limiting ผ่าน `@nestjs/throttler` (Short: 100/s, Medium: 500/10s, Long: 2000/min) และ Nginx `limit_req`
   - มีระบบ 2FA TOTP และ Session Invalidation เมื่อออกจากระบบ
7. **A08: Software and Data Integrity**:
   - Foreign Key Cascades และ Integrity Check ป้องกันข้อมูลขยะหรือเรคอร์ดกำพร้า (Orphan Records)
8. **A09: Security Logging & Monitoring**:
   - บันทึกการเปลี่ยนแปลงข้อมูลสำคัญทั้งหมด (Create, Update, Delete, Approve, Disburse, Login) ลงตาราง `AuditLog` พร้อม IP Address, User Agent และ Timestamp

---

## 7. แผนสำรองและกู้คืนข้อมูล (Backup & Disaster Recovery)

### 7.1 การสำรองข้อมูลอัตโนมัติ (Automated Backup)

ระบบมีสคริปต์สำรองข้อมูลรองรับทั้ง Linux และ Windows:

- **Linux / Docker Production**:
  ```bash
  chmod +x scripts/backup_postgres.sh
  ./scripts/backup_postgres.sh
  ```
  *ตั้งค่า Cron Job ให้สำรองข้อมูลทุกเที่ยงคืน:*
  ```cron
  0 0 * * * /opt/zms/scripts/backup_postgres.sh >> /var/log/zms_backup.log 2>&1
  ```

- **Windows / Development**:
  ```powershell
  powershell -ExecutionPolicy Bypass -File scripts\backup_postgres.ps1
  ```

### 7.2 การกู้คืนข้อมูลจากไฟล์สำรอง (Database Restore)

- **Linux**:
  ```bash
  chmod +x scripts/restore_postgres.sh
  ./scripts/restore_postgres.sh backups/zms_backup_20261030_181932.sql
  ```

- **Windows**:
  ```powershell
  powershell -ExecutionPolicy Bypass -File scripts\restore_postgres.ps1 -BackupFile backups\zms_backup_20261030_181932.sql
  ```

---

## 8. การอัปเดตระบบแบบต่อเนื่อง (Rolling Zero-Downtime Deployment)

เมื่อมีการปรับปรุงเวอร์ชันใหม่ของซอร์สโค้ด:

```bash
# 1. ดึงโค้ดล่าสุดจาก Git
git pull origin main

# 2. ทำการ Migrate ฐานข้อมูล (หากมี Schema Changes)
docker compose exec api npx prisma migrate deploy

# 3. ทำการ Re-build และสลับคอนเทนเนอร์แบบ Rolling
docker compose up -d --no-deps --build api
docker compose up -d --no-deps --build web

# 4. ล้าง Image เก่าที่ไม่ได้ใช้งาน
docker image prune -f
```

