"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const express_1 = require("express");
if (!process.env.GEMINI_API_KEY) {
    console.warn('WARNING: GEMINI_API_KEY is not set in the environment.');
}
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.enableCors({
        origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://10.215.54.193:3000', 'http://10.215.54.193:3001'],
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
        credentials: true,
    });
    app.use((0, express_1.json)({ limit: '50mb' }));
    app.use((0, express_1.urlencoded)({ limit: '50mb', extended: true }));
    const port = process.env.PORT ?? 4000;
    await app.listen(port);
    console.log(`Backend is running on: http://0.0.0.0:${port}`);
}
console.log("!!! BACKEND RESTARTED - ROLES CONFIG UPDATE !!!");
bootstrap();
//# sourceMappingURL=main.js.map