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

// GET /api/groups — mes groupes (créés + rejoints)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const [groups] = await db.query(
      `SELECT g.id, g.name, g.owner_id, g.created_at,
              (SELECT COUNT(*) FROM group_members gm WHERE gm.group_id = g.id AND gm.status = 'accepted') AS member_count,
              u.name AS owner_name
       FROM groups_table g
       JOIN users u ON g.owner_id = u.id
       WHERE g.owner_id = ?
          OR EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id = g.id AND gm.user_id = ? AND gm.status = 'accepted')
       ORDER BY g.created_at DESC`,
      [req.userId, req.userId]
    );

    const [userRows] = await db.query('SELECT active_group_id FROM users WHERE id = ?', [req.userId]);
    const activeGroupId = userRows[0]?.active_group_id || null;

    res.json({ groups, active_group_id: activeGroupId });
  } catch (err) {
    console.error('Groups list error:', err.message);
    res.status(500).json({ error: 'Erreur lors de la récupération des groupes' });
  }
});

// POST /api/groups — créer un groupe
router.post('/', authMiddleware, async (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Le nom du groupe est requis' });

  try {
    const [result] = await db.query(
      'INSERT INTO groups_table (name, owner_id) VALUES (?, ?)',
      [name.trim(), req.userId]
    );
    const groupId = result.insertId;

    // L'owner est automatiquement membre accepté
    await db.query(
      'INSERT INTO group_members (group_id, user_id, status) VALUES (?, ?, ?)',
      [groupId, req.userId, 'accepted']
    );

    // Si c'est le premier groupe, le définir comme actif
    const [existing] = await db.query('SELECT active_group_id FROM users WHERE id = ?', [req.userId]);
    if (!existing[0]?.active_group_id) {
      await db.query('UPDATE users SET active_group_id = ? WHERE id = ?', [groupId, req.userId]);
    }

    res.status(201).json({
      group: { id: groupId, name: name.trim(), owner_id: req.userId, member_count: 1 },
    });
  } catch (err) {
    console.error('Group create error:', err.message);
    res.status(500).json({ error: 'Erreur lors de la création du groupe' });
  }
});

// GET /api/groups/:id — détail + membres acceptés + invitations en attente
router.get('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    const [groupRows] = await db.query(
      'SELECT g.*, u.name AS owner_name FROM groups_table g JOIN users u ON g.owner_id = u.id WHERE g.id = ?',
      [id]
    );
    if (groupRows.length === 0) return res.status(404).json({ error: 'Groupe introuvable' });

    // Vérifier que l'utilisateur est membre ou owner
    const [accessRows] = await db.query(
      'SELECT id FROM group_members WHERE group_id = ? AND user_id = ?',
      [id, req.userId]
    );
    if (accessRows.length === 0 && groupRows[0].owner_id !== req.userId) {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    const [members] = await db.query(
      `SELECT u.id, u.name, u.username, u.intolerance_level, gm.status, gm.joined_at
       FROM group_members gm
       JOIN users u ON gm.user_id = u.id
       WHERE gm.group_id = ?
       ORDER BY gm.status ASC, gm.joined_at ASC`,
      [id]
    );

    res.json({ group: groupRows[0], members });
  } catch (err) {
    console.error('Group detail error:', err.message);
    res.status(500).json({ error: 'Erreur lors de la récupération du groupe' });
  }
});

// POST /api/groups/:id/invite — inviter par username
router.post('/:id/invite', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: 'Nom d\'utilisateur requis' });

  try {
    // Vérifier que l'invitant est owner ou membre
    const [groupRows] = await db.query('SELECT * FROM groups_table WHERE id = ?', [id]);
    if (groupRows.length === 0) return res.status(404).json({ error: 'Groupe introuvable' });

    const [accessRows] = await db.query(
      'SELECT id FROM group_members WHERE group_id = ? AND user_id = ? AND status = ?',
      [id, req.userId, 'accepted']
    );
    if (accessRows.length === 0 && groupRows[0].owner_id !== req.userId) {
      return res.status(403).json({ error: 'Vous ne faites pas partie de ce groupe' });
    }

    // Trouver l'utilisateur cible
    const [targetRows] = await db.query(
      'SELECT id, name, expo_push_token FROM users WHERE username = ?',
      [username.toLowerCase()]
    );
    if (targetRows.length === 0) return res.status(404).json({ error: `Aucun utilisateur avec le pseudo @${username}` });

    const target = targetRows[0];
    if (target.id === req.userId) return res.status(400).json({ error: 'Vous ne pouvez pas vous inviter vous-même' });

    // Vérifier si déjà membre
    const [existingMember] = await db.query(
      'SELECT id, status FROM group_members WHERE group_id = ? AND user_id = ?',
      [id, target.id]
    );
    if (existingMember.length > 0) {
      const status = existingMember[0].status;
      return res.status(400).json({ error: status === 'accepted' ? 'Cet utilisateur est déjà dans le groupe' : 'Une invitation est déjà en attente' });
    }

    // Créer l'invitation
    await db.query(
      'INSERT INTO group_members (group_id, user_id, status) VALUES (?, ?, ?)',
      [id, target.id, 'pending']
    );

    // Récupérer nom de l'invitant
    const [senderRows] = await db.query('SELECT name FROM users WHERE id = ?', [req.userId]);
    const senderName = senderRows[0]?.name || 'Quelqu\'un';

    // Push notif
    await sendPushNotification(
      target.expo_push_token,
      '👥 Invitation de groupe GluGlu',
      `${senderName} vous invite à rejoindre "${groupRows[0].name}" !`,
      { type: 'group_invite', group_id: Number(id) }
    );

    res.json({ success: true, message: `@${username} a été invité(e)` });
  } catch (err) {
    console.error('Invite error:', err.message);
    res.status(500).json({ error: 'Erreur lors de l\'invitation' });
  }
});

