
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';

// In a real app, use ENV variable
export const jwtConstants = {
    secret: 'secretKey',
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(private usersService: UsersService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: jwtConstants.secret,
        });
    }

    async validate(payload: any) {
        const user = await this.usersService.findById(payload.sub) as any;
        if (!user) return null;

        const { password, userRole, customPermissions, ...result } = user;

        // Flatten permissions
        const rolePerms = userRole?.permissions?.map((p: any) => p.permission.code) || [];
        const customPerms = customPermissions?.map((p: any) => p.permission.code) || [];

        // Combine unique
        const permissions = Array.from(new Set([...rolePerms, ...customPerms]));

        return { ...result, permissions, roleName: userRole?.name || user.role };
    }
}
