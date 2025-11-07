#!/usr/bin/env bash

bun build ./src/main.ts --compile --target=bun-linux-x64 --outfile dist/dailyShuffle_linux-x64
bun build ./src/main.ts --compile --target=bun-linux-arm64 --outfile dist/dailyShuffle_linux-arm64
bun build ./src/main.ts --compile --target=bun-windows-x64 --outfile dist/dailyShuffle.exe
bun build ./src/main.ts --compile --target=bun-darwin-arm64 --outfile dist/dailyShuffle_darwin-arm64
bun build ./src/main.ts --compile --target=bun-darwin-x64 --outfile dist/dailyShuffle_darwin-x64
