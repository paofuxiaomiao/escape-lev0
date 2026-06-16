# 逃离 LEV0

一个基于 Backrooms / LEV0 氛围设计的互动闯关游戏。玩家需要在每个关卡观看监控视频，判断画面是否存在异常，并在全部关卡完成后进入通关结尾视频与结尾画面。

线上访问：

- 游戏入口：https://fuyaclub.com/escape-lev0/
- 游戏页面：https://fuyaclub.com/escape-lev0/game
- 管理后台：https://fuyaclub.com/escape-lev0/admin

## 项目特性

- 五个正式关卡：进门、电梯、进场签到、涂鸦、室内开发。
- 每个关卡会读取该关卡下全部启用视频，随机洗牌后逐个展示。
- 玩家每看完一个视频后判断“未发现异常”或“发现异常”，系统即时记录得分与尝试次数。
- 通关后先播放最终通关视频，再展示结尾图片。
- 管理后台支持关卡管理、视频素材管理、视频上传、视频启用/禁用与异常说明配置。
- 视频和图片素材通过 `/manus-storage/*` 统一代理，支持 Aliyun OSS 存储与本地演示素材 fallback。
- 支持部署到站点子路径，例如当前的 `/escape-lev0/`。

## 技术栈

- 前端：React 19、Vite、TypeScript、Wouter、Framer Motion、Tailwind CSS。
- 后端：Express、tRPC、Zod。
- 数据库：MySQL + Drizzle ORM。
- 对象存储：Aliyun OSS，使用 S3 兼容 API 接入。
- 包管理：pnpm 10。

## 主要路由

| 路由 | 说明 |
| --- | --- |
| `/` | 首页入口 |
| `/map` | 关卡地图 |
| `/game` | 游戏主流程 |
| `/admin` | 管理后台 |
| `/api/trpc/*` | tRPC API |
| `/manus-storage/*` | 素材代理，支持视频 Range 播放 |

子路径部署时，以上页面会挂载在配置的 base path 下。例如线上环境使用 `/escape-lev0/game`。

## 本地开发

```bash
pnpm install
cp .env.example .env
pnpm db:push
pnpm dev
```

开发服务默认从 `PORT=3000` 开始寻找可用端口。如果端口被占用，服务会自动尝试后续端口。

常用命令：

```bash
pnpm check
pnpm test
pnpm build
pnpm start
```

## 环境变量

复制 `.env.example` 为 `.env` 后，至少需要配置数据库：

```env
DATABASE_URL=mysql://USER:PASSWORD@HOST:3306/DATABASE
```

常用配置：

| 变量 | 说明 |
| --- | --- |
| `PORT` | Express 服务端口 |
| `DATABASE_URL` | MySQL 连接地址 |
| `VITE_ENDING_VIDEO_URL` | 通关结尾视频地址，默认指向 `/manus-storage/ending/LEV0_backrooms_bilingual_61410_source_subs_bright.mp4` |
| `VITE_APP_BASE_PATH` | Vite base path，子路径部署时使用，例如 `/escape-lev0` |
| `OSS_REGION` | Aliyun OSS 区域 |
| `OSS_ENDPOINT` | Aliyun OSS endpoint |
| `OSS_BUCKET` | Aliyun OSS bucket |
| `OSS_ACCESS_KEY_ID` | Aliyun OSS AccessKey ID |
| `OSS_ACCESS_KEY_SECRET` | Aliyun OSS AccessKey Secret |
| `OSS_PUBLIC_BASE_URL` | 可选的 OSS 公网基础地址 |

不要把真实 `.env`、数据库密码、OSS 密钥提交到 Git。

## 数据库

数据库迁移命令：

```bash
pnpm db:push
```

核心表：

- `users`：用户与权限信息。
- `levels`：游戏关卡配置。
- `videos`：关卡视频素材、正常/异常标记、异常说明与启用状态。
- `gameRecords`：玩家每次判断后的得分、尝试次数、当前关卡和通关状态。

管理后台中可以通过初始化关卡能力写入默认五个关卡：

1. 进门
2. 电梯
3. 进场签到
4. 涂鸦
5. 室内开发

## 游戏流程

1. 玩家从首页进入关卡地图。
2. 选择或继续当前关卡。
3. 游戏读取当前关卡下全部启用视频。
4. 视频列表随机洗牌，并按顺序逐个播放。
5. 玩家每次判断后，系统记录一次尝试和当前累计得分。
6. 当前关卡所有视频判断完成后进入下一关。
7. 全部关卡完成后播放通关视频，再进入结尾画面。

## 视频与素材存储

项目中的大体积视频不建议提交到 Git。推荐将游戏视频、结尾视频等素材上传到 Aliyun OSS，然后在数据库或环境变量中保存 `/manus-storage/...` 形式的访问路径。

`/manus-storage/*` 由服务端代理到 OSS，并处理浏览器视频播放需要的 Range 请求。如果 OSS 读取失败，部分内置演示素材会从本地 `assets/` 目录回退读取，便于本地开发和演示。

## 部署说明

构建生产包：

```bash
pnpm build
```

启动生产服务：

```bash
NODE_ENV=production PORT=3002 pnpm start
```

如果部署到 `https://example.com/escape-lev0/` 这样的子路径，需要在构建时配置：

```bash
VITE_APP_BASE_PATH=/escape-lev0 pnpm build
```

Nginx 可将 `/escape-lev0/` 代理到 Node 服务，并在代理时去掉前缀：

```nginx
location /escape-lev0/ {
  proxy_pass http://127.0.0.1:3002/;
  proxy_http_version 1.1;
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
}
```

当前线上版本使用 fuyaclub 主站的 `/escape-lev0/` 子路径入口。

## 目录结构

```text
client/          React 前端页面与组件
server/          Express、tRPC、存储代理和业务 API
drizzle/         数据库 schema 与迁移文件
assets/          本地演示素材 fallback
dist/            构建输出
```

## License

MIT
