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
    },

    '/test': async (req) => {
      const uid = new URLSearchParams(new URL(req.url).search).get('uid');

      if (!uid) return new Response('Missing uid parameter', { status: 400 });
      const user = db.getUser(uid);
      if (!user) return new Response('Unknown uid', { status: 401 });
      if (!user.accessToken) return new Response('User is not authenticated', { status: 401 });

      return Response.json(await api.fetchProfile(user.accessToken));
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
}, 24 * 60 * 60 * 1000);
