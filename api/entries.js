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
    if (!response.ok) {
      console.error('Giveaway upstream HTTP failure', {status: response.status});
      return res.status(502).json({ok: false, code: 'GOOGLE_HTTP_ERROR', message: 'The entry service is unavailable. Please contact the studio.'});
    }
    let result;
    try {
      result = await response.json();
    } catch {
      // Google login/permission/error pages are HTML, not our JSON API.
      console.error('Giveaway upstream returned non-JSON', {status: response.status, contentType: response.headers?.get('content-type')});
      return res.status(502).json({ok: false, code: 'GOOGLE_NON_JSON', message: 'The entry service returned an unexpected response. Please contact the studio.'});
    }
    if (!result || typeof result.ok !== 'boolean') {
      console.error('Giveaway upstream returned an invalid API response');
      return res.status(502).json({ok: false, code: 'GOOGLE_INVALID_RESPONSE', message: 'The entry service needs a configuration update. Please contact the studio.'});
    }
    return res.status(result.ok ? 200 : 400).json({ok: result.ok, message: result.message});
  } catch (error) {
    console.error('Giveaway upstream connection failed', {type: error?.name || 'Error'});
    // A timeout can occur after a write: do not automatically retry.
    return res.status(502).json({ok: false, message: 'We could not confirm your entry. Please try again. If it was saved, the duplicate check will let you know.'});
  }
};
