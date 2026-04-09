import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface CurrentUserData {
    tenantId: string;
    apiKeyId: string;
    plan: string;
}

export const CurrentUser = createParamDecorator(
    (data: keyof CurrentUserData | undefined, ctx: ExecutionContext): CurrentUserData | string => {
        const request = ctx.switchToHttp().getRequest();
        const user = request.user as CurrentUserData;

        if (data) {
            return user[data];
        }

        return user;
    },
);