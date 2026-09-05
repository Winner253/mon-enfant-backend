const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/init');
const { authParent } = require('../middleware/auth');

const router = express.Router();
router.use(authParent);

function childBelongsToParent(childId, parentId) {
  return db.prepare('SELECT id FROM children WHERE id = ? AND parent_id = ?').get(childId, parentId);
}

// Créer une zone de sécurité pour un enfant
router.post('/:childId', (req, res) => {
  if (!childBelongsToParent(req.params.childId, req.parentId)) {
    return res.status(404).json({ error: 'Enfant introuvable' });
  }

  const { nom, latitude, longitude, rayon_metres } = req.body;
  if (!nom || latitude === undefined || longitude === undefined || !rayon_metres) {
    return res.status(400).json({ error: 'nom, latitude, longitude et rayon_metres sont requis' });
  }

  const id = uuidv4();
  db.prepare(`
    INSERT INTO zones (id, child_id, nom, latitude, longitude, rayon_metres)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, req.params.childId, nom, latitude, longitude, rayon_metres);

  res.status(201).json({ id, nom, latitude, longitude, rayon_metres, active: 1 });
});

// Lister les zones d'un enfant
router.get('/:childId', (req, res) => {
  if (!childBelongsToParent(req.params.childId, req.parentId)) {
    return res.status(404).json({ error: 'Enfant introuvable' });
  }

  const zones = db.prepare('SELECT * FROM zones WHERE child_id = ?').all(req.params.childId);
  res.json(zones);
});

// Modifier une zone (ex: activer/désactiver, changer le rayon)
router.patch('/:childId/:zoneId', (req, res) => {
  if (!childBelongsToParent(req.params.childId, req.parentId)) {
    return res.status(404).json({ error: 'Enfant introuvable' });
  }

  const zone = db.prepare('SELECT * FROM zones WHERE id = ? AND child_id = ?').get(req.params.zoneId, req.params.childId);
  if (!zone) return res.status(404).json({ error: 'Zone introuvable' });

  const { nom, latitude, longitude, rayon_metres, active } = req.body;
  db.prepare(`
    UPDATE zones SET
      nom = COALESCE(?, nom),
      latitude = COALESCE(?, latitude),
      longitude = COALESCE(?, longitude),
      rayon_metres = COALESCE(?, rayon_metres),
      active = COALESCE(?, active)
    WHERE id = ?
  `).run(nom, latitude, longitude, rayon_metres, active, req.params.zoneId);

  res.json({ status: 'ok' });
});

// Supprimer une zone
router.delete('/:childId/:zoneId', (req, res) => {
  if (!childBelongsToParent(req.params.childId, req.parentId)) {
    return res.status(404).json({ error: 'Enfant introuvable' });
  }

  const result = db.prepare('DELETE FROM zones WHERE id = ? AND child_id = ?').run(req.params.zoneId, req.params.childId);
  if (result.changes === 0) return res.status(404).json({ error: 'Zone introuvable' });
  res.status(204).send();
});

module.exports = router;
