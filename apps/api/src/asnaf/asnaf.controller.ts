import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../common/permissions.decorator';
import { AsnafService } from './asnaf.service';

@ApiTags('asnaf')
@ApiBearerAuth()
@Controller('asnaf/categories')
export class AsnafController {
  constructor(private readonly asnaf: AsnafService) {}

  @Get()
  @RequirePermissions('beneficiaries.read')
  @ApiOperation({ summary: 'หมวดอัสนัฟที่เปิดใช้งาน ระบบไม่ตัดสินคุณสมบัติจากหมวดนี้เอง' })
  list() {
    return this.asnaf.listActive();
  }
}
