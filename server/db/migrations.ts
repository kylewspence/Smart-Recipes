import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface Migration {
    version: string;
    name: string;
    up: string;
    down: string;
    timestamp: Date;
    checksum?: string;
}

export class MigrationManager {
    private migrationsPath: string;
    private tableName = 'schema_migrations';

    constructor(migrationsPath?: string) {
        this.migrationsPath = migrationsPath || path.join(__dirname, '../../database/migrations');
        this.ensureMigrationsDirectory();
    }

    /**
     * Initialize the migration system by creating the migrations table
     */
    async init(): Promise<void> {
        try {
            await db.query(`
        CREATE TABLE IF NOT EXISTS "${this.tableName}" (
          "version" VARCHAR(255) PRIMARY KEY,
          "name" VARCHAR(255) NOT NULL,
          "checksum" VARCHAR(64),
          "applied_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
          "execution_time_ms" INTEGER,
          "rollback_sql" TEXT
        );
        
        CREATE INDEX IF NOT EXISTS "idx_migrations_applied_at" 
        ON "${this.tableName}" ("applied_at");
      `);

            console.log('Migration system initialized successfully');
        } catch (error) {
            console.error('Failed to initialize migration system:', error);
            throw error;
        }
    }

    /**
     * Create a new migration file
     */
    async createMigration(name: string, upSql: string, downSql: string): Promise<string> {
        const timestamp = new Date().toISOString().replace(/[-:T]/g, '').split('.')[0];
        const version = `${timestamp}_${name.toLowerCase().replace(/\s+/g, '_')}`;
        const filename = `${version}.json`;
        const filepath = path.join(this.migrationsPath, filename);

        const migration: Migration = {
            version,
            name,
            up: upSql,
            down: downSql,
            timestamp: new Date(),
            checksum: this.calculateChecksum(upSql + downSql)
        };

        fs.writeFileSync(filepath, JSON.stringify(migration, null, 2));
        console.log(`Created migration: ${filename}`);
        return version;
    }

    /**
     * Get all available migration files
     */
    getAvailableMigrations(): Migration[] {
        if (!fs.existsSync(this.migrationsPath)) {
            return [];
        }

        const files = fs.readdirSync(this.migrationsPath)
            .filter(file => file.endsWith('.json'))
            .sort();

        return files.map(file => {
            const filepath = path.join(this.migrationsPath, file);
            const content = fs.readFileSync(filepath, 'utf8');
            return JSON.parse(content) as Migration;
        });
    }

    /**
     * Get applied migrations from database
     */
    async getAppliedMigrations(): Promise<Array<{ version: string; applied_at: Date }>> {
        try {
            const result = await db.query(`
        SELECT "version", "applied_at" 
        FROM "${this.tableName}" 
        ORDER BY "applied_at" ASC
      `);
            return result.rows;
        } catch (error) {
            // If table doesn't exist, return empty array
            if (error.code === '42P01') {
                return [];
            }
            throw error;
        }
    }

    /**
     * Get pending migrations
     */
    async getPendingMigrations(): Promise<Migration[]> {
        const available = this.getAvailableMigrations();
        const applied = await this.getAppliedMigrations();
        const appliedVersions = new Set(applied.map(m => m.version));

        return available.filter(migration => !appliedVersions.has(migration.version));
    }

