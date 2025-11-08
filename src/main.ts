import * as auth from './lib/auth';
import * as s from './lib/shuffler';

const HOSTNAME = process.env.DAILYSHUFFLE_HOSTNAME || '127.0.0.1';
const PORT = process.env.DAILYSHUFFLE_PORT || '8080';

const server = Bun.serve({
  hostname: HOSTNAME,
  port: PORT,
  routes: {
    '/': async (req) => {
      const uid = await s.checkSessionToken(req);
      if (uid) {
        return new Response(await Bun.file('./src/ui/index.html').bytes(), {
          headers: {
            'Content-Type': 'text/html'
          }
        });
      }

      return Response.redirect('/auth');
    },

    '/userPlaylists': async (req) => {
      const uid = await s.checkSessionToken(req);
      const res = await s.userPlaylists(uid);
      if (res) return Response.json(res);

      return new Response('Not authenticated!', { status: 401 });
    },

    '/userJobs': async (req) => {
      const uid = await s.checkSessionToken(req);
      const res = await s.userJobs(uid);
      if (res) return Response.json(res);

      return new Response('Not authenticated!', { status: 401 });
    },

    '/auth': (req) => {
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

// s.runAllJobs();

setInterval(() => {
  s.runAllJobs();
  auth.cleanVerifiers();
}, 24 * 60 * 60 * 1000);
