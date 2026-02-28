import { startDashboard } from './ui/dashboard';
import { createApp } from './app';

const dashboard = startDashboard();
const { app, config } = createApp({ dashboard });

const server = app.listen(config.port, () => {
  const x402Label = config.x402Mode ? '  x402: ON' : '';
  dashboard.logSkillCall('SYSTEM', '', `Emulator ready on :${config.port}${x402Label}`);
});

function shutdown() {
  dashboard.logSkillCall('SYSTEM', '', 'Shutting down...');
  server.close(() => {
    dashboard.destroy();
    process.exit(0);
  });
  setTimeout(() => {
    dashboard.destroy();
    process.exit(1);
  }, 3000);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
