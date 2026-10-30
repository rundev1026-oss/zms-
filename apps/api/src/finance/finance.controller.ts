import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../common/permissions.decorator';
import { Roles } from '../common/roles.decorator';
import { CurrentUser } from '../common/current-user.decorator';
import type { AuthUser } from '../common/auth-user';
import { FinanceService } from './finance.service';
import {
  DisburseAssistanceDto,
  QueryTransactionsDto,
} from './dto/finance.dto';

@ApiTags('finance')
@ApiBearerAuth()
@Controller('finance')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Post('disburse')
  @Roles('FINANCE_OFFICER', 'TREASURER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'เบิกจ่ายเงินสงเคราะห์ผู้รับซะกาตตามคำร้องที่ได้รับอนุมัติ' })
  disburse(
    @Body() dto: DisburseAssistanceDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.financeService.disburse(dto, user);
  }

  @Get('transactions')
  @RequirePermissions('beneficiaries.read')
  @ApiOperation({ summary: 'เรียกดูรายการธุรกรรมการเงินและสมุดบัญชีแยกประเภท' })
  listTransactions(@Query() query: QueryTransactionsDto) {
    return this.financeService.listTransactions(query);
  }

  @Get('transactions/:id')
  @RequirePermissions('beneficiaries.read')
  @ApiOperation({ summary: 'ดูรายละเอียดธุรกรรมการเงินตามรหัส' })
  getTransactionById(@Param('id') id: string) {
    return this.financeService.getTransactionById(id);
  }

  @Get('funds')
  @RequirePermissions('beneficiaries.read')
  @ApiOperation({ summary: 'รายการบัญชีกองทุนและยอดคงเหลือจัดสรรได้' })
  getFunds() {
    return this.financeService.getFunds();
  }

  @Get('bank-accounts')
  @RequirePermissions('beneficiaries.read')
  @ApiOperation({ summary: 'รายการบัญชีธนาคารมูลนิธิและยอดคงเหลือ' })
  getBankAccounts() {
    return this.financeService.getBankAccounts();
  }

  @Get('summary')
  @RequirePermissions('beneficiaries.read')
  @ApiOperation({ summary: 'สรุปภาพรวมงบประมาณการเงิน 3 ระดับ' })
  getBudgetSummary() {
    return this.financeService.getBudgetSummary();
  }
}

