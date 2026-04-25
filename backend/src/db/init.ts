import pool from './pool';
import fs from 'fs/promises';
import path from 'path';

const runSQLFile = async (filePath: string) => {
    try {
        const fullPath = path.join(__dirname, '..', '..', '..', filePath);
        const sql = await fs.readFile(fullPath, 'utf8');
        await pool.query(sql);
        console.log(`Successfully executed ${filePath}`);
    } catch (error) {
        console.error(`Error executing ${filePath}:`, error);
        throw error;
    }
};

const tableExists = async (tableName: string): Promise<boolean> => {
    const res = await pool.query(
        "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = $1)",
        [tableName]
    );
    return res.rows[0].exists;
};

export const initializeDatabase = async () => {
    try {
        console.log('Checking database state...');
        const hasBeenInitialized = await tableExists('processes');

        if (hasBeenInitialized) {
            console.log('Database already initialized. Skipping setup.');
            return;
        }

        console.log('Database not initialized. This should only happen if the docker-entrypoint scripts failed.');
        
    } catch (error) {
        console.error('Failed to check database initialization:', error);
        process.exit(1);
    }
};

// If run directly, initialize the database
if (require.main === module) {
    initializeDatabase().then(() => {
        console.log('Manual DB check finished.');
        pool.end();
    }).catch(err => {
        console.error('Manual DB check failed.', err);
        pool.end();
    });
}
