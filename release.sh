#!/usr/bin/env bash
set -e

export DAILYSHUFFLE_BUNDLED="true"
PRODUCTION="--production" # Comment out to disable minification

bun build $PRODUCTION --outfile=build/ui.js ./src/ui/main.ts

bun build $PRODUCTION --env=DAILYSHUFFLE_BUNDLED* --sourcemap --compile --target=bun-linux-x64 --outfile=dist/dailyShuffle_linux-x64 ./src/main.ts
bun build $PRODUCTION --env=DAILYSHUFFLE_BUNDLED* --sourcemap --compile --target=bun-linux-arm64 --outfile=dist/dailyShuffle_linux-arm64 ./src/main.ts
bun build $PRODUCTION --env=DAILYSHUFFLE_BUNDLED* --sourcemap --compile --target=bun-windows-x64 --outfile=dist/dailyShuffle.exe ./src/main.ts
bun build $PRODUCTION --env=DAILYSHUFFLE_BUNDLED* --sourcemap --compile --target=bun-darwin-arm64 --outfile=dist/dailyShuffle_darwin-arm64 ./src/main.ts
bun build $PRODUCTION --env=DAILYSHUFFLE_BUNDLED* --sourcemap --compile --target=bun-darwin-x64 --outfile=dist/dailyShuffle_darwin-x64 ./src/main.ts

patchelf --set-interpreter /lib64/ld-linux-x86-64.so.2 dist/dailyShuffle_linux-x64  # When building on NixOS it uses the store path for this which won't work
patchelf --set-interpreter /lib/ld-linux-aarch64.so.1 dist/dailyShuffle_linux-arm64 # Ditto
