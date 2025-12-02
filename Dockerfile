# 使用官方轻量级 Node.js 18 运行时作为基础镜像
FROM node:18-alpine

# 设置工作目录
WORKDIR /usr/src/app

# 复制 package.json 和 package-lock.json (如果存在)
# 这样可以在不改变应用代码的情况下缓存依赖安装步骤
COPY package*.json ./

# 安装生产环境依赖
# 使用 npm ci 确保根据 package-lock.json 安装，更稳定
RUN npm ci --only=production

# 复制应用的其余源代码
COPY . .

# 应用程序将在容器的 8080 端口上运行
EXPOSE 8080

# 定义容器启动时执行的命令
CMD [ "npm", "start" ]