# 前端服务对接约定

以下为三端当前统一服务契约。目录、会员交易、积分兑换、抽奖、奖品、核销和推广接口已经提供；微信真实凭据缺失时，登录、支付和现金到账按约定返回配置错误。

## 共通约定

- 金额使用整数分，折扣用整数百分比，例如95表示9.5折。
- 分页：管理端使用 `pageNum`, `pageSize`；小程序列表目前按会员返回有限列表。小程序响应为 `{ code: 0, data, message }`，管理端沿用若依 `{ code: 200, rows, total, msg }`。
- 用户身份由登录会话及服务端鉴权确定，不能信任客户端userId、role、积分、价格或中奖结果。
- 订单、转账、兑奖、积分兑换等写操作使用服务端发放的幂等键。
- 前端的展示状态由服务端返回的最终或处理中状态驱动，不从弹窗确认或微信界面唤起成功推断已付款/到账。

| 功能 | 建议接口 | 主要字段/约束 |
| --- | --- | --- |
| 登录 | POST /mini/auth/wechat | code交换登录态，OpenID关联在服务端完成；可带 inviteCode 绑定推广上级 |
| 会员资料 | GET/PATCH /mini/me、POST /mini/me/avatar | 昵称由会员修改；头像必须经会员 Bearer 会话上传，服务端仅接收图片且限制 2MB；手机号、VIP 和角色由服务端维护 |
| 商品 | GET /mini/products、GET /mini/products/:id | id,name,spec,price,originalPrice,images,stock,category |
| 地址 | GET/POST/PATCH /mini/addresses | 收货人、电话、地区、详细地址、默认标记 |
| 活动券 | GET /mini/coupons/templates | 类型、门槛、件数、适用SKU、折扣上限、发放时段、人群资格 |
| 领取券 | POST /mini/coupons/:id/claim | 幂等、资格、领券次数、库存由服务端检查 |
| 我的券 | GET /mini/coupons | unused/locked/used/expired；保留规则版本 |
| 结算报价 | POST /mini/orders/quote | 服务端按商品数量、SKU、券及配送地址/自提门店计算 subtotal/discount/shipping/total |
| 创建订单 | POST /mini/orders | delivery 需收货地址；pickup 需有效门店且免运费；服务端校验报价和库存并预占券 |
| 支付参数 | POST /mini/orders/:id/pay | 返回微信支付签名参数；不得把私钥置于前端 |
| 支付查单 | POST /mini/orders/:id/pay-sync | 会员本人触发微信商户查单；微信响应先经平台证书验签，返回订单和 `wechatTradeState`，成功交易再经金额、商户、币种及流水校验后落账；查询失败不得当作未付款 |
| 订单状态 | GET /mini/orders/:id | 微信支付回调由服务端验签和更新；前端查询 |
| 取消订单 | POST /mini/orders/:id/cancel | 只允许待支付订单取消；释放库存和券。已支付订单走退款流程，发货前退款含运费，进入发货状态后退款不含运费 |
| 活动码抽奖 | GET /mini/draws/prizes、GET /mini/draws、POST /mini/draws | 奖项目录只返回当前生效活动中已启用且有库存的奖项，不返回中奖概率；记录接口返回当前会员抽奖记录；POST 每批活动码扫码后由服务端校验活动码、资格、次数、奖池、概率与库存 |
| 红包记录 | GET /mini/rewards/cash/:id | 奖品状态、转账尝试状态、失败原因；查询微信渠道并返回最新状态 |
| 领取红包 | POST /mini/rewards/cash/:id/claim | 稳定商户单号幂等提交；返回 ACCEPTED/PROCESSING/WAIT_USER_CONFIRM/SUCCESS/FAIL/CANCELLED/UNKNOWN 状态和必要的微信确认参数 |
| 我的奖品 | GET /mini/rewards、GET /mini/rewards/:id/redeem-code | 奖品类型、领取方式、有效期、授权兑换码；实物奖品二维码由服务端按兑换码生成并缓存，生成失败时仍可使用文字兑换码 |
| 积分账户 | GET /mini/points、GET /mini/points/records | balance、明细、有效期 |
| 兑换目录 | GET /mini/exchanges | 所需积分、库存、兑换上限、类型、履约方式、`redeemStoreId/redeemStoreName`；门店为空表示全部合作门店 |
| 积分兑换 | POST /mini/exchanges/:id/redeem | 扣分、扣库存、发放权益保持事务一致和幂等 |
| 门店 | GET /mini/stores、GET /mini/stores/:id | 地址、电话、坐标、营业时间、服务码/客服码/社群码 |
| 核销查询 | POST /mini/staff/redemptions/lookup | 校验核销员身份与所属门店，查询个人奖品资格及兑换门店范围；返回领取会员 `memberName` 和脱敏 `memberPhone` |
| 确认核销 | POST /mini/staff/redemptions/confirm | 原子操作、一次性核销、防重放、审计记录 |
| 自提核销码 | GET /mini/orders/:id/pickup-code | 仅本人已支付的门店自提订单可获取官方小程序码 |
| 商城自提核销 | GET /mini/staff/orders、POST /mini/staff/orders/lookup、POST /mini/staff/orders/confirm | 查询核销历史；订单门店与核销员门店匹配、订单已支付、幂等且一次核销；成功后完成订单及积分/佣金 |
| 推广 | GET /mini/promotion、GET /mini/promotion/team | 服务端确认关系、业绩、佣金和状态 |
| 排行 | GET /mini/promotion/ranking | 统计周期、排名、奖励规则 |
| 推广码 | POST /mini/promotion/code | 可传 `{ "productCode": "classic" }`，返回稳定邀请码和直达该商品的官方小程序码；不传时保留首页推广码。二维码未就绪时仍返回邀请码和 `qrCodeStatus=pending`，分享链接归因可继续使用；二维码缓存就绪后返回 `qrCodeStatus=ready`。商品目录的 `sceneId` 用于扫码场景映射，不替代商品编码 `id`。 |
| 购物车 | GET/POST/PUT/DELETE /mini/cart | 商品、库存和数量由服务端校验；购物车只保存会员自己的商品 |
| 购物车结算 | POST /mini/orders/cart | 汇总购物车、计算运费/优惠、锁定库存和优惠券；可选配送或门店自提，成功后清空购物车 |
| 推广绑定/提现 | POST /mini/promotion/bind、POST /mini/promotion/withdraw | 关系只允许绑定一次；提现按最低金额、结算状态和幂等键处理 |
| 物流/售后 | GET /mini/orders/:id/delivery、POST /mini/orders/:id/refund | 订单归属、金额和状态由服务端校验 |
| 社群/渠道 | GET /mini/social/campaigns、GET /mini/social/subscribe-config、POST /mini/social/subscribe、GET /mini/channel | 会员在微信小程序主动授权后登记一次性额度；`POST /mini/social/subscribe` 使用会员级稳定 `requestId` 幂等，网络重试不会重复占用额度；后台只向有授权的目标会员创建任务；小程序渠道只返回展示字段，不返回内部渠道配置；企业微信群二维码过期时返回空地址并标记 `wechat.work.groupQrExpired=true` |
| 视频号/微信小店 | GET /mini/video、GET /mini/channel | 后台配置 Finder ID、直播/短视频 Feed 与 Nonce；小程序可跳转主页、直播与短视频。管理端可校验微信小店授权及 shopId；商品发布、SKU 库存对账、订单/售后摘要同步、发货/改价、售后审核、短视频商品挂载清单和退款对账台账均由后台维护；短视频最终挂载需视频号助手确认 |
| 品牌配置 | GET /mini/brand | 视频号finderUserName、公众号二维码、客服、社群 |
| 页面内容 | GET /mini/content、GET /mini/content/:key | 后台维护的导航、规则、页面文案及图片地址 |
| 公开素材 | GET /mini-assets/** | Java 服务发布的业务图片和图标，支持 CDN/路径替换 |

## 微信接入位置

- 支付按钮在 `pages/order-detail/index.vue`。接入 `uni.requestPayment` 后查询服务端订单；微信界面返回成功而回调未到时保留待确认标记，用户可调用商户查单接口补偿落账，期间不重复唤起支付。前端不直接把订单改为已付。
- 红包领取在 `pages/redpacket/index.vue`。收到 `packageInfo` 时通过微信 `requestMerchantTransfer` 调起商家转账确认；用户确认不等于到账，只有后端查单或验签回调成功才更新奖品状态。
- 扫码在 `pages/scan/index.vue`，API 模式把活动码提交到服务端抽奖接口；结果以服务端返回为准，未配置微信资金能力时不显示伪造到账。
- 核销在 `pages/verification/index.vue`，线上必须以服务端用户角色、门店范围、奖品资格为准。
- 商城自提在结算页选择履约方式；付款成功后订单详情提供官方核销码。员工端同页切换至“商城自提”，扫描或输入订单码，后端核对订单门店与核销员门店后才允许确认。
- 公众号关注事件在公众号服务端接收并与小程序身份关联；视频号打开主页API不返回关注状态，前端不会因点击或返回自动发券。
- VIP 活动提醒通过 `uni.requestSubscribeMessage` 主动获取会员同意；微信接口成功回执后才记为送达。请求结果未知时不自动重发，防止重复通知。该接口发送小程序服务通知，不具备向任意微信群批量发消息的能力。
- 门店与客服二维码由服务端配置实际图片/小程序码，替换当前清楚标注的占位图；前端 API 模式下业务图片和图标均不直接读取本地演示路径。

## 需确认的运营配置

实际商品及参考价格、正式门店及坐标、活动期限和库存、人群资格、积分规则、取消/退款/部分退款的返券分摊、佣金结算和核销员权限。退款金额由服务端按履约状态计算：发货前包含运费，发货后不含运费。前端演示默认每单一张券、不可叠加、门槛不计运费。
