import crypto from 'node:crypto';
const cookieName = 'gg_session';
export function sign(userId, secret) { return `${userId}.${crypto.createHmac('sha256', secret).update(userId).digest('hex')}`; }
export function verify(token, secret) { if (!token?.includes('.')) return null; const [userId, signature] = token.split('.'); const expected = sign(userId, secret).split('.')[1]; return signature.length === expected.length && crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected)) ? userId : null; }
export function sessionOptions() { return { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 1000 * 60 * 60 * 24 * 7, path: '/' }; }
export { cookieName };
