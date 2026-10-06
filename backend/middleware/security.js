const mongoose = require('mongoose');

// ---------- JWT secret (single source of truth) ----------
const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (secret && secret.length >= 16) return secret;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET env var must be set (min 16 chars) in production');
  }
  // Dev-only fallback; never used in production.
  return secret || 'dev_only_insecure_secret_change_me';
};

// ---------- Strip Mongo operators ($gt, $ne, ...) from user input ----------
const stripOperators = (value) => {
  if (Array.isArray(value)) return value.map(stripOperators);
  if (value && typeof value === 'object') {
    for (const key of Object.keys(value)) {
      if (key.startsWith('$') || key.includes('.')) delete value[key];
      else value[key] = stripOperators(value[key]);
    }
  }
  return value;
};
const mongoSanitize = (req, res, next) => {
  if (req.body) stripOperators(req.body);
  next();
};

// ---------- Return 404 for malformed :id params instead of CastError 400/500 ----------
const validateObjectIdParam = (req, res, next, id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).json({ message: 'Resource not found' });
  }
  next();
};

// ---------- Pick only allowed keys from an object (prevents mass assignment) ----------
const pick = (obj, keys) => {
  const out = {};
  for (const k of keys) if (obj && obj[k] !== undefined) out[k] = obj[k];
  return out;
};

// ---------- Simple in-memory rate limiter (no extra dependency) ----------
const rateLimit = ({ windowMs, max, message }) => {
  const hits = new Map();
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
  }, windowMs).unref();
  return (req, res, next) => {
    const key = req.ip;
    const now = Date.now();
    let entry = hits.get(key);
    if (!entry || entry.reset < now) {
      entry = { count: 0, reset: now + windowMs };
      hits.set(key, entry);
    }
    entry.count += 1;
    if (entry.count > max) {
      res.set('Retry-After', Math.ceil((entry.reset - now) / 1000));
      return res.status(429).json({ message: message || 'Too many requests, please try again later' });
    }
    next();
  };
};

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const isAdmin = (user) => !!user && String(user.role).toLowerCase() === 'admin';

module.exports = {
  getJwtSecret, mongoSanitize, validateObjectIdParam, pick, rateLimit,
  escapeRegex, EMAIL_RE, DATE_RE, isAdmin,
};
