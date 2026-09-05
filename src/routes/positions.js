const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/init');
const { authParent } = require('../middleware/auth');
const { checkZones } = require('../services/geofencing');

const router = express.Router();

// Reçoit une position depuis l'app installée sur le téléphone de l'enfant.
// Authentification légère par code_appareil (pas de JWT côté enfant).
router.post('/report', (req, res) => {
  const { code_appareil, latitude, longitude, accuracy, battery_level, recorded_at } = req.body;

  if (!code_appareil || latitude === undefined || longitude === undefined) {
    return res.status(400).json({ error: 'code_appareil, latitude et longitude sont requis' });
  }

  const child = db.prepare('SELECT id FROM children WHERE code_appareil = ?').get(code_appareil);
  if (!child) {
    return res.status(404).json({ error: 'Code appareil inconnu' });
  }

  const id = uuidv4();
  const timestamp = recorded_at || new Date().toISOString();

  db.prepare(`
    INSERT INTO positions (id, child_id, latitude, longitude, accuracy, battery_level, recorded_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, child.id, latitude, longitude, accuracy || null, battery_level || null, timestamp);

  checkZones(child.id, latitude, longitude);

  res.status(201).json({ status: 'ok' });
});

// Dernière position connue d'un enfant (app parent)
router.get('/:childId/latest', authParent, (req, res) => {
  const child = db.prepare(
    'SELECT id FROM children WHERE id = ? AND parent_id = ?'
  ).get(req.params.childId, req.parentId);
  if (!child) return res.status(404).json({ error: 'Enfant introuvable' });

  const position = db.prepare(`
    SELECT latitude, longitude, accuracy, battery_level, recorded_at
    FROM positions WHERE child_id = ? ORDER BY recorded_at DESC LIMIT 1
  `).get(child.id);

  if (!position) return res.status(404).json({ error: 'Aucune position enregistrée' });
  res.json(position);
});

// Historique des positions d'un enfant, filtrable par date "since" (app parent)
router.get('/:childId/history', authParent, (req, res) => {
  const child = db.prepare(
    'SELECT id FROM children WHERE id = ? AND parent_id = ?'
  ).get(req.params.childId, req.parentId);
  if (!child) return res.status(404).json({ error: 'Enfant introuvable' });

  const { since, limit } = req.query;
  let query = 'SELECT latitude, longitude, accuracy, recorded_at FROM positions WHERE child_id = ?';
  const params = [child.id];

  if (since) {
    query += ' AND recorded_at >= ?';
    params.push(since);
  }
  query += ' ORDER BY recorded_at ASC';
  if (limit) {
    query += ' LIMIT ?';
    params.push(Number(limit));
  }

  const positions = db.prepare(query).all(...params);
  res.json(positions);
});

module.exports = router;
