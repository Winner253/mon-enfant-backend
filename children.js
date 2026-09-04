const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/init');
const { authParent } = require('../middleware/auth');

const router = express.Router();
router.use(authParent);

// Générer un code court unique pour rattacher l'app enfant (ex: à saisir dans l'app enfant)
function generateCodeAppareil() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Créer un profil enfant -> renvoie un code_appareil à saisir dans l'app installée sur le téléphone de l'enfant
router.post('/', (req, res) => {
  const { nom } = req.body;
  if (!nom) return res.status(400).json({ error: 'Le nom de l\'enfant est requis' });

  const id = uuidv4();
  let codeAppareil;
  // s'assurer que le code est unique
  do {
    codeAppareil = generateCodeAppareil();
  } while (db.prepare('SELECT id FROM children WHERE code_appareil = ?').get(codeAppareil));

  db.prepare(
    'INSERT INTO children (id, parent_id, nom, code_appareil) VALUES (?, ?, ?, ?)'
  ).run(id, req.parentId, nom, codeAppareil);

  res.status(201).json({ id, nom, code_appareil: codeAppareil });
});

// Lister les enfants du parent connecté
router.get('/', (req, res) => {
  const children = db.prepare(
    'SELECT id, nom, code_appareil, created_at FROM children WHERE parent_id = ?'
  ).all(req.parentId);
  res.json(children);
});

// Détail d'un enfant (vérifie qu'il appartient bien au parent connecté)
router.get('/:childId', (req, res) => {
  const child = db.prepare(
    'SELECT id, nom, code_appareil, created_at FROM children WHERE id = ? AND parent_id = ?'
  ).get(req.params.childId, req.parentId);

  if (!child) return res.status(404).json({ error: 'Enfant introuvable' });
  res.json(child);
});

// Supprimer un profil enfant
router.delete('/:childId', (req, res) => {
  const result = db.prepare(
    'DELETE FROM children WHERE id = ? AND parent_id = ?'
  ).run(req.params.childId, req.parentId);

  if (result.changes === 0) return res.status(404).json({ error: 'Enfant introuvable' });
  res.status(204).send();
});

module.exports = router;
