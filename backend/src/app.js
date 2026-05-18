require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const scanRoutes = require('./routes/scans');
const groupRoutes = require('./routes/groups');

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/scans', scanRoutes);
app.use('/api/groups', groupRoutes);

// Health check (racine + /api/health pour o2switch)
app.get('/', (req, res) => res.json({ status: 'ok', app: 'GluGlu API' }));
app.get('/api/health', (req, res) => res.json({ status: 'ok', app: 'GluGlu API' }));

// 404
app.use((req, res) => res.status(404).json({ error: 'Route introuvable' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`GluGlu Backend démarré sur le port ${PORT}`);
});

module.exports = app;