    /**
     * Run a single migration
     */
    async runMigration(migration: Migration): Promise<void> {
        const startTime = Date.now();
        const client = await db.connect();

        try {
            await client.query('BEGIN');

            // Execute the migration
            await client.query(migration.up);

            // Record the migration
            await client.query(`
        INSERT INTO "${this.tableName}" 
        ("version", "name", "checksum", "execution_time_ms", "rollback_sql")
        VALUES ($1, $2, $3, $4, $5)
      `, [
                migration.version,
                migration.name,
                migration.checksum || this.calculateChecksum(migration.up + migration.down),
                Date.now() - startTime,
                migration.down
            ]);

            await client.query('COMMIT');
            console.log(`✅ Applied migration: ${migration.version} - ${migration.name}`);
        } catch (error) {
            await client.query('ROLLBACK');
            console.error(`❌ Failed to apply migration: ${migration.version}`, error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Run all pending migrations
     */
    async migrate(): Promise<void> {
        await this.init();
        const pending = await this.getPendingMigrations();

        if (pending.length === 0) {
            console.log('No pending migrations');
            return;
        }

        console.log(`Running ${pending.length} pending migration(s)...`);

        for (const migration of pending) {
            await this.runMigration(migration);
        }

        console.log('All migrations completed successfully');
    }

    /**
     * Rollback the last migration
     */
    async rollback(steps: number = 1): Promise<void> {
        const applied = await this.getAppliedMigrations();

        if (applied.length === 0) {
            console.log('No migrations to rollback');
            return;
        }

        const toRollback = applied.slice(-steps).reverse();

        for (const migration of toRollback) {
            await this.rollbackMigration(migration.version);
        }
    }

    /**
     * Rollback a specific migration
     */
    async rollbackMigration(version: string): Promise<void> {
        const client = await db.connect();

        try {
            // Get the rollback SQL
            const result = await client.query(`
        SELECT "rollback_sql", "name" 
        FROM "${this.tableName}" 
        WHERE "version" = $1
      `, [version]);

            if (result.rows.length === 0) {
                throw new Error(`Migration ${version} not found in applied migrations`);
            }

            const { rollback_sql, name } = result.rows[0];

            if (!rollback_sql) {
                throw new Error(`No rollback SQL available for migration ${version}`);
            }

            await client.query('BEGIN');

            // Execute rollback
            await client.query(rollback_sql);

            // Remove from migrations table
            await client.query(`
        DELETE FROM "${this.tableName}" 
        WHERE "version" = $1
      `, [version]);

            await client.query('COMMIT');
            console.log(`✅ Rolled back migration: ${version} - ${name}`);
        } catch (error) {
            await client.query('ROLLBACK');
            console.error(`❌ Failed to rollback migration: ${version}`, error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Get migration status
     */
    async getStatus(): Promise<{
        applied: number;
        pending: number;
        latest?: string;
        migrations: Array<{
            version: string;
            name: string;
            status: 'applied' | 'pending';
            applied_at?: Date;
        }>;
    }> {
        const available = this.getAvailableMigrations();
        const applied = await this.getAppliedMigrations();
        const appliedVersions = new Set(applied.map(m => m.version));

        const migrations = available.map(migration => {
            const isApplied = appliedVersions.has(migration.version);
            const appliedInfo = applied.find(a => a.version === migration.version);

            return {
                version: migration.version,
                name: migration.name,
                status: isApplied ? 'applied' as const : 'pending' as const,
                applied_at: appliedInfo?.applied_at
            };
        });

        return {
            applied: applied.length,
            pending: available.length - applied.length,
            latest: applied.length > 0 ? applied[applied.length - 1].version : undefined,
            migrations
        };
    }

    /**
     * Validate migration checksums
     */
    async validateMigrations(): Promise<{ valid: boolean; errors: string[] }> {
        const errors: string[] = [];
        const applied = await this.getAppliedMigrations();

        for (const appliedMigration of applied) {
            try {
                const migrationFile = this.getAvailableMigrations()
                    .find(m => m.version === appliedMigration.version);

                if (!migrationFile) {
                    errors.push(`Migration file not found for applied migration: ${appliedMigration.version}`);
                    continue;
                }

                // Get stored checksum
                const result = await db.query(`
          SELECT "checksum" FROM "${this.tableName}" 
          WHERE "version" = $1
        `, [appliedMigration.version]);

                if (result.rows.length > 0) {
                    const storedChecksum = result.rows[0].checksum;
                    const currentChecksum = this.calculateChecksum(migrationFile.up + migrationFile.down);

                    if (storedChecksum && storedChecksum !== currentChecksum) {
                        errors.push(`Checksum mismatch for migration ${appliedMigration.version}`);
                    }
                }
            } catch (error) {
                errors.push(`Error validating migration ${appliedMigration.version}: ${error.message}`);
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Reset database to clean state (DANGEROUS - use only in development)
     */
    async reset(): Promise<void> {
        if (process.env.NODE_ENV === 'production') {
            throw new Error('Database reset is not allowed in production');
        }

        await db.query('DROP SCHEMA "public" CASCADE');
        await db.query('CREATE SCHEMA "public"');
        console.log('Database reset completed');
    }

    private ensureMigrationsDirectory(): void {
        if (!fs.existsSync(this.migrationsPath)) {
            fs.mkdirSync(this.migrationsPath, { recursive: true });
        }
    }

    private calculateChecksum(content: string): string {
        // Simple checksum calculation - in production, use crypto.createHash
        return Buffer.from(content).toString('base64').slice(0, 32);
    }
}

// Export singleton instance
export const migrationManager = new MigrationManager();

// CLI utilities
export async function runMigrations() {
    try {
        await migrationManager.migrate();
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

export async function rollbackMigrations(steps: number = 1) {
    try {
        await migrationManager.rollback(steps);
        process.exit(0);
    } catch (error) {
        console.error('Rollback failed:', error);
        process.exit(1);
    }
}

export async function getMigrationStatus() {
    try {
        const status = await migrationManager.getStatus();
        console.log('Migration Status:');
        console.log(`Applied: ${status.applied}`);
        console.log(`Pending: ${status.pending}`);
        console.log(`Latest: ${status.latest || 'None'}`);
        console.log('\nMigrations:');

        status.migrations.forEach(m => {
            const statusIcon = m.status === 'applied' ? '✅' : '⏳';
            const appliedAt = m.applied_at ? ` (${m.applied_at.toISOString()})` : '';
            console.log(`${statusIcon} ${m.version} - ${m.name}${appliedAt}`);
        });

        process.exit(0);
    } catch (error) {
        console.error('Failed to get migration status:', error);
        process.exit(1);
    }
} 