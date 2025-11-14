#!/usr/bin/env bash

export DAILYSHUFFLE_BUNDLED="true"
PRODUCTION="--production" # Comment out to disable minification

bun build $PRODUCTION --outfile=build/ui.js ./src/ui/main.ts

bun build $PRODUCTION --env=DAILYSHUFFLE_BUNDLED* --compile --target=bun-linux-x64 --outfile=dist/dailyShuffle_linux-x64 ./src/main.ts
bun build $PRODUCTION --env=DAILYSHUFFLE_BUNDLED* --compile --target=bun-linux-arm64 --outfile=dist/dailyShuffle_linux-arm64 ./src/main.ts
bun build $PRODUCTION --env=DAILYSHUFFLE_BUNDLED* --compile --target=bun-windows-x64 --outfile=dist/dailyShuffle.exe ./src/main.ts
bun build $PRODUCTION --env=DAILYSHUFFLE_BUNDLED* --compile --target=bun-darwin-arm64 --outfile=dist/dailyShuffle_darwin-arm64 ./src/main.ts
bun build $PRODUCTION --env=DAILYSHUFFLE_BUNDLED* --compile --target=bun-darwin-x64 --outfile=dist/dailyShuffle_darwin-x64 ./src/main.ts
