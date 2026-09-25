# jinse-wine-app

金色酒业用户端前端，使用 uni-app 和 Vue 3 提供微信小程序页面及 H5 预览。

## 项目简介

依据已确认的 V2/V3 UI 设计实现 28 个页面，覆盖商城搜索与分类、商品详情、结算、订单、优惠券、积分兑换、扫码奖品、现金红包状态、门店与兑奖码、会员资料、VIP 社群、推广海报、团队排行和门店核销等交互。

当前默认运行于 `demo` 模式：用户、商品、订单、券、积分、奖品等数据存储在本机；支付、红包到账、兑换和核销均为明确标注的演示。真实登录、库存、支付、发券、红包及后台接口尚未接入；切换 `mode` 不会自动获得服务端功能。服务约定见 [API-CONTRACT.md](API-CONTRACT.md)。

## 技术栈

- uni-app / DCloud `3.0.0-alpha-5020520260829001`、Vue 3.4.21。
- JavaScript、Vite 5.2.8、Vue I18n 9.14.5。
- 微信小程序和 H5 双端构建，原生 uni-app 组件与 CSS。
- Node.js 内置测试运行器、Playwright；Sharp / Python 用于素材处理脚本。

## 关联仓库

| 项目 | 说明 | GitHub |
| --- | --- | --- |
| jinse-wine-backend | 后端服务 | [jinse-wine-backend](https://github.com/jiangyi3265/jinse-wine-backend) |
| jinse-wine-admin | 管理后台 | [jinse-wine-admin](https://github.com/jiangyi3265/jinse-wine-admin) |
| jinse-wine-app | 用户端 | [jinse-wine-app](https://github.com/jiangyi3265/jinse-wine-app) |

本用户端计划通过 `jinse-wine-backend` 接入业务数据，运营配置由 `jinse-wine-admin` 承担；当前用户端独立演示，另两端的酒业专属功能仍待开发与联调。

## 快速启动

准备 Node.js 22 或 24 和 npm，在仓库根目录执行：

```bash
npm ci
npm run dev:h5
```

打开 `http://127.0.0.1:5173/`。H5 演示不依赖数据库和后端，页面使用本地示例数据。

```bash
npm run build:h5
npm run build:mp-weixin
npm test
```

- H5 产物：`dist/build/h5`，通过静态服务器访问。
- 微信产物：`dist/build/mp-weixin`，在微信开发者工具中导入，并使用自己具有权限的小程序 AppID（`manifest.json`）。AppID 是公开标识，AppSecret 不得写入前端。
- 微信开发模式：`npm run dev:mp-weixin`，输出 `dist/dev/mp-weixin`。
- HBuilderX 可直接打开项目；其运行产物位于 `unpackage/`。

uni-app 打包不等同于微信 WXSS 校验。本机安装微信开发者工具后，将 `WCSC_PATH` 设置为工具内 `wcsc.exe` 的路径，再运行 `npm run check:wxss`；HBuilderX 产物可运行 `npm run check:wxss -- unpackage/dist/dev/mp-weixin`。

## 项目结构

```text
pages/             28 个业务页面
components/        页面框架、导航、价格、优惠券、空状态与二维码组件
services/          演示数据、状态、计价、导航和服务配置
styles/            全局视觉与移动端适配
static/            商品摄影、图标与界面素材
tests/             金额计算、权益、订单与核销状态测试
scripts/           uni-app 启动、WXSS 检查、素材及打包脚本
docs/              详细前端说明
manifest.json      多端及微信小程序构建配置
pages.json         页面路由
```

## 验证与边界

现有 19 项自动测试覆盖满减、折扣、券门槛、领券防重、积分扣减、订单状态与核销防重等逻辑。此前已完成 H5 页面及三种手机宽度检查，并修复 WXSS 通配选择器兼容问题，详情见 [QA.md](QA.md)。微信真机支付、到账和正式账号 API 尚未联调。

本地状态键为 `jinse-frontend-v3-state-1`；清除该项可重置演示数据。正式二维码、门店坐标、公众号及视频号配置需要接入实际服务。素材来源与生成记录见 [ASSET-PROMPT.md](ASSET-PROMPT.md)，商品名称、价格及摄影为设计示例。

## 简历描述示例

基于 uni-app 与 Vue 3 实现金色酒业微信小程序及 H5 共 28 个页面，完成商城结算、优惠券、积分兑换、奖品核销和推广海报等前端演示流程。以整数分处理优惠计价，建立状态防重测试及 WXSS 平台兼容检查，为后续后端联调保留接口边界。

## 本地文件管理

`node_modules`、`dist`、`unpackage`、环境配置、密钥、IDE 配置、日志和测试产物均不提交。原始本地文件保留，公开仓库只包含源代码、必要资源、配置示例和说明文档。
