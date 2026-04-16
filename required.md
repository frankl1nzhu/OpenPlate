# OpenPlate - 部署前需要完成的操作

## 1. 创建 Firebase 项目

1. 前往 [Firebase Console](https://console.firebase.google.com/)
2. 点击「添加项目」，创建名为 `openplate` 的项目
3. 根据提示完成项目创建

## 2. 启用 Firebase 服务

### 2.1 Authentication
1. 在 Firebase Console 左侧菜单选择 **Build > Authentication**
2. 点击「Get Started」
3. 在「Sign-in method」标签页中，启用 **Email/Password** 登录方式

### 2.2 Cloud Firestore
1. 左侧菜单选择 **Build > Firestore Database**
2. 点击「Create database」
3. 选择生产模式（Production mode）
4. 选择最近的区域（如 `asia-east1` 或 `asia-northeast1`）
5. 创建完成后，进入「Rules」标签页
6. 将 `firestore.rules` 文件中的规则复制粘贴到规则编辑器中，点击「Publish」

### 2.3 Firebase Storage
1. 左侧菜单选择 **Build > Storage**
2. 点击「Get Started」
3. 选择生产模式
4. 进入「Rules」标签页
5. 将 `storage.rules` 文件中的规则复制粘贴到规则编辑器中，点击「Publish」

## 3. 获取 Firebase 配置

1. 在 Firebase Console 中，点击项目设置（齿轮图标）
2. 在「General」标签页底部，点击「Add app」> Web（`</>`）
3. 注册应用名称（如 `openplate-web`）
4. 复制 `firebaseConfig` 中的各个值

## 4. 配置环境变量

在项目根目录创建 `.env` 文件（参考 `.env.example`）：

```env
VITE_FIREBASE_API_KEY=你的ApiKey
VITE_FIREBASE_AUTH_DOMAIN=你的项目.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=你的项目ID
VITE_FIREBASE_STORAGE_BUCKET=你的项目.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=你的MessagingSenderId
VITE_FIREBASE_APP_ID=你的AppId
```

## 5. 创建 Firestore 索引

首次使用时，Firestore 会自动提示需要创建的复合索引。也可以手动创建：

1. 进入 Firestore > Indexes
2. 添加以下索引：
   - Collection: `foods`, Fields: `createdAt` (Descending)
   - Collection: `meals`, Fields: `createdAt` (Descending)

## 6. 本地开发

```bash
npm install
npm run dev
```

浏览器访问 `http://localhost:5173`

## 7. 构建与部署

### 构建生产版本
```bash
npm run build
```

构建产物在 `dist/` 目录下。

### 部署选项

#### 选项 A：Firebase Hosting（推荐）
```bash
npm install -g firebase-tools
firebase login
firebase init hosting  # 选择 dist 作为公共目录，配置为 SPA
firebase deploy
```

#### 选项 B：其他静态托管
将 `dist/` 目录部署到任意静态托管服务（Vercel, Netlify, Cloudflare Pages 等）。
确保配置 SPA fallback（所有路由指向 `index.html`）。

## 8. iPhone 添加到主屏幕

1. 在 iPhone Safari 中访问部署后的 URL
2. 点击底部分享按钮（方框+箭头图标）
3. 选择「添加到主屏幕」
4. 确认名称后点击「添加」
5. 从主屏幕图标打开即为全屏 PWA 模式

## 9. 可选：Firebase Emulators（本地开发用）

如果想在本地测试而不连接线上 Firebase：

```bash
npm install -g firebase-tools
firebase init emulators  # 启用 Auth, Firestore, Storage emulators
firebase emulators:start
```

在 `.env` 中添加：
```env
VITE_USE_EMULATORS=true
```

## 注意事项

- `.env` 文件包含 Firebase 配置，已在 `.gitignore` 中排除，**不要提交到 Git**
- 食物和套餐数据所有用户共享，每日记录和目标仅自己可见
- 照片上传限制 5MB，会自动压缩至 800px 宽度
- Firestore 离线缓存已启用，断网后仍可使用，恢复网络后自动同步
- Zustand persist 提供了额外的 localStorage 缓存层，确保快速加载
