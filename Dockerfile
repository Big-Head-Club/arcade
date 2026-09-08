FROM node:22-slim
# Chromium shoots the plates for games that don't ship one. Git installs tally from GitHub.
RUN apt-get update && apt-get install -y --no-install-recommends git ca-certificates chromium fonts-liberation fonts-noto-color-emoji \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY . .
ENV NODE_ENV=production DATA_DIR=/data CHROME_PATH=/usr/bin/chromium PORT=8080
EXPOSE 8080
CMD ["node", "--disable-warning=ExperimentalWarning", "src/server.js"]
