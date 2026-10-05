# One image for the website, the Telegram bot and database migrations.
FROM node:26-bookworm-slim
RUN npm install -g pnpm@11.18.0
WORKDIR /app

# Dependencies first, so code changes don't reinstall them.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/
COPY apps/jobs/package.json apps/jobs/
COPY packages/core/package.json packages/core/
COPY packages/db/package.json packages/db/
COPY packages/i18n/package.json packages/i18n/
RUN pnpm install --frozen-lockfile

COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @avtoskop/web build

ENV NODE_ENV=production
EXPOSE 3000
