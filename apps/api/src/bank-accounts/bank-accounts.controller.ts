import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/roles.decorator';
import { RequirePermissions } from '../common/permissions.decorator';
import { CurrentUser } from '../common/current-user.decorator';
import type { AuthUser } from '../common/auth-user';
import { BankAccountsService } from './bank-accounts.service';
import {
  ReconcileBankAccountDto,
  QueryReconciliationsDto,
} from './dto/bank-account.dto';

@ApiTags('bank-accounts')
@ApiBearerAuth()
@Controller('bank-accounts')
export class BankAccountsController {
  constructor(private readonly bankAccountsService: BankAccountsService) {}

  @Get()
  @RequirePermissions('beneficiaries.read')
  @ApiOperation({ summary: 'รายการบัญชีธนาคารทั้งหมดของมูลนิธิ' })
  getBankAccounts() {
    return this.bankAccountsService.getBankAccounts();
  }

  @Get('reconciliations')
  @RequirePermissions('beneficiaries.read')
  @ApiOperation({ summary: 'รายการประวัติการกระทบยอดธนาคารทั้งหมด (Bank Reconciliations)' })
  getReconciliations(@Query() query: QueryReconciliationsDto) {
    return this.bankAccountsService.getReconciliations(query);
  }

  @Get(':id')
  @RequirePermissions('beneficiaries.read')
  @ApiOperation({ summary: 'รายละเอียดบัญชีธนาคารตามรหัส' })
  getBankAccountById(@Param('id') id: string) {
    return this.bankAccountsService.getBankAccountById(id);
  }

  @Post(':id/reconcile')
  @Roles('SUPER_ADMIN', 'FINANCE_OFFICER', 'TREASURER', 'AUDITOR')
  @ApiOperation({ summary: 'บันทึกการกระทบยอดเงินฝากธนาคารประจำงวด (Bank Reconciliation)' })
  reconcileBankAccount(
    @Param('id') id: string,
    @Body() dto: ReconcileBankAccountDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.bankAccountsService.reconcileBankAccount(id, dto, user);
  }
}

