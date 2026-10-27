import { describe, expect, it } from 'vitest';
import { validateProduct, validateCatalogue, appendProduct } from '../src/catalogue';
const valid = { name: 'Demo Speaker', description: 'Portable speaker', price: '25.50', stock_quantity: 3 };
describe('product validation', () => {
 it('normalizes product values and strips unexpected fields', () => {
  expect(validateProduct({ ...valid, name: '  Demo Speaker  ', price: 25, unexpected: 'ignored' }, 'demo-speaker')).toEqual({ key: 'demo-speaker', name: 'Demo Speaker', description: 'Portable speaker', price: '25.00', stock_quantity: 3 });
 });
 it.each([
  { ...valid, name: '' }, { ...valid, description: '' }, { ...valid, price: '-1' },
  { ...valid, price: '1.001' }, { ...valid, price: '100000000' }, { ...valid, stock_quantity: -1 },
  { ...valid, stock_quantity: 1.5 }, { ...valid, stock_quantity: '3' }, { ...valid, stock_quantity: 2147483648 },
 ])('rejects invalid product input %#', value => { expect(() => validateProduct(value)).toThrow(); });
 it('allows free products and zero stock', () => { expect(validateProduct({ ...valid, price: '0', stock_quantity: 0 }).price).toBe('0.00'); });
 it('rejects duplicate names without case sensitivity', () => {
  const first = validateProduct(valid, 'first');
  expect(() => appendProduct([first], validateProduct({ ...valid, name: 'demo speaker' }, 'second'))).toThrow('Duplicate');
 });
 it('rejects duplicate stable keys', () => { expect(() => validateCatalogue([validateProduct(valid, 'same'), validateProduct({ ...valid, name: 'Another Speaker' }, 'same')])).toThrow('Duplicate'); });
 it('rejects an empty catalogue', () => { expect(() => validateCatalogue([])).toThrow(); });
});
