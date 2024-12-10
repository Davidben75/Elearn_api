import { Controller, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guard';
import { StatusActiveGuard } from 'src/auth/guard/status.guard';

@UseGuards(JwtAuthGuard, StatusActiveGuard)
@Controller('user')
export class UserController {
  constructor() {}
}
