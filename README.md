# Daily Shuffle

Create shuffled versions of your Spotify playlists, refreshed every day

## How to Run

Create a `.env` file in the root of the repo, using the following template:

```ini
# Required
DAILYSHUFFLE_CLIENT_ID=changeme
DAILYSHUFFLE_CLIENT_SECRET=changeme

# Optional (these are the defaults)
DAILYSHUFFLE_HOSTNAME=127.0.0.1
DAILYSHUFFLE_PORT=8080
DAILYSHUFFLE_REDIRECT_URL=http://127.0.0.1:8080/callback
```

Then just run the server with `bun dev`

## License

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
