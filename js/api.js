/* AMAMB — Supabase REST client + password hashing + session */

/* ---------- Pure-JS SHA-256 (geraintluff, public domain) ---------- */
function sha256Sync(ascii) {
  function rightRotate(value, amount) { return (value >>> amount) | (value << (32 - amount)); }
  var mathPow = Math.pow, maxWord = mathPow(2, 32), lengthProperty = 'length', i, j;
  var result = '';
  var words = [], asciiBitLength = ascii[lengthProperty] * 8;
  var hash = sha256Sync.h = sha256Sync.h || [];
  var k = sha256Sync.k = sha256Sync.k || [];
  var primeCounter = k[lengthProperty], isComposite = {};
  for (var candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (i = 0; i < 313; i += candidate) isComposite[i] = candidate;
      hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
      k[primeCounter] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
      primeCounter++;
    }
  }
  ascii += '\x80';
  while ((ascii[lengthProperty] % 64) - 56) ascii += '\x00';
  for (i = 0; i < ascii[lengthProperty]; i++) {
    j = ascii.charCodeAt(i);
    if (j >> 8) return ''; // ASCII only
    words[i >> 2] |= j << (((3 - i) % 4) * 8);
  }
  words[words[lengthProperty]] = ((asciiBitLength / maxWord) | 0);
  words[words[lengthProperty]] = (asciiBitLength);
  for (j = 0; j < words[lengthProperty];) {
    var w = words.slice(j, j += 16), oldHash = hash;
    hash = hash.slice(0, 8);
    for (i = 0; i < 64; i++) {
      var w15 = w[i - 15], w2 = w[i - 2];
      var a = hash[0], e = hash[4];
      var temp1 = hash[7]
        + (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25))
        + ((e & hash[5]) ^ ((~e) & hash[6]))
        + k[i]
        + (w[i] = (i < 16) ? w[i] : (
            w[i - 16]
            + (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3))
            + w[i - 7]
            + (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))
          ) | 0
        );
      var temp2 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22))
        + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
      hash = [(temp1 + temp2) | 0].concat(hash);
      hash[4] = (hash[4] + temp1) | 0;
    }
    for (i = 0; i < 8; i++) hash[i] = (hash[i] + oldHash[i]) | 0;
  }
  for (i = 0; i < 8; i++) {
    for (j = 3; j + 1; j--) {
      var b = (hash[i] >> (j * 8)) & 255;
      result += ((b < 16) ? '0' : '') + b.toString(16);
    }
  }
  return result;
}

/* ---------- Phone helpers ---------- */
function normalizePhone(p) {
  let d = String(p || '').replace(/[^\d]/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  return d;
}
function isPhoneLike(v) {
  const t = String(v || '').trim();
  return /^\+?[0-9][0-9\s()-]{6,}$/.test(t);
}

/* ---------- PostgREST helpers ---------- */
const API = {
  base: AMAMB_CONFIG.SUPABASE_URL + '/rest/v1/',
  headers(prefer) {
    const h = {
      apikey: AMAMB_CONFIG.SUPABASE_ANON_KEY,
      Authorization: 'Bearer ' + AMAMB_CONFIG.SUPABASE_ANON_KEY,
      'Content-Type': 'application/json'
    };
    if (prefer) h.Prefer = prefer;
    return h;
  },
  async req(path, opts = {}) {
    const { method = 'GET', body, prefer } = opts;
    const res = await fetch(this.base + path, {
      method,
      headers: this.headers(prefer),
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error('DB ' + res.status + ': ' + t.slice(0, 300));
    }
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  },
  // table helpers -------------------------------------------------
  select(table, query) { return this.req(table + '?' + (query || 'select=*')); },
  // profiles: representation never includes password_hash (column is not readable by the anon role)
  SAFE_PROFILE_COLS: 'id,email,name,role,school_id,status',
  async insert(table, rows) {
    const q = table === 'profiles' ? '?select=' + this.SAFE_PROFILE_COLS : '';
    const out = await this.req(table + q, { method: 'POST', body: rows, prefer: 'return=representation' });
    return out;
  },
  async update(table, query, patch) {
    const q = table === 'profiles' ? '&select=' + this.SAFE_PROFILE_COLS : '';
    const out = await this.req(table + '?' + query + q, { method: 'PATCH', body: patch, prefer: 'return=representation' });
    return out;
  },
  async remove(table, query) {
    const out = await this.req(table + '?' + query, { method: 'DELETE', prefer: 'return=representation' });
    return out;
  },
  // auth -----------------------------------------------------------
  // Identifier = email OR phone. On success the app may require a one-time
  // code sent to the account email (AMAMB_CONFIG.OTP_REQUIRED).
  async login(identifier, password) {
    const hash = sha256Sync(password);
    const value = String(identifier || '').trim();
    const cols = 'select=id,email,name,role,school_id,phone,status';
    const query = isPhoneLike(value)
      ? cols + '&phone=eq.' + encodeURIComponent(normalizePhone(value)) + '&password_hash=eq.' + hash
      : cols + '&email=eq.' + encodeURIComponent(value.toLowerCase()) + '&password_hash=eq.' + hash;
    const rows = await this.select('profiles', query);
    if (!rows || !rows.length) throw new Error('INVALID_CREDENTIALS');
    const u = rows[0];
    if (u.status && u.status !== 'active') throw new Error('ACCOUNT_INACTIVE');
    if (u.role !== 'admin' && u.school_id) {
      const sch = await this.select('schools', 'select=id,name,subscription_status&id=eq.' + u.school_id);
      if (sch && sch.length && sch[0].subscription_status === 'suspended') {
        throw new Error('SCHOOL_SUSPENDED');
      }
      u.school_name = sch && sch.length ? sch[0].name : '';
    }
    return u;
  },
  async sendOtp(email) {
    const res = await fetch(AMAMB_CONFIG.SUPABASE_URL + '/auth/v1/otp', {
      method: 'POST',
      headers: Object.assign({ 'Content-Type': 'application/json' }, this.headers()),
      body: JSON.stringify({ email: String(email || '').trim().toLowerCase(), create_user: true })
    });
    if (!res.ok) throw new Error('OTP_SEND');
    return true;
  },
  async verifyOtp(email, token) {
    const res = await fetch(AMAMB_CONFIG.SUPABASE_URL + '/auth/v1/verify', {
      method: 'POST',
      headers: Object.assign({ 'Content-Type': 'application/json' }, this.headers()),
      body: JSON.stringify({ email: String(email || '').trim().toLowerCase(), token: String(token || '').trim(), type: 'email' })
    });
    return res.ok;
  }
};

/* ---------- Session ---------- */
const Session = {
  get() {
    try { return JSON.parse(storageGet(AMAMB_CONFIG.SESSION_KEY) || 'null'); }
    catch (e) { return null; }
  },
  set(user) { storageSet(AMAMB_CONFIG.SESSION_KEY, JSON.stringify(user)); },
  clear() { storageRemove(AMAMB_CONFIG.SESSION_KEY); }
};
