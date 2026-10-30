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
    const proxyHops = (0, production_env_1.trustProxyHops)(process.env);
    if (proxyHops !== false) {
        app.getHttpAdapter().getInstance().set('trust proxy', proxyHops);
    }
    const prefix = process.env.API_PREFIX ?? 'api/v1';
    app.setGlobalPrefix(prefix);
    const webOrigin = process.env.WEB_ORIGIN ?? 'http://localhost:5173';
    app.enableCors({
        origin: webOrigin,
        credentials: true,
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