FROM node:24-alpine AS base
WORKDIR /app
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/worker/package.json apps/worker/package.json
COPY packages packages
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
RUN pnpm --filter @replica/worker build

FROM base AS runner
ENV NODE_ENV=production
COPY --from=build /app/apps/worker/dist ./apps/worker/dist
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/worker/package.json ./apps/worker/package.json
COPY --from=deps /app/packages ./packages
CMD ["node", "apps/worker/dist/index.js"]

