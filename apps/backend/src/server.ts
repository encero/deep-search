import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { config } from './config/index.js';
import { initializeDatabase } from './database/client.js';
import { initializeWebSocket } from './core/websocket/handler.js';
import { registerDeepResearchModule } from './modules/deep-research/index.js';

export async function createApp() {
  // Initialize database
  initializeDatabase();
  console.log('Database initialized');

  // Create Express app
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Config endpoint (for frontend)
  app.get('/api/config/settings', (req, res) => {
    res.json({
      llm: {
        provider: config.llm.provider,
        model: config.llm.model,
        // Don't expose API key
      },
      search: {
        provider: config.search.provider,
      },
      research: config.research,
    });
  });

  // Register modules
  registerDeepResearchModule(app);

  // Error handling middleware
  app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}

export async function startServer() {
  const app = await createApp();

  // Create HTTP server
  const server = createServer(app);

  // Initialize WebSocket
  initializeWebSocket(server);
  console.log('WebSocket server initialized');

  // Start listening
  server.listen(config.port, () => {
    console.log(`Server running on http://localhost:${config.port}`);
    console.log(`WebSocket available at ws://localhost:${config.port}/ws`);
    console.log(`Environment: ${config.nodeEnv}`);
  });

  // Graceful shutdown
  const shutdown = () => {
    console.log('Shutting down...');
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  return server;
}
