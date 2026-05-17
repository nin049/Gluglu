const express = require('express');
const db = require('../db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// GET /api/scans/history
router.get('/history', authMiddleware, async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const offset = parseInt(req.query.offset) || 0;

  try {
    const [rows] = await db.query(
      `SELECT id, barcode, product_name, brand, risk_level, risk_score, ai_explanation, ingredients, allergens, image_url, suspect_ingredients, scanned_at
       FROM scans
       WHERE user_id = ?
       ORDER BY scanned_at DESC
       LIMIT ? OFFSET ?`,
      [req.userId, limit, offset]
    );

    res.json({ scans: rows });
  } catch (err) {
    console.error('History error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// DELETE /api/scans/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const [result] = await db.query(
      'DELETE FROM scans WHERE id = ? AND user_id = ?',
      [req.params.id, req.userId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Scan non trouvé' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Delete scan error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
