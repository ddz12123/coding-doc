# ===== 阶段 1：构建静态站点 =====
FROM node:22-alpine AS builder

WORKDIR /app

# 安装 pnpm（与本地版本保持一致的大版本）
RUN npm install -g pnpm@11

# 先只复制依赖清单，充分利用 Docker 层缓存
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# 复制其余源码并构建
COPY . .
# 文档较多，加大 Node 内存上限防止构建 OOM
ENV NODE_OPTIONS=--max-old-space-size=4096
RUN pnpm build

# ===== 阶段 2：Nginx 托管静态文件 =====
FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/build /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
