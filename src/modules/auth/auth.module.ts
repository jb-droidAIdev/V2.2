import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { jwtConstants, JwtStrategy } from './jwt.strategy';
import { PermissionsService } from './permissions/permissions.service';
import { PrismaService } from '../../prisma.service';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    UsersModule,
    MailModule,
    PassportModule,
    JwtModule.register({
      secret: jwtConstants.secret,
      signOptions: { expiresIn: '7d' },
    }),
  ],
  providers: [AuthService, JwtStrategy, PermissionsService, PrismaService],
  controllers: [AuthController],
  exports: [AuthService, PermissionsService],
})
export class AuthModule {}
