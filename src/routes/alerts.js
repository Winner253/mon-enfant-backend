const express = require('express');
const db = require('../db/init');
const { authParent } = require('../middleware/auth');

const router = express.Router();
router.use(authParent);

function childBelongsToParent(childId, parentId) {
  return db.prepare('SELECT id FROM children WHERE id = ? AND parent_id = ?').get(childId, parentId);
}

// Lister les alertes d'un enfant (les plus récentes d'abord)
router.get('/:childId', (req, res) => {
  if (!childBelongsToParent(req.params.childId, req.parentId)) {
    return res.status(404).json({ error: 'Enfant introuvable' });
  }

  const alerts = db.prepare(
    'SELECT * FROM alerts WHERE child_id = ? ORDER BY created_at DESC LIMIT 100'
  ).all(req.params.childId);

  res.json(alerts);
});

// Marquer une alerte comme lue
router.patch('/:childId/:alertId/read', (req, res) => {
  if (!childBelongsToParent(req.params.childId, req.parentId)) {
    return res.status(404).json({ error: 'Enfant introuvable' });
  }

  const result = db.prepare(
    'UPDATE alerts SET read = 1 WHERE id = ? AND child_id = ?'
  ).run(req.params.alertId, req.params.childId);

  if (result.changes === 0) return res.status(404).json({ error: 'Alerte introuvable' });
  res.json({ status: 'ok' });
});

module.exports = router;
