FROM node:24-alpine AS base
WORKDIR /app
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages packages
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
RUN pnpm --filter @replica/api... build

FROM base AS runner
ENV NODE_ENV=production
ENV NODE_OPTIONS=--conditions=production
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /app/apps/api/package.json ./apps/api/package.json
COPY --from=build /app/packages ./packages
EXPOSE 4000
CMD ["node", "apps/api/dist/server.js"]
