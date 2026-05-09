/**
 * Unit tests for packages/server/src/utils/pagination.ts
 * Covers: parsePagination, buildPaginationMeta
 */

import {
  parsePagination,
  buildPaginationMeta,
} from '../../../../packages/server/src/utils/pagination';

// ---------------------------------------------------------------------------
// parsePagination
// ---------------------------------------------------------------------------
describe('parsePagination()', () => {
  it('returns defaults when no query is supplied', () => {
    const result = parsePagination({});
    expect(result.page).toBe(1);
    expect(result.limit).toBe(10);
    expect(result.offset).toBe(0);
  });

  it('parses numeric page and limit correctly', () => {
    const result = parsePagination({ page: 3, limit: 20 });
    expect(result.page).toBe(3);
    expect(result.limit).toBe(20);
    expect(result.offset).toBe(40); // (3-1) * 20
  });

  it('parses string values correctly', () => {
    const result = parsePagination({ page: '2', limit: '5' });
    expect(result.page).toBe(2);
    expect(result.limit).toBe(5);
    expect(result.offset).toBe(5); // (2-1) * 5
  });

  it('clamps page to minimum of 1 when 0 is given', () => {
    expect(parsePagination({ page: 0 }).page).toBe(1);
  });

  it('clamps negative page to 1', () => {
    expect(parsePagination({ page: -5 }).page).toBe(1);
  });

  it('clamps limit to minimum of 1 when 0 is given', () => {
    expect(parsePagination({ limit: 0 }).limit).toBe(1);
  });

  it('clamps limit to maximum of 100', () => {
    expect(parsePagination({ limit: 999 }).limit).toBe(100);
  });

  it('handles NaN page gracefully — falls back to 1', () => {
    expect(parsePagination({ page: 'abc' }).page).toBe(1);
  });

  it('handles NaN limit gracefully — falls back to 10', () => {
    expect(parsePagination({ limit: 'abc' }).limit).toBe(10);
  });

  it('calculates offset 0 for page 1', () => {
    expect(parsePagination({ page: 1, limit: 15 }).offset).toBe(0);
  });

  it('calculates correct offset for page 5, limit 10', () => {
    expect(parsePagination({ page: 5, limit: 10 }).offset).toBe(40);
  });
});

// ---------------------------------------------------------------------------
// buildPaginationMeta
// ---------------------------------------------------------------------------
describe('buildPaginationMeta()', () => {
  it('returns correct meta for a result that fits in one page', () => {
    const meta = buildPaginationMeta(5, 1, 10);
    expect(meta.total).toBe(5);
    expect(meta.totalPages).toBe(1);
    expect(meta.hasNextPage).toBe(false);
    expect(meta.hasPrevPage).toBe(false);
  });

  it('detects hasNextPage when more items exist beyond current page', () => {
    const meta = buildPaginationMeta(25, 1, 10);
    expect(meta.totalPages).toBe(3);
    expect(meta.hasNextPage).toBe(true);
    expect(meta.hasPrevPage).toBe(false);
  });

  it('detects hasPrevPage on page 2', () => {
    const meta = buildPaginationMeta(25, 2, 10);
    expect(meta.hasPrevPage).toBe(true);
    expect(meta.hasNextPage).toBe(true);
  });

  it('correctly marks last page — no next, has prev', () => {
    const meta = buildPaginationMeta(25, 3, 10);
    expect(meta.hasNextPage).toBe(false);
    expect(meta.hasPrevPage).toBe(true);
  });

  it('handles zero total items', () => {
    const meta = buildPaginationMeta(0, 1, 10);
    expect(meta.total).toBe(0);
    expect(meta.totalPages).toBe(0);
    expect(meta.hasNextPage).toBe(false);
  });

  it('handles total that is an exact multiple of limit', () => {
    const meta = buildPaginationMeta(20, 2, 10);
    expect(meta.totalPages).toBe(2);
    expect(meta.hasNextPage).toBe(false);
  });
});