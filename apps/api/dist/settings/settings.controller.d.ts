import type { AuthUser } from '../common/auth-user';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto/settings.dto';
export declare class SettingsController {
    private readonly settingsService;
    constructor(settingsService: SettingsService);
    getSettings(): Promise<import("./settings.service").SystemSettingsData>;
    updateSettings(dto: UpdateSettingsDto, user: AuthUser): Promise<import("./settings.service").SystemSettingsData>;
}
