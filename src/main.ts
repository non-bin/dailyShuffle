/**
 * Daily Shuffle - main.ts
 * The entry point, runs the WebUI server and schedules jobs. Calls helpers from `lib/shuffler.ts`
 *
 * Copyright (C) 2025  Alice Jacka
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import { version } from '../package.json';
import util from 'util';

const { values: args } = util.parseArgs({
  args: Bun.argv,
  options: {
    version: {
      type: 'boolean',
    },
  },
  strict: true,
  allowPositionals: true,
});
if (args.version) {
  console.log(`Daily Shuffle v${version}

Copyright (C) 2025  Alice Jacka
This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published
by the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

Source code: <https://github.com/non-bin/dailyShuffle>`);
  process.exit(0);
}

const BUNDLED = process.env.DAILYSHUFFLE_BUNDLED === 'true';
const HOSTNAME = process.env.DAILYSHUFFLE_HOSTNAME || '127.0.0.1';
const PORT = process.env.DAILYSHUFFLE_PORT || '8080';

import * as auth from './lib/auth';
import * as s from './lib/shuffler';

import _uiHtml from './ui/index.html' with { type: 'text' };
const uiHtml: string = _uiHtml as unknown as string; // Text

import _uiTs from './ui/main.ts' with { type: 'file' }; // So it reloads when editing
import _uiJs from '../build/ui.js' with { type: 'text' }; // For the build
const uiJs: string =
  BUNDLED ?
    (_uiJs as string)
  : await Bun.build({ entrypoints: [_uiTs as string], minify: true }).then((x) => x.outputs[0]!.text());

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

        return new Response(uiHtml, { headers: { 'Content-Type': 'text/html' } });
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

    '/main.js': new Response(uiJs, { headers: { 'Content-Type': 'text/javascript' } }),

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
