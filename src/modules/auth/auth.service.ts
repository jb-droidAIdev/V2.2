import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
    constructor(
        private usersService: UsersService,
        private jwtService: JwtService
    ) { }

    async validateUser(email: string, pass: string): Promise<any> {
        const user = await this.usersService.findOne(email) as any;
        if (!user) return null;

        // 1. Brute-force protection: Check if locked out
        if (user.lockoutUntil && new Date() < new Date(user.lockoutUntil)) {
            throw new ForbiddenException(`Account is locked until ${user.lockoutUntil.toLocaleTimeString()}. Too many failed attempts.`);
        }

        if (user.password) {
            let isMatch = false;
            try {
                // 2. Standard comparison: Bcrypt
                isMatch = await bcrypt.compare(pass, user.password);
            } catch (e) {
                // Not a bcrypt hash?
                isMatch = false;
            }

            // 3. Legacy Fallback: Plain-text check (only if bcrypt fails)
            if (!isMatch && pass === user.password) {
                // Successful plain-text login? Auto-upgrade to bcrypt
                await this.usersService.updatePassword(user.id, pass);
                isMatch = true;
            }

            if (isMatch) {
                // 4. Success: Reset tracking
                await this.usersService.updateLoginMetadata(user.id, {
                    failedLoginAttempts: 0,
                    lockoutUntil: null,
                    lastLoginAt: new Date()
                });

                const { password, ...result } = user;
                return result;
            }
        }

        // 5. Failure: Update failed attempts
        const failedAttempts = user.failedLoginAttempts + 1;
        const lockoutUntil = failedAttempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null; // 15 min lockout after 5 attempts

        await this.usersService.updateLoginMetadata(user.id, {
            failedLoginAttempts: failedAttempts,
            lockoutUntil
        });

        return null;
    }

    async login(user: any) {
        const payload = { username: user.email, sub: user.id, role: user.role };
        return {
            access_token: this.jwtService.sign(payload),
            user: user,
        };
    }
}
