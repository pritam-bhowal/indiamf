require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initDb } = require('./config/db');
const fundsRoutes = require('./routes/funds');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { setupDailySync } = require('./jobs/dailySync');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api', fundsRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Initialize database and start server
async function start() {
  try {
    // Initialize SQLite database
    await initDb();
    console.log('Database initialized');

    // Start server
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);

      // Set up daily sync cron job
      setupDailySync();
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
