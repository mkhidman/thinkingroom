#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")"
node scripts/verify-local-ready.mjs
printf "Registry npm project: "
npm config get registry
if [ ! -d node_modules ]; then
  npm install --registry=https://registry.npmjs.org/
fi
npm run dev
