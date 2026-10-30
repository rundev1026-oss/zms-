import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../common/auth-user';
import { CurrentUser } from '../common/current-user.decorator';
import { RequirePermissions } from '../common/permissions.decorator';
import { AsnafService } from './asnaf.service';
import { ProposeAsnafDto } from './proposal.dto';

@ApiTags('asnaf')
@ApiBearerAuth()
@Controller('beneficiaries/:beneficiaryId/asnaf-proposal')
export class AsnafProposalController {
  constructor(private readonly asnaf: AsnafService) {}

  @Get()
  @RequirePermissions('beneficiaries.read')
  @ApiOperation({ summary: 'ข้อเสนอหมวดอัสนัฟล่าสุด ยังไม่ใช่ผลการตัดสินคุณสมบัติ' })
  latest(
    @Param('beneficiaryId', ParseUUIDPipe) beneficiaryId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.asnaf.latestProposal(beneficiaryId, user);
  }

  @Post()
  @RequirePermissions('beneficiaries.write')
  @ApiOperation({ summary: 'บันทึกข้อเสนอหมวดอัสนัฟแบบ PROPOSED โดยไม่เปลี่ยนสถานะทะเบียน' })
  propose(
    @Param('beneficiaryId', ParseUUIDPipe) beneficiaryId: string,
    @Body() dto: ProposeAsnafDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.asnaf.propose(beneficiaryId, dto, user);
  }
}
