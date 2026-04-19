# OpenPlate

**OpenPlate** 是一款开源的、AI 驱动的营养追踪渐进式 Web 应用（PWA）。支持记录每日饮食与运动、追踪 37+ 种宏量及微量营养素、设置个性化健康目标，并通过 AI 视觉识别照片中的食物。

> [English Documentation →](./README.md)

---

## 功能特色

- **每日营养日志** — 按日期记录餐食与运动，查看完整营养素分项
- **AI 食物识别** — 上传照片，Qwen 视觉模型自动识别食物并填入营养数据（每日 5 次）
- **AI 快速记录** — 拍摄一整份餐食，自动估算总营养摄入
- **37 种营养素追踪** — 热量、三大宏量（蛋白质细类、碳水化合物细类、脂肪细类、膳食纤维、钠），27 种维生素和矿物质
- **个性化目标** — 根据个人信息计算 BMR/TDEE；增肌 / 减脂 / 维持预设，支持自定义热量调整
- **运动追踪** — 8 种运动类型，基于 MET 计算消耗热量，并计入每日总量
- **共享食物库** — 所有用户均可查看和贡献的社区食物数据库
- **套餐预设** — 将常用食物组合保存为套餐，快速复用
- **离线优先 PWA** — 可安装至 iOS/Android 主屏幕，断网可用，联网后自动同步
- **推送通知** — AI 处理完成时通过 FCM 推送通知
- **管理后台** — 审批或驳回用户提交的内容删除申请

---

## 技术栈

| 层级     | 技术                                                         |
| -------- | ------------------------------------------------------------ |
| 前端     | React 19、TypeScript、Vite 7、Tailwind CSS 4                 |
| 状态管理 | Zustand 5（含 localStorage 持久化中间件）                    |
| 路由     | React Router v7                                              |
| PWA      | vite-plugin-pwa + Workbox Service Workers                    |
| 后端     | Firebase（Auth、Firestore、Storage、Cloud Functions v2）     |
| AI       | 阿里云通义千问视觉模型（`qwen3.6-flash`）via Cloud Functions |
| 推送通知 | Firebase Cloud Messaging（FCM）                              |

---

## 项目结构

```
OpenPlate/
├── src/
│   ├── components/        # 可复用 UI 组件
│   ├── pages/             # 路由页面组件
│   ├── store/             # Zustand 状态（auth、foods、meals、dailyLog、goals…）
│   ├── hooks/             # 自定义 React hooks（Firestore 同步、FCM、滚动锁定…）
│   ├── lib/               # Firebase 初始化、营养计算、图片存储、FCM 配置
│   ├── types/             # 共享 TypeScript 接口
│   └── sw.ts              # Workbox Service Worker
├── functions/             # Firebase Cloud Functions（AI 任务处理器）
├── scripts/               # 管理员 CLI 脚本
├── public/                # PWA 图标及 Manifest 资源
├── firestore.rules        # Firestore 安全规则
├── storage.rules          # Storage 安全规则
└── firebase.json          # Firebase Hosting / Functions 配置
```

---

## 前置条件

