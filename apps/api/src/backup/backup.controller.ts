import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/roles.decorator';
import { CurrentUser } from '../common/current-user.decorator';
import type { AuthUser } from '../common/auth-user';
import { BackupService } from './backup.service';
import { CreateBackupDto } from './dto/backup.dto';

@ApiTags('backup')
@ApiBearerAuth()
@Controller('backup')
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  @Post('create')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'สร้างจุดสำรองข้อมูลฐานข้อมูลและสแนปช็อตระเบียน (Database Backup Snapshot)' })
  createBackup(
    @Body() dto: CreateBackupDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.backupService.createBackup(dto, user);
  }

  @Get('history')
  @Roles('SUPER_ADMIN', 'AUDITOR', 'FINANCE_OFFICER')
  @ApiOperation({ summary: 'ประวัติและรายการจุดสำรองข้อมูลฐานข้อมูลทั้งหมด' })
  getBackupHistory() {
    return this.backupService.getBackupHistory();
  }

  @Get('verify')
  @Roles('SUPER_ADMIN', 'AUDITOR')
  @ApiOperation({ summary: 'ตรวจสอบความสมบูรณ์เชิงสัมพันธ์และเสถียรภาพฐานข้อมูล (Integrity Verification)' })
  verifyDatabaseIntegrity() {
    return this.backupService.verifyDatabaseIntegrity();
  }
}

