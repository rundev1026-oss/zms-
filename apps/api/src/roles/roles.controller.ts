import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RolesService } from './roles.service';

@ApiTags('roles')
@ApiBearerAuth()
@Controller('roles')
export class RolesController {
  constructor(private readonly roles: RolesService) {}

  @Get()
  @ApiOperation({ summary: 'รายการบทบาทและสิทธิ์จากฐานข้อมูล' })
  list() {
    return this.roles.listCatalog();
  }
}
