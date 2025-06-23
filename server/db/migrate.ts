#!/usr/bin/env tsx

import { migrationManager, runMigrations, rollbackMigrations, getMigrationStatus } from './migrations.js';

const command = process.argv[2];
const args = process.argv.slice(3);

async function main() {
    switch (command) {
        case 'status':
            await getMigrationStatus();
            break;

        case 'migrate':
        case 'up':
            await runMigrations();
            break;

        case 'rollback':
        case 'down':
            const steps = parseInt(args[0]) || 1;
            await rollbackMigrations(steps);
            break;

        case 'create':
            const name = args[0];
            if (!name) {
                console.error('Migration name is required');
                console.log('Usage: tsx migrate.ts create <migration_name>');
                process.exit(1);
            }

            const upSql = args[1] || '-- Add your UP migration SQL here';
            const downSql = args[2] || '-- Add your DOWN migration SQL here';

            const version = await migrationManager.createMigration(name, upSql, downSql);
            console.log(`Migration created: ${version}`);
            console.log('Edit the migration file in database/migrations/ directory');
            break;

        case 'validate':
            const validation = await migrationManager.validateMigrations();
            if (validation.valid) {
                console.log('✅ All migrations are valid');
            } else {
                console.log('❌ Migration validation failed:');
                validation.errors.forEach(error => console.log(`  - ${error}`));
                process.exit(1);
            }
            break;

        case 'reset':
            if (process.env.NODE_ENV === 'production') {
                console.error('❌ Database reset is not allowed in production');
                process.exit(1);
            }

            console.log('⚠️  WARNING: This will completely reset the database!');
            console.log('Type "yes" to continue:');

            const readline = await import('readline');
            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });

            rl.question('', async (answer) => {
                if (answer.toLowerCase() === 'yes') {
                    await migrationManager.reset();
                    console.log('✅ Database reset completed');
                } else {
                    console.log('Reset cancelled');
                }
                rl.close();
                process.exit(0);
            });
            break;

        default:
            console.log('Smart Recipes Database Migration Tool');
            console.log('');
            console.log('Usage:');
            console.log('  tsx migrate.ts status           - Show migration status');
            console.log('  tsx migrate.ts migrate          - Run pending migrations');
            console.log('  tsx migrate.ts rollback [steps] - Rollback migrations (default: 1)');
            console.log('  tsx migrate.ts create <name>    - Create new migration');
            console.log('  tsx migrate.ts validate         - Validate migration checksums');
            console.log('  tsx migrate.ts reset            - Reset database (DEV ONLY)');
            console.log('');
            console.log('Examples:');
            console.log('  tsx migrate.ts create "add user profiles"');
            console.log('  tsx migrate.ts rollback 2');
            process.exit(command ? 1 : 0);
    }
}

main().catch(error => {
    console.error('Migration tool error:', error);
    process.exit(1);
}); 