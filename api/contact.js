// Vercel serverless function: POST /api/contact
// Sends contact-form messages to your inbox using Resend (https://resend.com).
//
// Environment variables (set in Vercel → Project → Settings → Environment Variables):
//   RESEND_API_KEY      required  Your Resend API key (starts with "re_")
//   CONTACT_TO_EMAIL    required  Where messages are delivered (your email address)
//   CONTACT_FROM_EMAIL  optional  Sender, e.g. "Portfolio <hello@yourdomain.com>".
//                                 Defaults to Resend's test sender, which can only
//                                 deliver to the email you signed up to Resend with.

const MAX = { name: 100, email: 200, message: 5000 };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Simple in-memory rate limit (per warm instance): 5 requests / 10 minutes per IP.
const hits = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const windowMs = 10 * 60 * 1000;
  const list = (hits.get(ip) || []).filter((t) => now - t < windowMs);
  list.push(now);
  hits.set(ip, list);
  return list.length > 5;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body || '{}');
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let body;
  try {
    body = await readBody(req);
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  const name = String(body.name || '').trim();
  const email = String(body.email || '').trim();
  const message = String(body.message || '').trim();

  // Honeypot: bots fill the hidden "company" field. Pretend success.
  if (body.company) return res.status(200).json({ ok: true });

  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Name, email and message are required.' });
  }
  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'Please provide a valid email address.' });
  }
  if (name.length > MAX.name || email.length > MAX.email || message.length > MAX.message) {
    return res.status(400).json({ error: 'One of the fields is too long.' });
  }

  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  if (rateLimited(ip)) {
    return res.status(429).json({ error: 'Too many messages. Please try again later.' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO_EMAIL;
  const from = process.env.CONTACT_FROM_EMAIL || 'Portfolio <onboarding@resend.dev>';
  if (!apiKey || !to) {
    console.error('Missing RESEND_API_KEY or CONTACT_TO_EMAIL');
    return res.status(500).json({ error: 'Contact form is not configured yet.' });
  }

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: email,
        subject: `Portfolio message from ${name}`,
        text: `Name: ${name}\nEmail: ${email}\n\n${message}`,
        html: `<p><strong>Name:</strong> ${escapeHtml(name)}<br><strong>Email:</strong> ${escapeHtml(email)}</p><p style="white-space:pre-wrap">${escapeHtml(message)}</p>`,
      }),
    });

    if (!r.ok) {
      const detail = await r.text();
      console.error('Resend error', r.status, detail);
      return res.status(502).json({ error: 'Could not send the message.' });
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Send failed', err);
    return res.status(500).json({ error: 'Could not send the message.' });
  }
};
