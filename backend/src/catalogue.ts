import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';

export type CatalogueProduct = { key: string; name: string; description: string; price: string; stock_quantity: number };
export class ProductValidationError extends Error {}

export function validateProduct(input: unknown, key = randomUUID()): CatalogueProduct {
 if (!input || typeof input !== 'object' || Array.isArray(input)) throw new ProductValidationError('A product object is required.');
 const value = input as Record<string, unknown>;
 const name = typeof value.name === 'string' ? value.name.trim() : '';
 const description = typeof value.description === 'string' ? value.description.trim() : '';
 if (name.length < 2 || name.length > 100) throw new ProductValidationError('Name must contain 2–100 characters.');
 if (!description || description.length > 1000) throw new ProductValidationError('Description must contain 1–1000 characters.');
 if ((typeof value.price !== 'string' && typeof value.price !== 'number') || !/^\d{1,8}(\.\d{1,2})?$/.test(String(value.price))) throw new ProductValidationError('Price must be between 0 and 99999999.99 with at most two decimal places.');
 const stock = value.stock_quantity;
 if (typeof stock !== 'number' || !Number.isInteger(stock) || stock < 0 || stock > 2147483647) throw new ProductValidationError('Stock must be a non-negative whole number.');
 if (!/^[a-z0-9][a-z0-9_-]{0,79}$/.test(key)) throw new ProductValidationError('Invalid product key.');
 return { key, name, description, price: Number(value.price).toFixed(2), stock_quantity: stock };
}

export function validateCatalogue(input: unknown): CatalogueProduct[] {
 if (!Array.isArray(input) || input.length < 1 || input.length > 500) throw new ProductValidationError('Catalogue must contain 1–500 products.');
 const keys = new Set<string>();
 const names = new Set<string>();
 return input.map(value => {
  if (!value || typeof value.key !== 'string') throw new ProductValidationError('Every catalogue product needs a key.');
  const product = validateProduct(value, value.key);
  if (keys.has(product.key) || names.has(product.name.toLowerCase())) throw new ProductValidationError('Duplicate product key or name.');
  keys.add(product.key); names.add(product.name.toLowerCase());
  return product;
 });
}

export function readCatalogue(): CatalogueProduct[] {
 return validateCatalogue(JSON.parse(fs.readFileSync(path.resolve(__dirname, '../catalogue/products.json'), 'utf8')));
}

export function appendProduct(catalogue: CatalogueProduct[], product: CatalogueProduct): CatalogueProduct[] {
 return validateCatalogue([...catalogue, product]);
}

export async function synchronizeCatalogue(pool: Pool): Promise<void> {
 const products = readCatalogue();
 const client = await pool.connect();
 try {
  await client.query('BEGIN');
  await client.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS catalogue_key TEXT');
  await client.query('CREATE UNIQUE INDEX IF NOT EXISTS products_catalogue_key_unique ON products(catalogue_key)');
  for (const product of products) {
   await client.query('UPDATE products SET catalogue_key = $1 WHERE catalogue_key IS NULL AND name = $2', [product.key, product.name]);
   await client.query('INSERT INTO products (catalogue_key,name,description,price,stock_quantity) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (catalogue_key) DO UPDATE SET name=EXCLUDED.name,description=EXCLUDED.description,price=EXCLUDED.price,stock_quantity=EXCLUDED.stock_quantity', [product.key, product.name, product.description, product.price, product.stock_quantity]);
  }
  await client.query('COMMIT');
 } catch (error) { await client.query('ROLLBACK'); throw error; }
 finally { client.release(); }
}
