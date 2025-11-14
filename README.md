# Daily Shuffle

Create shuffled versions of your Spotify playlists, refreshed every day

## How to Run

- Create an app in the [Spotify Developer Portal](https://developer.spotify.com/dashboard)
  - Check `Web API` under `Which API/SDKs are you planning to use?`
  - Make sure to add the url of your callback endpoint to the `Redirect URIs` (this should be the same as `DAILYSHUFFLE_REDIRECT_URL`)

- Create a `.env` file in the directory you will run Daily Shuffle from, using the following template and the client ID and secret from the Spotify Developer Portal

```ini
# Required
DAILYSHUFFLE_CLIENT_ID=changeme
DAILYSHUFFLE_CLIENT_SECRET=changeme

# Optional (these are the defaults)
DAILYSHUFFLE_HOSTNAME=127.0.0.1
DAILYSHUFFLE_PORT=8080
DAILYSHUFFLE_REDIRECT_URL=http://127.0.0.1:8080/callback
DAILYSHUFFLE_DB_PATH=dailyShuffle.sqlite # Relative to cwd when running
```

- Download the correct release binary for your system from <https://github.com/non-bin/dailyShuffle/releases/latest>, and run it.

## Contributing

This project is written using the [Bun](https://bun.com/) runtime, it will not work with another runtime like NodeJS.

### Running

Create a `.env` file as described in [Configuration](#configuration)

```shell
bun i -d # Install dev dependencies, or:
bun i -p # Install production dependencies

bun dev # Start the dev server
```

### File Layout

In the `src` directory:

- main.ts - The entry point, runs the WebUI server and schedules jobs. Calls helpers from `/lib/shuffler.ts`
- lib/
  - types.ts - TypeScript object type definitions
  - shuffler.ts - Wrappers around methods in other files, to give a consistent api to `/main.ts`
  - api.ts - Interacts with the Spotify API for everything but authentication
  - auth.ts - Handles authentication with the Spotify API
  - db.ts - Stores and interacts with persistent data like users and jobs
- ui/
  - index.html - Single page interface, using the [Bulma](https://bulma.io/documentation) CSS framework
  - main.ts - Transpiled to js by `/main.ts`

## Building for Release

All you have to do it run `bun release` and all the weird stuff is handled. What it does is:

- Compile `src/ui/main.ts` to `build/ui.js`
- Set `DAILYSHUFFLE_BUNDLED=true` so the bundle knows it's a bundle and should use the bundled `ui.js`
- Compile everything into 5 different architecture binaries in `dist/`

## License

```plain
Create shuffled versions of your playlists, refreshed every day
Copyright (C) 2025  Alice Jacka

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published
by the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
```