- Node.js 18+
- 一个已启用以下服务的 [Firebase](https://console.firebase.google.com/) 项目：
  - Authentication（邮箱/密码登录）
  - Cloud Firestore
  - Firebase Storage
  - Cloud Functions（AI 功能需要 Blaze 计费方案）
  - Firebase Cloud Messaging
- 一个 [阿里云 DashScope](https://dashscope.aliyun.com/) API Key（AI 食物识别功能必须）

---

## 部署前准备

### 1. 克隆项目并安装依赖

```bash
git clone https://github.com/frankl1nzhu/openplate.git
cd openplate
npm install
```

### 2. 配置环境变量

将 `.env.example` 复制为 `.env`，并填入 Firebase 项目配置值：

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

> 如需使用本地 Firebase Emulators，额外添加 `VITE_USE_EMULATORS=true`。

### 3. 部署 Firebase 安全规则

```bash
npm install -g firebase-tools
firebase login
firebase deploy --only firestore:rules,storage:rules
```

也可在 Firebase Console 中手动将 `firestore.rules` 和 `storage.rules` 的内容粘贴至规则编辑器并发布。

### 4. 创建 Firestore 索引

首次运行时，Firestore 会自动提示创建所需复合索引。也可手动在 Firebase Console 中添加：

| 集合        | 字段                       |
| ----------- | -------------------------- |
| `foods`     | `createdAt` 降序           |
| `meals`     | `createdAt` 降序           |
| `dailyLogs` | `userId` 升序、`date` 升序 |

### 5. 部署 Cloud Functions（AI 功能必须）

将千问 API Key 设置为 Firebase Function Secret：

```bash
firebase functions:secrets:set QWEN_API_KEY
```

然后部署：

```bash
cd functions
npm install
npm run build
cd ..
firebase deploy --only functions
```

### 6. 设置管理员（可选）

管理员可以审批或驳回内容删除申请。授予管理员权限：

1. 在 Firebase Console → 项目设置 → 服务账号 → 生成新的私钥，下载 JSON 文件
2. 执行管理员设置脚本：

```bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/serviceAccountKey.json"
npx tsx scripts/setAdmin.ts user@example.com
```

设置后，用户需重新登录方可生效。

---

## 本地开发

```bash
npm run dev          # 启动 Vite 开发服务器，地址 http://localhost:5173
npm run build        # 生产构建 → dist/
npm run preview      # 本地预览生产构建
npm run lint         # 运行 ESLint
```

### 使用 Firebase Emulators（可选）

```bash
firebase init emulators   # 启用 Auth、Firestore、Storage 模拟器
firebase emulators:start
```

在 `.env` 中添加 `VITE_USE_EMULATORS=true` 将应用请求路由至本地模拟器。

---

## 生产部署

### Firebase Hosting（推荐）

```bash
npm run build
firebase init hosting   # 将 dist/ 设为公共目录，配置为 SPA
firebase deploy
```

### 其他静态托管

`dist/` 是标准 SPA 产物，可部署至 Vercel、Netlify、Cloudflare Pages 等任意静态托管服务。请将所有路由配置为回退至 `index.html`（SPA fallback）。

---

## 安装为 PWA

**iOS（Safari）**
1. 在 Safari 中打开已部署的 URL
2. 点击底部分享按钮（方框 + 箭头图标）→ **添加到主屏幕**
3. 确认名称后点击「添加」，从主屏幕图标打开即为全屏模式

**Android（Chrome）**
1. 在 Chrome 中打开 URL
2. 点击菜单 → **安装应用**（或接受浏览器弹出的安装提示）

---

## 数据模型

| 集合             | 访问权限                      | 用途                         |
| ---------------- | ----------------------------- | ---------------------------- |
| `foods`          | 所有用户读，已登录用户写      | 社区食物数据库               |
| `meals`          | 仅本人                        | 用户创建的套餐预设           |
| `dailyLogs`      | 仅本人                        | 每日饮食与运动记录           |
| `dailyGoals`     | 仅本人                        | 个性化营养素目标             |
| `fitnessGoals`   | 仅本人                        | 增肌 / 减脂 / 维持目标       |
| `userProfiles`   | 仅本人                        | 用于计算 BMR/TDEE 的个人信息 |
| `deleteRequests` | 已登录用户读/创建，管理员更新 | 内容审核队列                 |
| `aiTasks`        | 本人 + Cloud Function         | AI 处理任务队列              |
| `llmUsage`       | Cloud Function 写入           | AI 配额追踪                  |

---

## 安全说明

- `.env` 已通过 `.gitignore` 排除，**切勿提交至 Git**。
- Firestore 和 Storage 安全规则在服务端强制执行数据所有权校验，前端无法绕过。
- 管理员权限通过 Firebase Custom Claims 授予，不存储在数据库中。
- 食物和套餐数据为所有用户共享；每日记录和目标仅自己可见。
- 照片上传限制 5MB，会自动压缩至 800px 宽度。

---

## 贡献

欢迎提交 Pull Request。对于重大变更，请先开 Issue 讨论您的方案。

---

## 开源协议

MIT
