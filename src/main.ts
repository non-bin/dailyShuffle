import * as auth from './lib/auth';
import * as api from './lib/api';
import * as db from './lib/db';

const HOSTNAME = process.env.DAILYSHUFFLE_HOSTNAME || '127.0.0.1';
const PORT = process.env.DAILYSHUFFLE_PORT || '8080';

const server = Bun.serve({
  hostname: HOSTNAME,
  port: PORT,
  routes: {
    '/': (req) => {
      return auth.redirectToAuth(req);
    },

    '/callback': (req) => {
      return auth.completeAuth(req);
    }
  },

  fetch(req) {
    return new Response('Not Found', { status: 404 });
  },

  error(err) {
    if (err instanceof Error) console.error('Cause:', err.cause);
    console.error(err);
  }
});

console.log(`Server running at ${server.url}`);

api.runAllJobs();

setInterval(() => {
  api.runAllJobs();
  auth.cleanVerifiers();
}, 24 * 60 * 60 * 1000);
