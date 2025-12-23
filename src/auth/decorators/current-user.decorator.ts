import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserWithRole } from '../../users/interfaces/user.interface.js';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): UserWithRole => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);



