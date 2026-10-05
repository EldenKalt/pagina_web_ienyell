const fs = require('node:fs/promises');
const path = require('node:path');

const RESERVED = new Set(['id', 'status', 'referenceFiles', 'receivedAt', 'updatedAt']);
const STATUSES = new Set(['pending', 'reviewing', 'accepted', 'declined', 'closed']);
function plain(value) {
  return value !== null && typeof value === 'object'
    && [Object.prototype, null].includes(Object.getPrototypeOf(value));
}
function clean(value) {
  if (typeof value === 'string') return value.replace(/\u0000/g, '');
  if (Array.isArray(value)) return value.map(clean);
  if (plain(value)) return Object.fromEntries(Object.entries(value).map(([key, item]) => [clean(key), clean(item)]));
  return value;
}
function text(value) { return typeof value === 'string' ? clean(value).trim() : ''; }
function date(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const result = new Date(value);
  return Number.isFinite(result.getTime()) ? result : null;
}
function stripReserved(payload) {
  return Object.fromEntries(Object.entries(payload).filter(([key]) => !RESERVED.has(key)));
}
function reportId(id, index) {
  return typeof id === 'string' && /^(COM|WL)-[A-Za-z0-9_-]{1,40}$/.test(id) ? id : `INVALID-ROW-${index + 1}`;
}
function validateCommissions(list) {
  if (!Array.isArray(list)) throw Object.assign(new Error('Invalid commission collection'), { code: 'INVALID_INPUT' });
  const result = { total: list.length, valid: [], invalidIds: [], normalizedStatusIds: [] };
  list.forEach((raw, index) => {
    const entry = plain(raw) ? clean(raw) : {};
    const contact = plain(entry.contact) ? entry.contact : entry;
    const name = text(contact.name) || text(entry.name);
    const email = (text(contact.email) || text(entry.email)).toLowerCase();
    const receivedAt = date(entry.receivedAt || entry.submittedAt);
    const updatedAt = entry.updatedAt ? date(entry.updatedAt) : null;
    if (!/^COM-[0-9A-F]{6}$/.test(entry.id) || !name || !email || !receivedAt || (entry.updatedAt && !updatedAt)) {
      result.invalidIds.push(reportId(entry.id, index)); return;
    }
    const status = STATUSES.has(entry.status) ? entry.status : 'pending';
    if (status !== entry.status) result.normalizedStatusIds.push(entry.id);
    const payload = stripReserved(entry);
    payload.contact = { ...contact, name, email };
    // Root metadata is removed even when it was used as the legacy contact fallback.
    payload.contact = stripReserved(payload.contact);
    result.valid.push({ id: entry.id, status, name, email, payload,
      referenceFiles: Array.isArray(entry.referenceFiles) ? entry.referenceFiles.filter((file) => typeof file === 'string') : [],
      receivedAt, updatedAt });
  });
  return result;
}
function validateWaitlist(list) {
  if (!Array.isArray(list)) throw Object.assign(new Error('Invalid waitlist collection'), { code: 'INVALID_INPUT' });
  const result = { total: list.length, valid: [], invalidIds: [], normalizedStatusIds: [] };
  list.forEach((raw, index) => {
    const entry = plain(raw) ? clean(raw) : {};
    const name = text(entry.name); const email = text(entry.email).toLowerCase();
    const receivedAt = date(entry.receivedAt || entry.registeredAt);
    if (!/^WL-[0-9A-F]{6}$/.test(entry.id) || !name || !email || !receivedAt) {
      result.invalidIds.push(reportId(entry.id, index)); return;
    }
    result.valid.push({ id: entry.id, name, email, terms: entry.terms === true,
      category: text(entry.category), newsletter: Boolean(entry.newsletter), reason: text(entry.reason),
      registeredAt: text(entry.registeredAt) || receivedAt.toISOString(), receivedAt });
  });
  return result;
}
function summary(result, existing) {
  return { total: result.total, valid: result.valid.length, invalid: result.invalidIds.length,
    invalidIds: result.invalidIds, normalizedStatusIds: result.normalizedStatusIds,
    ...(existing && { missingIds: result.valid.map((row) => row.id).filter((id) => !existing.has(id)) }) };
}
async function runImport({ prisma, commissions, waitlist, apply = false, skipInvalid = false, log = console.log }) {
  try {
    const commissionData = validateCommissions(commissions);
    const waitlistData = validateWaitlist(waitlist);
    let existing;
    if (prisma) {
      const ids = await Promise.all([prisma.commissionRequest.findMany({ select: { id: true } }), prisma.waitlistEntry.findMany({ select: { id: true } })]);
      existing = ids.map((rows) => new Set(rows.map((row) => row.id)));
    }
    const report = { commissions: summary(commissionData, existing?.[0]), waitlist: summary(waitlistData, existing?.[1]) };
    log(report);
    if (!apply) return { exitCode: 0, ...report };
    if (!skipInvalid && (commissionData.invalidIds.length || waitlistData.invalidIds.length)) {
      return { exitCode: 1, ...report };
    }
    if (!prisma) throw Object.assign(new Error('Prisma is required'), { code: 'NO_PRISMA' });
    const [commissionResult, waitlistResult] = await prisma.$transaction([
      prisma.commissionRequest.createMany({ data: commissionData.valid, skipDuplicates: true }),
      prisma.waitlistEntry.createMany({ data: waitlistData.valid, skipDuplicates: true }),
    ]);
    const inserted = { commissions: commissionResult.count, waitlist: waitlistResult.count };
    const skipped = { commissions: commissionData.total - commissionResult.count, waitlist: waitlistData.total - waitlistResult.count };
    log({ inserted, skipped });
    return { exitCode: 0, ...report, inserted, skipped };
  } catch (error) {
    log({ code: error?.code }); return { exitCode: 1, errorCode: error?.code };
  }
}
function commissionResponse(row) {
  const payload = stripReserved(plain(row.payload) ? row.payload : {});
  return { ...payload, id: row.id, status: row.status,
    contact: plain(payload.contact) ? payload.contact : { name: row.name, email: row.email },
    referenceFiles: row.referenceFiles, receivedAt: new Date(row.receivedAt).toISOString(),
    ...(row.updatedAt && { updatedAt: new Date(row.updatedAt).toISOString() }) };
}
function waitlistResponse(row) {
  return { id: row.id, category: row.category, name: row.name, email: row.email, terms: row.terms,
    newsletter: row.newsletter, reason: row.reason, registeredAt: row.registeredAt,
    receivedAt: new Date(row.receivedAt).toISOString() };
}
async function runExport({ prisma, targetDir, log = console.log }) {
  try {
    await fs.mkdir(targetDir);
    const [commissions, waitlist] = await Promise.all([
      prisma.commissionRequest.findMany({ orderBy: { receivedAt: 'desc' } }),
      prisma.waitlistEntry.findMany({ orderBy: { receivedAt: 'desc' } }),
    ]);
    await fs.writeFile(path.join(targetDir, 'commissions.json'), `${JSON.stringify({ commissions: commissions.map(commissionResponse) }, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
    await fs.writeFile(path.join(targetDir, 'waitlist.json'), `${JSON.stringify({ waitlist: waitlist.map(waitlistResponse) }, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
    const exported = { commissions: commissions.length, waitlist: waitlist.length };
    log({ exported }); return { exitCode: 0, exported };
  } catch (error) {
    log({ code: error?.code }); return { exitCode: 1, errorCode: error?.code };
  }
}
// Argument parsing is side-effect free; file reads and the real client are CLI-only.
function main(argv) {
  const options = { apply: false, skipInvalid: false,
    commissionsFile: path.join(__dirname, '../../data/commissions.json'),
    waitlistFile: path.join(__dirname, '../../data/waitlist.json') };
  const fileFlags = { '--commissions-file': 'commissionsFile', '--waitlist-file': 'waitlistFile', '--export-to-json': 'targetDir' };
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    if (flag === '--apply') options.apply = true;
    else if (flag === '--skip-invalid') options.skipInvalid = true;
    else if (fileFlags[flag] && argv[i + 1] && !argv[i + 1].startsWith('--')) options[fileFlags[flag]] = path.resolve(argv[++i]);
    else throw Object.assign(new Error('Invalid command options'), { code: 'INVALID_ARGUMENTS' });
  }
  if (options.targetDir && (options.apply || options.skipInvalid)) throw Object.assign(new Error('Incompatible command options'), { code: 'INVALID_ARGUMENTS' });
  return options;
}
module.exports = { validateCommissions, validateWaitlist, runImport, runExport, main };

if (require.main === module) {
  (async () => {
    let prisma;
    try {
      const options = main(process.argv.slice(2));
      require('dotenv').config();
      prisma = require('../lib/prisma');
      if (options.targetDir) process.exitCode = (await runExport({ prisma, targetDir: options.targetDir })).exitCode;
      else {
        const [commissionFile, waitlistFile] = await Promise.all([
          fs.readFile(options.commissionsFile, 'utf8'), fs.readFile(options.waitlistFile, 'utf8'),
        ]);
        process.exitCode = (await runImport({ prisma, commissions: JSON.parse(commissionFile).commissions,
          waitlist: JSON.parse(waitlistFile).waitlist, apply: options.apply, skipInvalid: options.skipInvalid })).exitCode;
      }
    } catch (error) { console.log({ code: error?.code }); process.exitCode = 1; }
    finally { if (prisma) await prisma.$disconnect().catch(() => { process.exitCode = 1; }); }
  })();
}
