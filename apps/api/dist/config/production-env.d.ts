export declare const SYSTEM_SEED_CONFIRMATION = "apply-system-seed";
export declare const RESTORE_CONFIRMATION = "restore-database";
export type StaffSeedAction = 'create' | 'reset' | 'keep';
export declare function productionEnvIssues(env: NodeJS.ProcessEnv): string[];
export declare function assertProductionEnvironment(env: NodeJS.ProcessEnv): void;
export declare function assertSystemSeedAllowed(env: NodeJS.ProcessEnv): void;
export declare function staffSeedAction(nodeEnv: string | undefined, accountExists: boolean): StaffSeedAction;
export declare function trustProxyHops(env: NodeJS.ProcessEnv): number | false;
export declare function swaggerEnabled(env: NodeJS.ProcessEnv): boolean;
