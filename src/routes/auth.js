const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/init');

const router = express.Router();

// Inscription d'un parent
router.post('/register', async (req, res) => {
  const { email, password, nom } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email et mot de passe requis' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères' });
  }

  const existing = db.prepare('SELECT id FROM parents WHERE email = ?').get(email);
  if (existing) {
    return res.status(409).json({ error: 'Cet email est déjà utilisé' });
  }

  const id = uuidv4();
  const passwordHash = await bcrypt.hash(password, 10);

  db.prepare(
    'INSERT INTO parents (id, email, password_hash, nom) VALUES (?, ?, ?, ?)'
  ).run(id, email, passwordHash, nom || null);

  const token = jwt.sign({ parentId: id }, process.env.JWT_SECRET, { expiresIn: '30d' });

  res.status(201).json({ token, parent: { id, email, nom } });
});

// Connexion d'un parent
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email et mot de passe requis' });
  }

  const parent = db.prepare('SELECT * FROM parents WHERE email = ?').get(email);
  if (!parent) {
    return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
  }

  const valid = await bcrypt.compare(password, parent.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
  }

  const token = jwt.sign({ parentId: parent.id }, process.env.JWT_SECRET, { expiresIn: '30d' });

  res.json({ token, parent: { id: parent.id, email: parent.email, nom: parent.nom } });
});

module.exports = router;
