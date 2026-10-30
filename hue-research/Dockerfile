# HUE Research: ứng dụng web (Next.js) + bộ đồng bộ dữ liệu.
# Build:  docker build -t hue-research .
# Chạy:   docker run -p 3100:3100 -v hue-data:/data hue-research
FROM node:24-bookworm-slim AS build
# better-sqlite3 không có bản dựng sẵn cho Node này nên phải biên dịch: cần python3, make, g++ (chỉ ở giai đoạn build).
RUN apt-get update  && apt-get install -y --no-install-recommends python3 make g++  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY hce-research/package.json hce-research/package-lock.json ./
RUN npm ci
COPY hce-research/ ./
RUN mkdir -p public && npm run build && npm prune --omit=dev

FROM node:24-bookworm-slim
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HCE_DB_PATH=/data/hce.db \
    PORT=3100
WORKDIR /app
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates tini \
 && rm -rf /var/lib/apt/lists/*
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/lib/source-ddl.mjs ./lib/source-ddl.mjs
COPY --from=build /app/next.config.mjs ./next.config.mjs
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh && mkdir -p /data && chown -R node:node /data /app
# Không đặt USER: entrypoint chạy bằng root để chown thư mục dữ liệu rồi hạ xuống người dùng "node".
VOLUME /data
EXPOSE 3100
ENTRYPOINT ["/usr/bin/tini", "--", "/usr/local/bin/entrypoint.sh"]
CMD ["node", "node_modules/next/dist/bin/next", "start", "-H", "0.0.0.0"]
