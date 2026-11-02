module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ok: false, message: 'Method not allowed.'});
  }
  if (!String(req.headers['content-type'] || '').includes('application/json')) {
    return res.status(415).json({ok: false, message: 'Send JSON data.'});
  }
  const url = process.env.APPS_SCRIPT_URL;
  const secret = process.env.GIVEAWAY_API_SECRET;
  if (!url || !/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/.test(url) || !secret) {
    return res.status(503).json({ok: false, message: 'Entry registration is not configured yet.'});
  }
  let entry;
  try {
    entry = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (!entry || typeof entry !== 'object' || Array.isArray(entry) || JSON.stringify(entry).length > 4096) throw new Error('Invalid body');
  } catch {
    return res.status(400).json({ok: false, message: 'Invalid form data.'});
  }
  try {
    const response = await fetch(url, {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({secret, entry}), signal: AbortSignal.timeout(45000)
    });
    if (!response.ok) throw new Error('Google endpoint failed');
    const result = await response.json();
    if (typeof result.ok !== 'boolean') throw new Error('Invalid Google response');
    return res.status(result.ok ? 200 : 400).json({ok: result.ok, message: result.message});
  } catch {
    // A timeout can occur after a write: do not automatically retry.
    return res.status(502).json({ok: false, message: 'We could not confirm your entry. Please try again. If it was saved, the duplicate check will let you know.'});
  }
};
