# 使用Node.js的官方镜像作为基础镜像
FROM node:latest

# 设置工作目录为/app，这将是我们在容器内的工作空间
WORKDIR /app

# 将当前目录（即Dockerfile所在的rise目录）的内容复制到容器的/app内
# 注意：这里假设Dockerfile位于rise目录中
COPY . .

# 安装项目依赖
RUN npm install

# 编译TypeScript代码（如果需要的话）
# RUN tsc -p .

# 暴露容器的端口号（假设你的应用运行在3000端口）
EXPOSE 3000

# 启动应用程序的命令
CMD ["npm", "run", "start"]
