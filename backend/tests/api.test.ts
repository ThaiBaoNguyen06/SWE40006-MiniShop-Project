import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const { query } = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock('../src/db', () => ({ pool: { query } }));
import app from '../src/app';

describe('MiniShop API', () => {
  beforeEach(() => { query.mockReset(); });
  afterEach(() => { vi.restoreAllMocks(); });

  it('returns the welcome message', async () => {
    const res = await request(app).get('/').expect(200).expect('Content-Type', /json/);
    expect(res.body).toEqual({ message: 'Welcome to the MiniShop API!' });
    expect(query).not.toHaveBeenCalled();
  });
  it('reports backend health without the database', async () => {
    const res = await request(app).get('/api/health').expect(200);
    expect(res.body).toEqual({ status: 'ok', application: 'MiniShop', service: 'backend', release: process.env.APP_RELEASE || 'development' });
    expect(query).not.toHaveBeenCalled();
  });
  it('reports successful database health', async () => {
    const time = new Date('2026-01-01T00:00:00.000Z');
    query.mockResolvedValueOnce({ rows: [{ current_time: time }] });
    const res = await request(app).get('/api/db-health').expect(200);
    expect(res.body).toEqual({ status: 'ok', database: 'connected', currentTime: time.toISOString() });
    expect(query).toHaveBeenCalledExactlyOnceWith('SELECT NOW() AS current_time');
  });
  it('returns a safe error when database health fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    query.mockRejectedValueOnce(new Error('private connection details'));
    const res = await request(app).get('/api/db-health').expect(500);
    expect(res.body).toEqual({ status: 'error', database: 'disconnected' });
  });
  it('returns products and their count', async () => {
    const products = [
      { id: 1, name: 'Keyboard', description: 'Mechanical keyboard', price: '99.00', stock_quantity: 5 },
      { id: 2, name: 'Mouse', description: 'Wireless mouse', price: '25.50', stock_quantity: 0 },
    ];
    query.mockResolvedValueOnce({ rows: products });
    const res = await request(app).get('/api/products').expect(200).expect('Content-Type', /json/);
    expect(res.body).toEqual({ status: 'ok', count: 2, products });
    expect(query).toHaveBeenCalledExactlyOnceWith('SELECT id, name, description, price, stock_quantity FROM products ORDER BY id');
  });
  it('returns an empty catalogue', async () => {
    query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).get('/api/products').expect(200);
    expect(res.body).toEqual({ status: 'ok', count: 0, products: [] });
  });
  it('returns a safe error when product retrieval fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    query.mockRejectedValueOnce(new Error('private SQL details'));
    const res = await request(app).get('/api/products').expect(500);
    expect(res.body).toEqual({ status: 'error', message: 'Unable to retrieve products.' });
  });
});
