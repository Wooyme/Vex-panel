import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';
import { WebSocketServer, createWebSocketStream } from 'ws';
// @ts-ignore
import aedesFactory from 'aedes';

function mqttBrokerPlugin(): Plugin {
  return {
    name: 'mqtt-broker-plugin',
    configureServer(server) {
      if (!server.httpServer) return;

      try {
        const AedesConstructor = (aedesFactory as any)?.default || aedesFactory;
        const aedes = typeof AedesConstructor === 'function' 
          ? new AedesConstructor({ id: 'ROBOT-ARCADE-BROKER-01' })
          : AedesConstructor({ id: 'ROBOT-ARCADE-BROKER-01' });

        const wss = new WebSocketServer({
          noServer: true,
        });

        server.httpServer.on('upgrade', (request, socket, head) => {
          const url = request.url || '';
          if (url.startsWith('/mqtt')) {
            wss.handleUpgrade(request, socket, head, (ws) => {
              const stream = createWebSocketStream(ws);
              aedes.handle(stream);
            });
          }
        });
      } catch (err) {
        console.warn('MQTT Plugin note:', err);
      }
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), mqttBrokerPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
