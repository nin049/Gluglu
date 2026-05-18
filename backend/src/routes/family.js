const express = require('express');
const db = require('../db');
const authMiddleware = require('../middleware/auth');
const fetch = require('node-fetch');

const router = express.Router();

async function sendPushNotification(expoPushToken, title, body, data = {}) {
  if (!expoPushToken || !expoPushToken.startsWith('ExponentPushToken')) return;
  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ to: expoPushToken, title, body, data, sound: 'default' }),
    });
  } catch (err) {
    console.error('Push notification error:', err.message);
  }
}

// GET /api/family — liste des membres de la famille
router.get('/', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, name, intolerance_level, created_at FROM family_members WHERE user_id = ? ORDER BY created_at ASC',
      [req.userId]
    );
    res.json({ members: rows });
  } catch (err) {
    console.error('Family get error:', err.message);
    res.status(500).json({ error: 'Erreur lors de la récupération des membres' });
  }
});

// POST /api/family — ajouter un membre
router.post('/', authMiddleware, async (req, res) => {
  const { name, intolerance_level = 'sensitive' } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Le prénom est requis' });
  }
  const validLevels = ['strict', 'sensitive', 'avoiding'];
  if (!validLevels.includes(intolerance_level)) {
    return res.status(400).json({ error: 'Niveau d\'intolérance invalide' });
  }
  try {
    const [result] = await db.query(
      'INSERT INTO family_members (user_id, name, intolerance_level) VALUES (?, ?, ?)',
      [req.userId, name.trim(), intolerance_level]
    );
    res.status(201).json({
      member: { id: result.insertId, name: name.trim(), intolerance_level },
    });
  } catch (err) {
    console.error('Family add error:', err.message);
    res.status(500).json({ error: 'Erreur lors de l\'ajout du membre' });
  }
});

// PUT /api/family/:id — modifier un membre
router.put('/:id', authMiddleware, async (req, res) => {
  const { name, intolerance_level } = req.body;
  const { id } = req.params;
  try {
    const [rows] = await db.query(
      'SELECT id FROM family_members WHERE id = ? AND user_id = ?',
      [id, req.userId]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Membre introuvable' });

    await db.query(
      'UPDATE family_members SET name = ?, intolerance_level = ? WHERE id = ?',
      [name.trim(), intolerance_level, id]
    );
    res.json({ member: { id: Number(id), name: name.trim(), intolerance_level } });
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la mise à jour' });
  }
});

// DELETE /api/family/:id — supprimer un membre
router.delete('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await db.query(
      'DELETE FROM family_members WHERE id = ? AND user_id = ?',
      [id, req.userId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Membre introuvable' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Family delete error:', err.message);
    res.status(500).json({ error: 'Erreur lors de la suppression' });
  }
});

// POST /api/family/invite — inviter un utilisateur GluGlu par email
router.post('/invite', authMiddleware, async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email requis' });

  try {
    // Récupère le destinataire
    const [targets] = await db.query(
      'SELECT id, name, expo_push_token FROM users WHERE email = ?',
      [email.toLowerCase().trim()]
    );
    if (targets.length === 0) {
      return res.status(404).json({ error: 'Aucun utilisateur GluGlu avec cet email' });
    }
    const target = targets[0];
    if (target.id === req.userId) {
      return res.status(400).json({ error: 'Vous ne pouvez pas vous inviter vous-même' });
    }

    // Récupère l'expéditeur
    const [senders] = await db.query('SELECT name FROM users WHERE id = ?', [req.userId]);
    const senderName = senders[0]?.name || 'Quelqu\'un';

    // Insère ou ignore l'invitation
    await db.query(
      'INSERT IGNORE INTO family_invitations (from_user_id, to_user_id) VALUES (?, ?)',
      [req.userId, target.id]
    );

    // Envoie la notif push
    await sendPushNotification(
      target.expo_push_token,
      '👨‍👩‍👧 Invitation famille GluGlu',
      `${senderName} vous invite à rejoindre son groupe famille !`,
      { type: 'family_invite', from_user_id: req.userId }
    );

    res.json({ success: true, message: `Invitation envoyée à ${target.name}` });
  } catch (err) {
    console.error('Invite error:', err.message);
    res.status(500).json({ error: 'Erreur lors de l\'envoi de l\'invitation' });
  }
});

// GET /api/family/invitations — invitations reçues en attente
router.get('/invitations', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT fi.id, fi.from_user_id, u.name AS from_name, u.email AS from_email, fi.created_at
       FROM family_invitations fi
       JOIN users u ON fi.from_user_id = u.id
       WHERE fi.to_user_id = ? AND fi.status = 'pending'
       ORDER BY fi.created_at DESC`,
      [req.userId]
    );
    res.json({ invitations: rows });
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la récupération des invitations' });
  }
});

// POST /api/family/invitations/:id/accept
router.post('/invitations/:id/accept', authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    const [invs] = await db.query(
      'SELECT fi.*, u.name AS from_name FROM family_invitations fi JOIN users u ON fi.from_user_id = u.id WHERE fi.id = ? AND fi.to_user_id = ? AND fi.status = \'pending\'',
      [id, req.userId]
    );
    if (invs.length === 0) return res.status(404).json({ error: 'Invitation introuvable' });

    await db.query('UPDATE family_invitations SET status = ? WHERE id = ?', ['accepted', id]);

    // Ajoute l'invitant comme membre de la famille du destinataire
    const [me] = await db.query('SELECT name FROM users WHERE id = ?', [req.userId]);
    await db.query(
      'INSERT IGNORE INTO family_members (user_id, name, intolerance_level) VALUES (?, ?, ?)',
      [invs[0].from_user_id, me[0].name, 'sensitive']
    );

    res.json({ success: true });
  } catch (err) {
    console.error('Accept invite error:', err.message);
    res.status(500).json({ error: 'Erreur lors de l\'acceptation' });
  }
});

// POST /api/family/invitations/:id/decline
router.post('/invitations/:id/decline', authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    await db.query(
      'UPDATE family_invitations SET status = ? WHERE id = ? AND to_user_id = ?',
      ['declined', id, req.userId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors du refus' });
  }
});

module.exports = router;
