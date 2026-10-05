const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const { renderEmailLayout, sendEmail } = require('../utils/emailHelper');
const { buildFrontendUrl } = require('../utils/publicUrl');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const COOLDOWN_MS = 15 * 60 * 1000;
const CONFIRMATION_MS = 24 * 60 * 60 * 1000;
const TOKEN_OPTIONS = { algorithm: 'HS256', issuer: 'ienyell-newsletter', audience: 'ienyell-reader' };
const ACCEPTED = { success: true, message: 'If this address can receive mail, check its inbox for the next step.' };

function tokenSecret() {
  const secret = process.env.NEWSLETTER_TOKEN_SECRET || process.env.JWT_SECRET;
  if (!secret || Buffer.byteLength(secret, 'utf8') < 32) throw new Error('Newsletter token secret is not configured.');
  return secret;
}

function tokenHash(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function signToken(id, purpose, nonce, expiresIn) {
  return jwt.sign({ purpose, ...(nonce ? { nonce } : {}) }, tokenSecret(),
    { ...TOKEN_OPTIONS, subject: String(id), ...(expiresIn ? { expiresIn } : {}) });
}

function verifyToken(token, purpose) {
  if (typeof token !== 'string' || token.length > 1500) return null;
  try {
    const payload = jwt.verify(token, tokenSecret(), TOKEN_OPTIONS);
    const id = Number(payload.sub);
    if (payload.purpose !== purpose || !Number.isSafeInteger(id) || id < 1) return null;
    return { id, payload };
  } catch { return null; }
}

function actionLink(path, token) {
  return `${buildFrontendUrl(path)}?token=${encodeURIComponent(token)}`;
}

function mailLink(url, label) {
  // URLs contain only the configured site origin, a fixed path and URL-encoded JWT bytes.
  return `<a href="${url}" style="color:#e94560; font-weight:700;">${label}</a>`;
}

async function releaseFailedRequest(id, requestedAt, confirmationTokenHash) {
  await prisma.newsletterSubscriber.updateMany({
    where: { id, lastRequestAt: requestedAt },
    data: { lastRequestAt: null, ...(confirmationTokenHash ? {
      confirmationTokenHash: null, confirmationExpiresAt: null,
    } : {}) },
  });
}

async function subscribe(req, res, next) {
  try {
    res.set('Cache-Control', 'no-store');
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    if (email.length > 254 || !EMAIL_PATTERN.test(email))
      return res.status(400).json({ error: 'Enter a valid email address.' });

    const now = new Date();
    const availableBefore = new Date(now.getTime() - COOLDOWN_MS);
    let subscriber = await prisma.newsletterSubscriber.findUnique({ where: { email } });
    if (!subscriber) {
      try { subscriber = await prisma.newsletterSubscriber.create({ data: { email } }); }
      catch (error) {
        if (error.code !== 'P2002') throw error;
        subscriber = await prisma.newsletterSubscriber.findUnique({ where: { email } });
      }
    }
    if (!subscriber) throw new Error('Newsletter subscriber could not be loaded.');

    const active = Boolean(subscriber.confirmedAt && !subscriber.unsubscribedAt);
    const nonce = crypto.randomBytes(24).toString('base64url');
    const confirmToken = active ? null : signToken(subscriber.id, 'confirm', nonce, '24h');
    const confirmationTokenHash = confirmToken ? tokenHash(confirmToken) : null;
    const claimed = await prisma.newsletterSubscriber.updateMany({
      where: { id: subscriber.id, OR: [{ lastRequestAt: null }, { lastRequestAt: { lt: availableBefore } }] },
      data: { lastRequestAt: now, ...(!active ? {
        confirmationTokenHash, confirmationExpiresAt: new Date(now.getTime() + CONFIRMATION_MS),
        confirmedAt: null, unsubscribedAt: null,
      } : {}) },
    });
    if (!claimed.count) return res.status(201).json(ACCEPTED);

    const unsubscribeToken = signToken(subscriber.id, 'unsubscribe');
    const unsubscribeUrl = actionLink('/newsletter/unsubscribe', unsubscribeToken);
    const contentHtml = active
      ? `<p>This address is already subscribed to new article emails.</p><p>${mailLink(unsubscribeUrl, 'Unsubscribe')}</p>`
      : `<p>Confirm that you want to receive new article emails from Enyell. This link expires in 24 hours.</p>
         <p>${mailLink(actionLink('/newsletter/confirm', confirmToken), 'Confirm subscription')}</p>
         <p>If you did not request this, you can ignore this email or ${mailLink(unsubscribeUrl, 'cancel the request')}.</p>`;
    const sent = await sendEmail({ to: email, subject: active ? 'Your Enyell newsletter subscription' : 'Confirm your Enyell newsletter subscription',
      html: renderEmailLayout({ title: 'Enyell newsletter', contentHtml }) });
    if (!sent) {
      await releaseFailedRequest(subscriber.id, now, confirmationTokenHash);
      return res.status(503).json({ error: 'Email is temporarily unavailable. Please try again.' });
    }
    return res.status(201).json(ACCEPTED);
  } catch (error) { return next(error); }
}

async function confirm(req, res, next) {
  try {
    res.set('Cache-Control', 'no-store');
    const token = req.body?.token;
    const verified = verifyToken(token, 'confirm');
    if (!verified) return res.status(400).json({ error: 'This confirmation link is invalid or expired.' });
    const result = await prisma.newsletterSubscriber.updateMany({
      where: { id: verified.id, confirmationTokenHash: tokenHash(token), confirmationExpiresAt: { gt: new Date() },
        confirmedAt: null, unsubscribedAt: null },
      data: { confirmedAt: new Date(), confirmationTokenHash: null, confirmationExpiresAt: null },
    });
    if (!result.count) return res.status(400).json({ error: 'This confirmation link is invalid or expired.' });
    return res.json({ success: true });
  } catch (error) { return next(error); }
}

async function unsubscribe(req, res, next) {
  try {
    res.set('Cache-Control', 'no-store');
    const verified = verifyToken(req.body?.token, 'unsubscribe');
    if (!verified) return res.status(400).json({ error: 'This unsubscribe link is invalid.' });
    const result = await prisma.newsletterSubscriber.updateMany({
      where: { id: verified.id },
      data: { unsubscribedAt: new Date(), confirmationTokenHash: null, confirmationExpiresAt: null },
    });
    if (!result.count) return res.status(400).json({ error: 'This unsubscribe link is invalid.' });
    return res.json({ success: true });
  } catch (error) { return next(error); }
}

module.exports = { subscribe, confirm, unsubscribe };
