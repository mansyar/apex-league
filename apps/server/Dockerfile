# syntax=docker/dockerfile:1
#
# The API image (FR-10, NFR-7).
#
# Build from the repository root, not from this directory:
#
#   docker build -f apps/server/Dockerfile -t apex-league-server .
#
# The context has to be the root because `bun.lock` lives there and Bun's
# isolated linker installs each workspace's dependencies into that workspace's
# own `node_modules` - `apps/server/node_modules/elysia`, not the root's. A
# server-only install would leave every import unresolvable, so the whole
# workspace set is installed in one go.
#
# There is no compile stage on purpose: `apps/server/src/main.ts` is executed by
# Bun itself, so nothing emits JavaScript and a build stage would have nothing
# to hand to the runtime. Two stages, not three.

FROM oven/bun:1.4.4 AS deps
WORKDIR /app

# Every workspace manifest, because `--frozen-lockfile` compares the lockfile
# against the whole workspace set: a missing manifest reads as a lockfile that
# needs updating, and the build stops instead of installing something untested.
COPY package.json bun.lock ./
COPY apps/client/package.json ./apps/client/package.json
COPY apps/server/package.json ./apps/server/package.json
COPY packages/sim/package.json ./packages/sim/package.json
COPY packages/voxel/package.json ./packages/voxel/package.json

# `--production`: the image runs the server and nothing else, so the test, lint,
# type-check and deploy tooling never enters it.
RUN bun install --frozen-lockfile --production

FROM oven/bun:1.4.4 AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
# The default points at the mounted volume rather than the image's own
# filesystem. A container that keeps its database inside the image loses every
# save on the next deploy (NFR-8); Coolify may override this, and the boot log
# prints the path it actually used.
ENV DATABASE_PATH=/data/apex.sqlite

# Both `node_modules` trees are copied at the same absolute paths they were
# installed at, so Bun's links into `node_modules/.bun` resolve in the image.
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/server/node_modules ./apps/server/node_modules
COPY package.json bun.lock ./
COPY apps/server/package.json ./apps/server/package.json
COPY apps/server/src ./apps/server/src
# `migrate.ts` reads this folder at boot, resolved from its own file.
COPY apps/server/migrations ./apps/server/migrations

# Volume ownership - the one thing that separates "works locally" from "works
# in Coolify". The container runs as `bun` (uid 1000), and `openDatabase` throws
# at boot, with no fallback, when it cannot create the database file. `/data` is
# therefore created and chowned here: Docker seeds a *named* volume from the
# image's directory, so a fresh `apex-data:/data` volume arrives owned by uid
# 1000 and the server boots.
#
# A host *bind* mount inherits nothing. `chown -R 1000:1000 <host dir>` before
# starting the container, or the boot fails loudly naming the path - which is
# the intended behaviour, not a bug to work around. README: "The database
# volume".
RUN mkdir -p /data && chown bun:bun /data

USER bun
EXPOSE 3000

# `exec` form, so Bun is PID 1 and receives SIGTERM directly.
CMD ["bun", "apps/server/src/main.ts"]
