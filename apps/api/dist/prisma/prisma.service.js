"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var PrismaService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const database_error_1 = require("./database-error");
const DATABASE_CHECK_MS = 2000;
function withTimeout(work, ms) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error('Database check timed out'));
        }, ms);
        work.then((value) => {
            clearTimeout(timer);
            resolve(value);
        }, (error) => {
            clearTimeout(timer);
            reject(error instanceof Error ? error : new Error('Unknown database error'));
        });
    });
}
function databaseErrorMessage(error) {
    return (0, database_error_1.redactDatabaseMessage)(error);
}
let PrismaService = PrismaService_1 = class PrismaService extends client_1.PrismaClient {
    logger = new common_1.Logger(PrismaService_1.name);
    connected = false;
    async onModuleInit() {
        try {
            await withTimeout(this.$connect(), DATABASE_CHECK_MS);
            this.connected = true;
            this.logger.log('Connected to PostgreSQL');
        }
        catch (error) {
            this.connected = false;
            this.logger.warn(`PostgreSQL is not available yet: ${databaseErrorMessage(error)}`);
        }
    }
    async onModuleDestroy() {
        try {
            await withTimeout(this.$disconnect(), DATABASE_CHECK_MS);
        }
        catch (error) {
            this.logger.warn(`Disconnect skipped: ${databaseErrorMessage(error)}`);
        }
        this.connected = false;
    }
    isConnected() {
        return this.connected;
    }
    async ping() {
        try {
            await withTimeout(this.$queryRaw `SELECT 1`, DATABASE_CHECK_MS);
            this.connected = true;
            return { connected: true, message: 'PostgreSQL reachable' };
        }
        catch (error) {
            this.connected = false;
            return { connected: false, message: databaseErrorMessage(error) };
        }
    }
};
exports.PrismaService = PrismaService;
exports.PrismaService = PrismaService = PrismaService_1 = __decorate([
    (0, common_1.Injectable)()
], PrismaService);
//# sourceMappingURL=prisma.service.js.map