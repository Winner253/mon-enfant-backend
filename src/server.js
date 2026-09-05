require('dotenv').config();
const express = require('express');
const cors = require('cors');

require('./db/init'); // initialise la base de données au démarrage

const authRoutes = require('./routes/auth');
const childrenRoutes = require('./routes/children');
const positionsRoutes = require('./routes/positions');
const zonesRoutes = require('./routes/zones');
const alertsRoutes = require('./routes/alerts');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ status: 'Mon Enfant API en ligne' });
});

app.use('/api/auth', authRoutes);
app.use('/api/children', childrenRoutes);
app.use('/api/positions', positionsRoutes);
app.use('/api/zones', zonesRoutes);
app.use('/api/alerts', alertsRoutes);

// Gestion des erreurs non prévues
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Erreur serveur interne' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serveur Mon Enfant démarré sur le port ${PORT}`);
});
