"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const users_service_1 = require("../users/users.service");
const jwt_1 = require("@nestjs/jwt");
const bcrypt = require("bcrypt");
let AuthService = class AuthService {
    constructor(usersService, jwtService) {
        this.usersService = usersService;
        this.jwtService = jwtService;
    }
    async validateUser(email, pass) {
        const user = await this.usersService.findOne(email);
        if (!user)
            return null;
        if (user.lockoutUntil && new Date() < new Date(user.lockoutUntil)) {
            throw new common_1.ForbiddenException(`Account is locked until ${user.lockoutUntil.toLocaleTimeString()}. Too many failed attempts.`);
        }
        if (user.password) {
            let isMatch = false;
            try {
                isMatch = await bcrypt.compare(pass, user.password);
            }
            catch (e) {
                isMatch = false;
            }
            if (!isMatch && pass === user.password) {
                await this.usersService.updatePassword(user.id, pass);
                isMatch = true;
            }
            if (isMatch) {
                await this.usersService.updateLoginMetadata(user.id, {
                    failedLoginAttempts: 0,
                    lockoutUntil: null,
                    lastLoginAt: new Date()
                });
                const { password, userRole, customPermissions, ...userData } = user;
                const rolePerms = userRole?.permissions?.map((p) => p.permission.code) || [];
                const userPerms = customPermissions?.map((p) => p.permission.code) || [];
                const allPerms = Array.from(new Set([...rolePerms, ...userPerms]));
                return {
                    ...userData,
                    permissions: allPerms
                };
            }
        }
        const failedAttempts = user.failedLoginAttempts + 1;
        const lockoutUntil = failedAttempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null;
        await this.usersService.updateLoginMetadata(user.id, {
            failedLoginAttempts: failedAttempts,
            lockoutUntil
        });
        return null;
    }
    async login(user) {
        const payload = { username: user.email, sub: user.id, role: user.role };
        return {
            access_token: this.jwtService.sign(payload),
            user: user,
        };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        jwt_1.JwtService])
], AuthService);
//# sourceMappingURL=auth.service.js.map