// GET /api/groups/invitations/pending — invitations reçues en attente
router.get('/invitations/pending', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT gm.id AS member_id, g.id AS group_id, g.name AS group_name,
              u.name AS owner_name, u.username AS owner_username, gm.joined_at
       FROM group_members gm
       JOIN groups_table g ON gm.group_id = g.id
       JOIN users u ON g.owner_id = u.id
       WHERE gm.user_id = ? AND gm.status = 'pending'
       ORDER BY gm.joined_at DESC`,
      [req.userId]
    );
    res.json({ invitations: rows });
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la récupération des invitations' });
  }
});

// POST /api/groups/invitations/:memberId/accept
router.post('/invitations/:memberId/accept', authMiddleware, async (req, res) => {
  const { memberId } = req.params;
  try {
    const [rows] = await db.query(
      'SELECT * FROM group_members WHERE id = ? AND user_id = ? AND status = ?',
      [memberId, req.userId, 'pending']
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Invitation introuvable' });

    await db.query('UPDATE group_members SET status = ? WHERE id = ?', ['accepted', memberId]);

    // Si pas de groupe actif, définir celui-ci comme actif
    const [userRows] = await db.query('SELECT active_group_id FROM users WHERE id = ?', [req.userId]);
    if (!userRows[0]?.active_group_id) {
      await db.query('UPDATE users SET active_group_id = ? WHERE id = ?', [rows[0].group_id, req.userId]);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Accept error:', err.message);
    res.status(500).json({ error: 'Erreur lors de l\'acceptation' });
  }
});

// POST /api/groups/invitations/:memberId/decline
router.post('/invitations/:memberId/decline', authMiddleware, async (req, res) => {
  const { memberId } = req.params;
  try {
    await db.query(
      'DELETE FROM group_members WHERE id = ? AND user_id = ? AND status = ?',
      [memberId, req.userId, 'pending']
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors du refus' });
  }
});

// PUT /api/groups/:id/setActive — définir le groupe actif
router.put('/:id/setActive', authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.query(
      'SELECT id FROM group_members WHERE group_id = ? AND user_id = ? AND status = ?',
      [id, req.userId, 'accepted']
    );
    if (rows.length === 0) {
      // Check if owner
      const [ownerRows] = await db.query('SELECT id FROM groups_table WHERE id = ? AND owner_id = ?', [id, req.userId]);
      if (ownerRows.length === 0) return res.status(403).json({ error: 'Vous n\'êtes pas membre de ce groupe' });
    }

    await db.query('UPDATE users SET active_group_id = ? WHERE id = ?', [id, req.userId]);
    res.json({ success: true, active_group_id: Number(id) });
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors du changement de groupe actif' });
  }
});

// DELETE /api/groups/:id/members/:userId — retirer un membre (owner seulement)
router.delete('/:id/members/:userId', authMiddleware, async (req, res) => {
  const { id, userId } = req.params;
  try {
    const [groupRows] = await db.query('SELECT owner_id FROM groups_table WHERE id = ?', [id]);
    if (groupRows.length === 0) return res.status(404).json({ error: 'Groupe introuvable' });

    const isOwner = groupRows[0].owner_id === req.userId;
    const isSelf = Number(userId) === req.userId;

    if (!isOwner && !isSelf) return res.status(403).json({ error: 'Non autorisé' });
    if (isOwner && groupRows[0].owner_id === Number(userId)) {
      return res.status(400).json({ error: 'Le propriétaire ne peut pas se retirer' });
    }

    await db.query('DELETE FROM group_members WHERE group_id = ? AND user_id = ?', [id, userId]);

    // Si c'était le groupe actif de l'utilisateur retiré, le désactiver
    await db.query(
      'UPDATE users SET active_group_id = NULL WHERE id = ? AND active_group_id = ?',
      [userId, id]
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la suppression du membre' });
  }
});

// DELETE /api/groups/:id — supprimer le groupe (owner seulement)
router.delete('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.query('SELECT owner_id FROM groups_table WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Groupe introuvable' });
    if (rows[0].owner_id !== req.userId) return res.status(403).json({ error: 'Seul le propriétaire peut supprimer le groupe' });

    // Désactiver ce groupe pour tous les membres
    await db.query('UPDATE users SET active_group_id = NULL WHERE active_group_id = ?', [id]);
    await db.query('DELETE FROM groups_table WHERE id = ?', [id]);

    res.json({ success: true });
  } catch (err) {
    console.error('Delete group error:', err.message);
    res.status(500).json({ error: 'Erreur lors de la suppression' });
  }
});

module.exports = router;
