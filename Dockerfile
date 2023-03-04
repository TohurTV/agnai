FROM node:18-stretch-slim

WORKDIR /app
VOLUME [ "/app/db" ]

RUN npm install pnpm -g

ADD package.json pnpm-lock.yaml ./
RUN pnpm i --frozen-lockfile

ADD public.ts requirements.txt tailwind.config.js tsconfig.json .babelrc .postcssrc .prettierrc ./
ADD common/ ./common/
ADD srv/ ./srv/
ADD web/ ./web

RUN pnpm run build

ENV ADAPTERS=horde \
  LOG_LEVEL=info \
  INITIAL_USER=administrator \
  DB_NAME=agnai

EXPOSE 3001
EXPOSE 5001

ENTRYPOINT [ "pnpm" ]
CMD ["run", "server"]