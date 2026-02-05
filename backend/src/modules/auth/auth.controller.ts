import { Controller, Request, Post, UseGuards, Get, Body, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from '../users/users.service';

@Controller('auth')
export class AuthController {
    constructor(
        private authService: AuthService,
        private usersService: UsersService
    ) { }

    @Post('login')
    async login(@Body() body: any) {
        const user = await this.authService.validateUser(body.email, body.password);
        if (!user) {
            throw new UnauthorizedException();
        }
        return this.authService.login(user);
    }

    @UseGuards(AuthGuard('jwt'))
    @Get('me')
    getProfile(@Request() req: any) {
        return req.user;
    }

    @UseGuards(AuthGuard('jwt'))
    @Post('update-password')
    async updatePassword(@Request() req: any, @Body() body: any) {
        if (!body.newPassword) {
            throw new BadRequestException('New password is required');
        }
        if (body.newPassword === req.user.email || body.newPassword === req.user.name) {
            throw new BadRequestException('Password cannot be your username or name');
        }
        return this.usersService.updatePassword(req.user.id, body.newPassword);
    }
}
