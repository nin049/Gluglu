const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
const SALT_ROUNDS = 12;

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { name, email, password, username } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Tous les champs sont requis' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Le mot de passe doit faire au moins 8 caractères' });
  }
  if (username && !/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
    return res.status(400).json({ error: 'Le nom d\'utilisateur doit faire 3-20 caractères (lettres, chiffres, _)' });
  }

  try {
    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Cet email est déjà utilisé' });
    }
    if (username) {
      const [existingUser] = await db.query('SELECT id FROM users WHERE username = ?', [username.toLowerCase()]);
      if (existingUser.length > 0) {
        return res.status(409).json({ error: 'Ce nom d\'utilisateur est déjà pris' });
      }
    }

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
    const [result] = await db.query(
      'INSERT INTO users (name, email, username, password_hash) VALUES (?, ?, ?, ?)',
      [name, email, username ? username.toLowerCase() : null, password_hash]
    );

    const token = jwt.sign({ userId: result.insertId }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });

    res.status(201).json({
      token,
      user: { id: result.insertId, name, email, username: username?.toLowerCase() || null, intolerance_level: 'sensitive' },
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email et mot de passe requis' });
  }

  try {
    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, username: user.username || null, intolerance_level: user.intolerance_level || 'sensitive', active_group_id: user.active_group_id || null },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/auth/profile
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, name, email, username, intolerance_level, active_group_id FROM users WHERE id = ?',
      [req.userId]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Utilisateur non trouvé' });
    res.json({ user: rows[0] });
  } catch (err) {
    console.error('Profile get error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /api/auth/profile
router.put('/profile', authMiddleware, async (req, res) => {
  const { name, intolerance_level, expo_push_token, username } = req.body;
  const validLevels = ['strict', 'sensitive', 'avoiding'];

  if (intolerance_level && !validLevels.includes(intolerance_level)) {
    return res.status(400).json({ error: 'Niveau d\'intolérance invalide' });
  }
  if (username && !/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
    return res.status(400).json({ error: 'Le nom d\'utilisateur doit faire 3-20 caractères (lettres, chiffres, _)' });
  }

  try {
    if (username) {
      const [existing] = await db.query('SELECT id FROM users WHERE username = ? AND id != ?', [username.toLowerCase(), req.userId]);
      if (existing.length > 0) return res.status(409).json({ error: 'Ce nom d\'utilisateur est déjà pris' });
    }

    await db.query(
      'UPDATE users SET name = COALESCE(?, name), intolerance_level = COALESCE(?, intolerance_level), expo_push_token = COALESCE(?, expo_push_token), username = COALESCE(?, username) WHERE id = ?',
      [name || null, intolerance_level || null, expo_push_token || null, username ? username.toLowerCase() : null, req.userId]
    );
    const [rows] = await db.query(
      'SELECT id, name, email, username, intolerance_level, active_group_id FROM users WHERE id = ?',
      [req.userId]
    );
    res.json({ user: rows[0] });
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/auth/search?q=pseudo — recherche utilisateurs par username ou nom
router.get('/search', authMiddleware, async (req, res) => {
  const { q } = req.query;
  if (!q || q.trim().length < 2) return res.json({ users: [] });

  try {
    const term = `%${q.trim().toLowerCase()}%`;

    // Vérifie si la colonne username existe
    const [cols] = await db.query(`SHOW COLUMNS FROM users LIKE 'username'`);
    const hasUsername = cols.length > 0;

    let rows;
    if (hasUsername) {
      [rows] = await db.query(
        `SELECT id, name, username, intolerance_level
         FROM users
         WHERE (LOWER(IFNULL(username,'')) LIKE ? OR LOWER(name) LIKE ?) AND id != ?
         LIMIT 8`,
        [term, term, req.userId]
      );
    } else {
      [rows] = await db.query(
        `SELECT id, name, NULL as username, intolerance_level
         FROM users
         WHERE LOWER(name) LIKE ? AND id != ?
         LIMIT 8`,
        [term, req.userId]
      );
    }

    res.json({ users: rows });
  } catch (err) {
    console.error('Search error:', err.message);
    res.status(500).json({ error: 'Erreur serveur', detail: err.message });
  }
});

module.exports = router;

