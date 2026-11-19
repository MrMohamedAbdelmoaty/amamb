/* AMAMB — UI utilities */
const $ = (sel, root) => (root || document).querySelector(sel);
const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
const escapeHtml = s => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

function fmtDate(d) {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt)) return String(d);
  return dt.toLocaleDateString(getLang() === 'ar' ? 'ar-SA-u-ca-gregory' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
function todayISO() { return new Date().toISOString().slice(0, 10); }
function initials(name) {
  const parts = String(name || '?').trim().split(/\s+/);
  return ((parts[0] || '?')[0] + (parts[1] ? parts[1][0] : '')).toUpperCase();
}
function avg(arr) { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0; }
function pct1(x) { return Math.round((x || 0) * 10) / 10; }

/* ---------- Toast ---------- */
function toast(msg, type) {
  const root = $('#toastRoot');
  const el = document.createElement('div');
  el.className = 'toast' + (type ? ' ' + type : '');
  el.textContent = msg;
  root.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateY(8px)'; }, 3600);
  setTimeout(() => el.remove(), 4000);
}

/* ---------- Modal ---------- */
function openModal({ title, bodyHtml, footHtml, wide, onOpen }) {
  const root = $('#modalRoot');
  root.innerHTML = `
    <div class="modal-backdrop" id="modalBackdrop">
      <div class="modal${wide ? ' wide' : ''}" role="dialog" aria-modal="true">
        <div class="modal-head">
          <div class="modal-title">${escapeHtml(title || '')}</div>
          <button class="icon-btn" data-close-modal aria-label="Close">✕</button>
        </div>
        <div class="modal-body">${bodyHtml || ''}</div>
        ${footHtml ? `<div class="modal-foot">${footHtml}</div>` : ''}
      </div>
    </div>`;
  $('#modalBackdrop').addEventListener('click', e => { if (e.target.id === 'modalBackdrop') closeModal(); });
  $$('[data-close-modal]', root).forEach(b => b.addEventListener('click', closeModal));
  if (typeof onOpen === 'function') onOpen(root);
}
function closeModal() { $('#modalRoot').innerHTML = ''; }

function confirmModal(message, onConfirm, danger) {
  openModal({
    title: t('confirm'),
    bodyHtml: `<p style="font-size:.95rem">${escapeHtml(message)}</p>`,
    footHtml: `<button class="btn ghost" data-close-modal>${t('cancel')}</button>
               <button class="btn ${danger ? 'red' : 'primary'}" id="confirmYesBtn">${t('confirm')}</button>`,
    onOpen(root) {
      $('#confirmYesBtn', root).addEventListener('click', () => { closeModal(); onConfirm(); });
    }
  });
}

/* ---------- WhatsApp deep link ---------- */
function waLink(phone, message) {
  const p = String(phone || '').replace(/[^\d]/g, '');
  return 'https://wa.me/' + p + '?text=' + encodeURIComponent(message || '');
}

/* ---------- Print (PDF via browser) ---------- */
function printHtml(html) {
  const area = $('#printArea');
  area.innerHTML = html;
  window.print();
  setTimeout(() => { area.innerHTML = ''; }, 800);
}

/* ---------- Generic empty state ---------- */
function emptyState(msg) {
  return `<div class="card text-center muted" style="padding:2.5rem 1rem"><div style="font-size:2.2rem;margin-bottom:.4rem">🗂️</div>${escapeHtml(msg || t('noData'))}</div>`;
}

/* ---------- Audit log (who changed what) ---------- */
async function audit(action, entity, entityId, details) {
  try {
    const u = (typeof Session !== 'undefined' && Session.get && Session.get()) || null;
    await API.insert('audit_log', [{
      actor_id: u && u.id ? u.id : null,
      actor_email: u && u.email ? u.email : null,
      action: String(action || 'unknown'),
      entity: entity || null,
      entity_id: entityId || null,
      details: details || null
    }]);
  } catch (e) { /* audit must never break the app */ }
}
