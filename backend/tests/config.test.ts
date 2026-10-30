import { describe, expect, it } from 'vitest';
import { databaseUrl } from '../src/config';
describe('database configuration (unit)', () => {
 it.each([undefined, '', '   '])('rejects missing configuration: %s', value => {
  expect(() => databaseUrl(value)).toThrow('DATABASE_URL is not configured');
 });
 it.each(['postgres://user:pass@database:5432/minishop', 'postgresql://database/minishop'])('accepts PostgreSQL URL: %s', value => {
  expect(databaseUrl(value)).toBe(value);
 });
 it.each(['https://database/minishop', 'postgres://database/', 'invalid'])('rejects invalid database URL: %s', value => {
  expect(() => databaseUrl(value)).toThrow();
 });
});
