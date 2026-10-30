import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../common/auth-user';
import { CurrentUser } from '../common/current-user.decorator';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'โปรไฟล์เจ้าหน้าที่จากโทเคน ไม่รับ user id จากไคลเอนต์' })
  me(@CurrentUser() user: AuthUser) {
    return this.users.toProfile(user);
  }
}
