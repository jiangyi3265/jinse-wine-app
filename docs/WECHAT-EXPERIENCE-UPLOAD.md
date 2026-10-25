# 微信体验版上传

2026-10-10 官方 CLI 已成功上传 `1.0.20261010.1630`（1,852,057 字节），包含第三方门票原始票码展示、抽奖记录布局优化，连接线上 HTTPS 并开启域名校验。对应后台、Java 和 H5 已部署。当前未确认公众平台已将此版本选为体验版，未提交正式审核或正式发布；临时线上预览码为工作区 `.tools/external-ticket-local/mini-preview-online.png`。部署回执详见后端 `docs/evidence/20261010-external-ticket-deployment.md`。

2026-10-09 已通过官方 CLI 上传 `1.0.20261009.1550`（1,826,679 字节），包含会员售后分页及完整可申请数量修复，连接线上 HTTPS。上传成功不代表公众平台已选为体验版或正式发布；本次未确认该选择。证据位于后端 `docs/evidence/20261009-member-aftersale-pagination.md`。

## 当前代码包

- AppID：`wx7e0ac06d1c28077a`
- API（上传体验版/正式包）：`https://jiuyekl.oksja.cn`
- API（本机开发包）：`http://127.0.0.1:8080`
- 入口：`pages/index/index`
- 上传目录：`D:\zhangq\jiuye\jinse-wine-app\unpackage\dist\build\mp-weixin`
- 开发目录：`D:\zhangq\jiuye\jinse-wine-app\unpackage\dist\dev\mp-weixin`

上传目录使用线上 HTTPS 并开启合法域名校验；开发目录使用本机 `http://127.0.0.1:8080`，脚本会自动关闭开发包的 URL 校验。微信开发者工具联调本机 Java 时打开开发目录，体验版上传时必须打开上述**上传目录**，不要混用两个目录。修改 `.env.development.local` 后须重启 `npm run dev:mp-weixin` 才会重新编译。以上检查不代表真机业务验收通过。

电脑已安装 scrcpy 4.1，可用安卓 ADB 投屏；当前 USB 连接在 Windows 报设备描述符错误，ADB 尚未识别手机。也可直接在微信开发者工具点击“真机调试”扫码，无需 USB。2026-10-07 已用开发者工具 CLI 成功生成约 1.1 MB 的预览包和二维码，二维码保存在工作区 `.tools/mini-device-preview-20261007.png`；预览码有时效，过期后重新运行 `cli.bat preview --project D:\zhangq\jiuye\jinse-wine-app\unpackage\dist\build\mp-weixin --qr-format image --qr-output <目标图片路径>`。

## 上传步骤

1. 微信公众平台 → 开发管理 → 开发设置 → 服务器域名：在 request、uploadFile、downloadFile 三项中分别加入 `https://jiuyekl.oksja.cn`，不带路径。
2. 在微信开发者工具打开上述上传目录，确认 AppID，编译并检查首页。首次切换服务器如残留本地会员状态，可在开发者工具清除小程序缓存后编译。
3. 点击“上传”，填写本次版本号及说明。
4. 微信公众平台 → 管理 → 版本管理 → 开发版本，将刚上传的版本选为体验版；在成员管理中添加需要体验的微信账号，然后扫码体验。

不要将 AppSecret 写进小程序代码；它仅用于服务器。体验版上的订单、积分、抽奖等操作会访问线上数据。微信支付、红包、企业微信和微信小店能力还须按后台上线检查配置并取得真实平台回执。

## 后续重新构建

在小程序项目目录运行 `npm run build:mp-weixin`，输出到上述上传目录。正式接口由 `.env.production` 的 `VITE_MINI_API_BASE_URL` 设置；开发工具接口由 `.env.development.local` 的 `VITE_MINI_MP_DEV_API_BASE_URL=http://127.0.0.1:8080` 设置，修改后重启 `npm run dev:mp-weixin`。本机后端、Redis、MinIO 未启动时，开发目录会显示网络错误；先执行后端 `bin/start-local.ps1`。

## 抽奖普通链接二维码

- 前缀：`https://jiuyekl.oksja.cn/qr/lottery/`
- 小程序功能页面：`pages/scan/index`
- 测试链接：后台实际生成的完整 `linkUrl`。
- 页面参数：微信自动传入 `q`，无须手工附加。

完整字段和域名校验文件操作见后端文档 `docs/WECHAT-DOMAIN-QR-SETUP.md`。普通链接规则与服务器合法域名是两项独立配置；体验版上传不代表普通链接扫码规则已生效。
