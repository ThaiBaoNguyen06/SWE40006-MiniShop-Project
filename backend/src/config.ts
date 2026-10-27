export function databaseUrl(value: string | undefined): string {
 if (!value?.trim()) throw new Error('DATABASE_URL is not configured');
 const parsed = new URL(value);
 if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) throw new Error('DATABASE_URL must use PostgreSQL');
 if (!parsed.hostname || !parsed.pathname || parsed.pathname === '/') throw new Error('DATABASE_URL needs a host and database');
 return value;
}
