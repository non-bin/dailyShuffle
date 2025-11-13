/**
 * Daily Shuffle - main.ts
 * The entry point, runs the WebUI server and schedules jobs. Calls helpers from `lib/shuffler.ts`
 *
 * Copyright (C) 2025  Alice Jacka, licensed under AGPL 3.0
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import * as auth from './lib/auth';
import * as s from './lib/shuffler';

const HOSTNAME = process.env.DAILYSHUFFLE_HOSTNAME || '127.0.0.1';
const PORT = process.env.DAILYSHUFFLE_PORT || '8080';

const server = Bun.serve({
  hostname: HOSTNAME,
  port: PORT,
  routes: {
    '/': async (req) => {
      const uid = s.checkSessionToken(req);
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
            s.deleteJob(uid, destination);
          } else {
            if (!source || typeof source !== 'string')
              return Response.json({ message: 'Invalid or missing source!', body }, { status: 400 });

            if (action === 'update') {
              s.updateJobSource(uid, destination, source);
            } else if (action === 'add') {
              await s.createJob(uid, source, destination);
            } else return Response.json({ message: 'Invalid action!', body }, { status: 400 });
          }
        }

        return new Response(await Bun.file('./src/ui/index.html').bytes(), {
          headers: {
            'Content-Type': 'text/html',
          },
        });
      }

      return Response.redirect('/auth');
    },

    '/logout': (req) => {
      const uid = s.checkSessionToken(req);
      if (uid) {
        s.logout(uid);
        req.cookies.delete('uid');
        req.cookies.delete('sessionToken');

        return Response.redirect('/');
      }

      return new Response('Not authenticated!', { status: 401 });
    },

    '/userPlaylists': async (req) => {
      const uid = s.checkSessionToken(req);
      const res = await s.userPlaylists(uid);
      if (res) return Response.json(res);

      return new Response('Not authenticated!', { status: 401 });
    },

    '/userJobs': async (req) => {
      const uid = s.checkSessionToken(req);
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

    '/main.js': async () => {
      return new Response((await Bun.build({ entrypoints: ['src/ui/main.ts'] })).outputs[0], {
        headers: {
          'Content-Type': 'text/javascript',
        },
      });
    },

    '/test': () => {
      s.runAllJobs();

      return new Response();
    },
  },

  fetch(req) {
    return new Response('Not Found', { status: 404 });
  },
});

s.log(`Server running at ${server.url}`);

// test //

// import * as db from './lib/db';

// // Boop
// db.setJob({
//   destinationPID: '14MPe67TMyfcY3GX38dTmP',
//   sourcePID: '3XN2zUlYzVlTwZgNfHCKRQ',
//   uid: 'w4ifp2anlm4zlw4ett8irmfa6'
// });

// // Test
// db.setJob({
//   destinationPID: '5lmyDVCHIK21SQr2WC4ui5',
//   sourcePID: '5DkdsC3CvmF3GA5TlLxMo2',
//   uid: 'w4ifp2anlm4zlw4ett8irmfa6'
// });

// s.runAllJobs();

setInterval(
  () => {
    s.runAllJobs();
    auth.cleanVerifiers();
  },
  24 * 60 * 60 * 1000,
);
