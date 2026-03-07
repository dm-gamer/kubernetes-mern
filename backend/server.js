const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const client = require('prom-client');

dotenv.config();

const authRoutes = require('./src/routes/auth');
const studentRoutes = require('./src/routes/students');

const app = express();

app.use(cors());
app.use(express.json());

// Prometheus metrics
const register = new client.Registry();
client.collectDefaultMetrics({ register });

app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.end(metrics);
  } catch (err) {
    res.status(500).end(err.message);
  }
});

// Health check for Kubernetes liveness/readiness probes
app.get('/api/health', (req, res) => {
  const dbOk = mongoose.connection.readyState === 1;
  if (dbOk) return res.status(200).json({ status: 'ok', db: 'connected' });
  res.status(503).json({ status: 'degraded', db: 'disconnected' });
});

app.use('/api', authRoutes);
app.use('/api', studentRoutes);

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/mern_students';

mongoose
  .connect(MONGO_URI, { autoIndex: true })
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  });

