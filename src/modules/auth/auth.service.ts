import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { jwtConstants } from './jwt.strategy';
import * as bcrypt from 'bcrypt';
import { MailService } from '../mail/mail.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private prisma: PrismaService,
    private mailService: MailService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    console.log(`[AUTH] Login attempt: ${email}`);
    const user = (await this.usersService.findOne(email)) as any;
    if (!user) {
      console.log(`[AUTH] User not found: ${email}`);
      return null;
    }

    // 1. Brute-force protection: Check if locked out
    if (user.lockoutUntil && new Date() < new Date(user.lockoutUntil)) {
      throw new ForbiddenException(
        `Account is locked until ${user.lockoutUntil.toLocaleTimeString()}. Too many failed attempts.`,
      );
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
          lastLoginAt: new Date(),
        });

        const { password, userRole, customPermissions, ...userData } = user;

        // Flatten permissions
        const rolePerms =
          userRole?.permissions?.map((p: any) => p.permission.code) || [];
        const userPerms =
          customPermissions?.map((p: any) => p.permission.code) || [];
        const allPerms = Array.from(new Set([...rolePerms, ...userPerms]));

        return {
          ...userData,
          permissions: allPerms,
        };
      }
    }

    // 5. Failure: Update failed attempts
    const failedAttempts = user.failedLoginAttempts + 1;
    const lockoutUntil =
      failedAttempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null; // 15 min lockout after 5 attempts

    await this.usersService.updateLoginMetadata(user.id, {
      failedLoginAttempts: failedAttempts,
      lockoutUntil,
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

  async forgotPassword(
    email: string,
  ): Promise<{ message: string; debugToken?: string }> {
    const user = await this.prisma.user.findFirst({
      where: {
        email: {
          equals: email.toLowerCase().trim(),
          mode: 'insensitive',
        },
        isActive: true,
      },
    });

    if (!user) {
      throw new NotFoundException(
        'No account with that email address was found in our system.',
      );
    }

    // Generate a unique token valid for 30 minutes
    // We include user's password hash in the secret so the token becomes invalid
    // as soon as the password is changed (stateless invalidation)
    const secret = jwtConstants.secret + user.password;
    const token = this.jwtService.sign(
      { sub: user.id, email: user.email, type: 'reset' },
      { secret, expiresIn: '30m' },
    );

    // ── Email Service ────────────────────────────────────────────────────────
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}`;

    // We log it for local testing/debugging
    console.log(`[AUTH] Password reset link for ${user.email}: ${resetLink}`);

    // Send the actual email
    try {
      await this.mailService.sendPasswordResetEmail({
        to: user.email,
        resetLink,
      });
    } catch (error) {
      // Log the error but don't fail the request
      // This allows testing the flow via console logs even without SMTP creds
      console.warn(
        `[AUTH] Failed to send reset email to ${user.email}, but link was generated:`,
        error.message,
      );
    }
    // ────────────────────────────────────────────────────────────────────────

    return {
      message: 'Password reset instructions have been sent to your email.',
      debugToken: token, // Returning for demo purposes so you can use the link immediately
    };
  }

  async resetPassword(
    token: string,
    newPassword: any,
  ): Promise<{ message: string }> {
    // 1. Decrypt token enough to find the user (without verifying secret yet)
    const decoded = this.jwtService.decode(token);
    if (!decoded || !decoded.sub || decoded.type !== 'reset') {
      throw new UnauthorizedException('Invalid or malformed reset token.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: decoded.sub },
    });
    if (!user) {
      throw new NotFoundException('User no longer exists.');
    }

    // 2. Verify token using the composite secret
    try {
      this.jwtService.verify(token, {
        secret: jwtConstants.secret + user.password,
      });
    } catch (e) {
      throw new UnauthorizedException(
        'Reset link has expired or has already been used.',
      );
    }

    // 3. Update password (clearing failed attempts/lockout as well)
    await this.usersService.updatePassword(user.id, newPassword);
    await this.usersService.updateLoginMetadata(user.id, {
      failedLoginAttempts: 0,
      lockoutUntil: null,
    });

    return {
      message: 'Your password has been successfully reset. You can now log in.',
    };
  }
}
