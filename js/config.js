/* AMAMB — runtime configuration (public anon key, safe to ship) */

/* Safe storage — localStorage can throw (opaque origins, private mode) */
function storageGet(key) { try { return window.localStorage.getItem(key); } catch (e) { return null; } }
function storageSet(key, value) { try { window.localStorage.setItem(key, value); return true; } catch (e) { return false; } }
function storageRemove(key) { try { window.localStorage.removeItem(key); return true; } catch (e) { return false; } }
function sessionGet(key) { try { return window.sessionStorage.getItem(key); } catch (e) { return null; } }
function sessionSet(key, value) { try { window.sessionStorage.setItem(key, value); return true; } catch (e) { return false; } }
function sessionRemove(key) { try { window.sessionStorage.removeItem(key); return true; } catch (e) { return false; } }

const AMAMB_CONFIG = {
  SUPABASE_URL: "https://mxseuwlhhkqkpgofecoa.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14c2V1d2xoaGtxa3Bnb2ZlY29hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM1MTkwMzcsImV4cCI6MjEwOTA5NTAzN30.FIDldAqwaE5XlE_PF74p_lR88huAqzqJaO65L7ya6W0",
  SESSION_KEY: "amamb_session_v1",
  LANG_KEY: "amamb_lang",
  /* One-time email code after the password step (set false to disable) */
  OTP_REQUIRED: true
};
