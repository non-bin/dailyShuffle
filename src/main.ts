import * as auth from './lib/auth';
import * as api from './lib/api';
import * as db from './lib/db';

const server = Bun.serve({
  port: 5173,
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
  }
});

console.log(`Server running at ${server.url}`);

api.runAllJobs();

setInterval(() => {
  api.runAllJobs();
  auth.cleanVerifiers();
}, 24 * 60 * 60 * 1000);
