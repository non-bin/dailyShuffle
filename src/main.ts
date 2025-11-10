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
        if (req.method === 'POST') {
          const body = await req.formData();

          const action = body.get('action');
          const destination = body.get('destination');
          const source = body.get('source');

          if (!action || typeof action !== 'string')
            return Response.json({ message: 'Invalid or missing action!', body }, { status: 400 });

          if (!destination || typeof destination !== 'string')
            return Response.json({ message: 'Invalid or missing destination!', body }, { status: 400 });

          if (action === 'delete') {
            await s.deleteJob(uid, destination);
          } else {
            if (!source || typeof source !== 'string')
              return Response.json({ message: 'Invalid or missing source!', body }, { status: 400 });

            if (action === 'update') {
              await s.updateJobSource(uid, destination, source);
            } else if (action === 'add') {
              await s.createJob(uid, source, destination);
            } else return Response.json({ message: 'Invalid action!', body }, { status: 400 });
          }
        }

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
    },

    '/style.css': new Response(await Bun.file('./src/ui/style.css').bytes(), {
      headers: {
        'Content-Type': 'text/css'
      }
    }),

    '/main.js': async () => {
      return new Response((await Bun.build({ entrypoints: ['src/ui/main.ts'] })).outputs[0], {
        headers: {
          'Content-Type': 'text/javascript'
        }
      });
    },

    '/test': () => {
      s.runAllJobs();

      return new Response();
    }
  },

  fetch(req) {
    return new Response('Not Found', { status: 404 });
  },

  error(err) {
    if (err instanceof Error) console.error('Cause:', err.cause);
    else console.error('Unknown cause');
    console.error(err);
  }
});

console.log(`Server running at ${server.url}`);

s.runAllJobs();

setInterval(() => {
  s.runAllJobs();
  auth.cleanVerifiers();
}, 24 * 60 * 60 * 1000);
