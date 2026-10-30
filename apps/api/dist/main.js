"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const swagger_1 = require("@nestjs/swagger");
const shared_1 = require("@zms/shared");
const helmet_1 = __importDefault(require("helmet"));
const app_module_1 = require("./app.module");
const production_env_1 = require("./config/production-env");
const validation_pipe_1 = require("./common/validation.pipe");
async function bootstrap() {
    (0, production_env_1.assertProductionEnvironment)(process.env);
    if (process.env.NODE_ENV === 'production') {
        common_1.Logger.log('Production configuration accepted', 'Bootstrap');
    }
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.enableShutdownHooks();
    app.use((0, helmet_1.default)({
        contentSecurityPolicy: false,
        crossOriginEmbedderPolicy: false,
    }));
    const proxyHops = (0, production_env_1.trustProxyHops)(process.env);
    if (proxyHops !== false) {
        app.getHttpAdapter().getInstance().set('trust proxy', proxyHops);
    }
    const prefix = process.env.API_PREFIX ?? 'api/v1';
    app.setGlobalPrefix(prefix);
    const webOrigin = process.env.WEB_ORIGIN ?? 'http://localhost:3000';
    app.enableCors({
        origin: (origin, callback) => {
            if (!origin)
                return callback(null, true);
            const allowedOrigins = [
                webOrigin,
                'http://localhost:3000',
                'http://localhost:3001',
                'http://localhost:5173',
                'http://127.0.0.1:3000',
                'http://127.0.0.1:3001',
            ];
            if (allowedOrigins.includes(origin) || origin.startsWith('http://localhost:')) {
                callback(null, true);
            }
            else {
                callback(new Error('Not allowed by CORS'));
            }
        },
        credentials: true,
        methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'x-zms-csrf'],
    });
    app.use((0, cookie_parser_1.default)());
    app.useGlobalPipes((0, validation_pipe_1.createValidationPipe)());
    if ((0, production_env_1.swaggerEnabled)(process.env)) {
        const swaggerConfig = new swagger_1.DocumentBuilder()
            .setTitle('ZMS API')
            .setDescription('ระบบจัดการซะกาต — ยืนยันตัวตน สิทธิ์ และทะเบียนผู้มีสิทธิ์ ผลคุณสมบัติมาจากการบันทึกของเจ้าหน้าที่')
            .setVersion(shared_1.APP_VERSION)
            .addBearerAuth()
            .build();
        const document = swagger_1.SwaggerModule.createDocument(app, swaggerConfig);
        swagger_1.SwaggerModule.setup('api/docs', app, document);
    }
    const port = Number(process.env.API_PORT ?? 3000);
    await app.listen(port);
}
void bootstrap();
//# sourceMappingURL=main.js.map