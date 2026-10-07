import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import process from 'node:process';

const require = createRequire(import.meta.url);
const prismaPath = require.resolve('../lib/prisma.js');
const originalPrisma = require.cache[prismaPath];
const { validateCommissions, validateWaitlist, runImport, runExport, main } = require('./import-json-data.js');
let root; let prisma; let logs; let log;
function commission(overrides = {}) {
  return { id: 'COM-ABC123', status: 'pending', contact: { name: 'Synthetic Artist', email: 'Artist@Example.com' },
    terms: true, referenceFiles: ['synthetic.png'], receivedAt: '2026-01-01T00:00:00.000Z', ...overrides };
}
function waitlist(overrides = {}) {
  return { id: 'WL-ABC123', name: 'Synthetic Reader', email: 'Reader@Example.com', terms: true, newsletter: false,
    reason: 'Synthetic interest', category: 'art', registeredAt: '2026-01-01T00:00:00.000Z', ...overrides };
}
function database() {
  function model() {
    const rows = new Map();
    return { rows, findMany: vi.fn(async ({ select } = {}) => [...rows.values()].map((row) => select ? { id: row.id } : row)),
      createMany: vi.fn(({ data, skipDuplicates }) => async () => {
        let count = 0;
        for (const row of data) {
          if (skipDuplicates && rows.has(row.id)) continue;
          rows.set(row.id, structuredClone(row)); count += 1;
        }
        return { count };
      }) };
  }
  return { commissionRequest: model(), waitlistEntry: model(),
    $transaction: vi.fn(async (operations) => Promise.all(operations.map((operation) => operation()))) };
}
beforeEach(async () => {
  root = await fs.mkdtemp(path.join(tmpdir(), 'ienyell-json-import-'));
  prisma = database(); logs = []; log = (entry) => logs.push(entry);
});
afterEach(async () => { await fs.rm(root, { recursive: true, force: true }); });
describe('JSON import and export with synthetic data and injected Prisma', () => {
  it('I1 dry-run reports counts and missing ids using only id reads', async () => {
    const result = await runImport({ prisma, commissions: [commission()], waitlist: [waitlist()], log });
    expect(result).toMatchObject({ exitCode: 0, commissions: { total: 1, valid: 1, invalid: 0, missingIds: ['COM-ABC123'] },
      waitlist: { total: 1, valid: 1, invalid: 0, missingIds: ['WL-ABC123'] } });
    expect(prisma.commissionRequest.findMany).toHaveBeenCalledWith({ select: { id: true } });
    expect(prisma.waitlistEntry.findMany).toHaveBeenCalledWith({ select: { id: true } });
    expect(prisma.commissionRequest.createMany).not.toHaveBeenCalled(); expect(prisma.waitlistEntry.createMany).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
  it('I2 applies both collections in one transaction with skipDuplicates', async () => {
    const result = await runImport({ prisma, commissions: [commission()], waitlist: [waitlist()], apply: true, log });
    expect(result).toMatchObject({ exitCode: 0, inserted: { commissions: 1, waitlist: 1 }, skipped: { commissions: 0, waitlist: 0 } });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.$transaction.mock.calls[0][0]).toHaveLength(2);
    for (const model of [prisma.commissionRequest, prisma.waitlistEntry]) expect(model.createMany.mock.calls[0][0].skipDuplicates).toBe(true);
  });
  it('I3 a second apply inserts zero and the final dry-run has no missing ids', async () => {
    const input = { prisma, commissions: [commission()], waitlist: [waitlist()], log };
    await runImport({ ...input, apply: true });
    const second = await runImport({ ...input, apply: true });
    expect(second.inserted).toEqual({ commissions: 0, waitlist: 0 });
    const final = await runImport(input);
    expect(final.commissions.missingIds).toEqual([]); expect(final.waitlist.missingIds).toEqual([]);
  });
  it('I4 imports submittedAt as the legacy commission receivedAt', () => {
    const result = validateCommissions([commission({ receivedAt: undefined, submittedAt: '2026-02-01T00:00:00Z' })]);
    expect(result.valid[0].receivedAt.toISOString()).toBe('2026-02-01T00:00:00.000Z'); expect(result.invalidIds).toEqual([]);
  });
  it('I5 removes reserved keys and NUL throughout commission payloads and waitlist strings', () => {
    const original = commission({ updatedAt: '2026-02-01T00:00:00Z', arbitrary: { 'ke\u0000y': 'va\u0000lue' }, contact: { name: 'Synthetic\u0000 Artist', email: 'ARTIST@EXAM\u0000PLE.COM' } });
    const result = validateCommissions([original]);
    for (const key of ['id', 'status', 'referenceFiles', 'receivedAt', 'updatedAt']) expect(result.valid[0].payload).not.toHaveProperty(key);
    expect(result.valid[0].payload.arbitrary).toEqual({ key: 'value' });
    expect(result.valid[0].email).toBe('artist@example.com');
    expect(JSON.stringify(result.valid)).not.toContain('\\u0000');
    expect(original.arbitrary).toHaveProperty('ke\u0000y');
    expect(validateWaitlist([waitlist({ reason: 'a\u0000b' })]).valid[0].reason).toBe('ab');
  });
  it.each([commission({ id: 'COM-TEST' }), commission({ id: 'COM-111111', receivedAt: 'not-a-date' }),
    commission({ id: 'COM-222222', contact: { name: '', email: 'artist@example.com' } })])('I6 refuses invalid data and skips it only when requested (%j)', async (invalid) => {
    const input = { prisma, commissions: [commission(), invalid], waitlist: [waitlist()], apply: true, log };
    const refused = await runImport(input);
    expect(refused.exitCode).toBe(1); expect(refused.commissions.invalid).toBe(1);
    expect(prisma.$transaction).not.toHaveBeenCalled(); expect(prisma.commissionRequest.createMany).not.toHaveBeenCalled();
    const accepted = await runImport({ ...input, skipInvalid: true });
    expect(accepted.inserted).toEqual({ commissions: 1, waitlist: 1 });
  });
  it('I7 normalizes an unknown status to pending and reports the id', () => {
    const result = validateCommissions([commission({ status: 'weird' })]);
    expect(result.valid[0].status).toBe('pending'); expect(result.normalizedStatusIds).toEqual(['COM-ABC123']);
  });
  it('I8 logs only counts, safe ids and codes across every mode', async () => {
    const input = { prisma, commissions: [commission()], waitlist: [waitlist()], log };
    await runImport(input); await runImport({ ...input, apply: true });
    await runImport({ ...input, apply: true, commissions: [commission({ id: 'artist@example.com' })] });
    await runExport({ prisma, targetDir: path.join(root, 'export'), log });
    const output = JSON.stringify(logs);
    for (const privateValue of ['Synthetic Artist', 'Synthetic Reader', 'Artist@Example.com', 'Reader@Example.com', 'artist@example.com']) expect(output).not.toContain(privateValue);
    expect(output).toContain('INVALID-ROW-1');
  });
  it('I9 refuses an existing export directory without writing or querying', async () => {
    const targetDir = path.join(root, 'existing'); await fs.mkdir(targetDir);
    await fs.writeFile(path.join(targetDir, 'keep.txt'), 'synthetic sentinel');
    const result = await runExport({ prisma, targetDir, log });
    expect(result).toMatchObject({ exitCode: 1, errorCode: 'EEXIST' });
    expect(prisma.commissionRequest.findMany).not.toHaveBeenCalled();
    expect(await fs.readdir(targetDir)).toEqual(['keep.txt']);
    expect(await fs.readFile(path.join(targetDir, 'keep.txt'), 'utf8')).toBe('synthetic sentinel');
  });
  it('I9 exports a new UTF-8 legacy directory that reimports with the same ids', async () => {
    await runImport({ prisma, commissions: [commission()], waitlist: [waitlist()], apply: true, log });
    const targetDir = path.join(root, 'new');
    expect((await runExport({ prisma, targetDir, log })).exitCode).toBe(0);
    const commissionText = await fs.readFile(path.join(targetDir, 'commissions.json'), 'utf8');
    const waitlistText = await fs.readFile(path.join(targetDir, 'waitlist.json'), 'utf8');
    for (const content of [commissionText, waitlistText]) { expect(content.startsWith('\uFEFF')).toBe(false); expect(content.endsWith('\n')).toBe(true); }
    const roundtrip = await runImport({ commissions: JSON.parse(commissionText).commissions, waitlist: JSON.parse(waitlistText).waitlist, log });
    expect(roundtrip.commissions).toMatchObject({ total: 1, valid: 1, invalid: 0 });
    expect(roundtrip.waitlist).toMatchObject({ total: 1, valid: 1, invalid: 0 });
    expect(JSON.parse(commissionText).commissions[0].id).toBe('COM-ABC123');
    expect(JSON.parse(waitlistText).waitlist[0].id).toBe('WL-ABC123');
  });
  it('I10 contains a createMany failure to its code without logging its arguments', async () => {
    prisma.commissionRequest.createMany.mockImplementationOnce(() => async () => { throw Object.assign(new Error('SYNTH_SECRET_ARG'), { code: 'P9999' }); });
    const result = await runImport({ prisma, commissions: [commission()], waitlist: [waitlist()], apply: true, log });
    expect(result.exitCode).toBe(1); expect(logs.at(-1)).toEqual({ code: 'P9999' });
    expect(JSON.stringify(logs)).not.toContain('SYNTH_SECRET_ARG');
  });
  it('parses CLI options without loading the real client or reading default files', () => {
    const options = main(['--apply', '--skip-invalid', '--commissions-file', path.join(root, 'synthetic.json')]);
    expect(options).toMatchObject({ apply: true, skipInvalid: true });
    expect(options.commissionsFile).toBe(path.join(root, 'synthetic.json'));
    expect(require.cache[prismaPath]).toBe(originalPrisma);
    expect(process.env.DATABASE_URL).toContain('127.0.0.1:1/invalid');
    expect(() => main(['--unknown'])).toThrow('Invalid command options');
  });
});
