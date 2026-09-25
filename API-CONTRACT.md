# 前端服务对接约定

以下是为后续后端联调预留的建议接口约定，不代表后台已经实现。

## 共通约定

- 金额使用整数分，折扣用整数百分比，例如95表示9.5折。
- 分页：`page`, `pageSize`；响应示例 `{ code: 0, data, message }`。
- 用户身份由登录会话及服务端鉴权确定，不能信任客户端userId、role、积分、价格或中奖结果。
- 订单、转账、兑奖、积分兑换等写操作使用服务端发放的幂等键。
- 前端的展示状态由服务端返回的最终或处理中状态驱动，不从弹窗确认或微信界面唤起成功推断已付款/到账。

| 功能 | 建议接口 | 主要字段/约束 |
| --- | --- | --- |
| 登录 | POST /mini/auth/wechat | code交换登录态，OpenID关联在服务端完成 |
| 商品 | GET /mini/products、GET /mini/products/:id | id,name,spec,price,originalPrice,images,stock,category |
| 地址 | GET/POST/PATCH /mini/addresses | 收货人、电话、地区、详细地址、默认标记 |
| 活动券 | GET /mini/coupons/templates | 类型、门槛、件数、适用SKU、折扣上限、发放时段、人群资格 |
| 领取券 | POST /mini/coupons/:id/claim | 幂等、资格、领券次数、库存由服务端检查 |
| 我的券 | GET /mini/coupons | unused/locked/used/expired；保留规则版本 |
| 结算报价 | POST /mini/orders/quote | 服务端按商品数量、SKU、券、地址计算subtotal/discount/shipping/total |
| 创建订单 | POST /mini/orders | 服务端校验报价和库存；预占券；返回订单ID |
| 支付参数 | POST /mini/orders/:id/pay | 返回微信支付签名参数；不得把私钥置于前端 |
| 订单状态 | GET /mini/orders/:id | 微信支付回调由服务端验签和更新；前端查询 |
| 取消订单 | POST /mini/orders/:id/cancel | 只允许可取消状态，按规则释放库存和券 |
| 活动码抽奖 | POST /mini/draws | 由服务端校验活动码、资格、次数、奖池、概率与库存 |
| 红包记录 | GET /mini/rewards/cash/:id | pending/processing/received/failed/closed及允许的下一步操作 |
| 领取红包 | POST /mini/rewards/cash/:id/claim | 服务端调用商家转账，返回微信确认参数；查询与回调判定结果 |
| 我的奖品 | GET /mini/rewards | 奖品类型、领取方式、有效期、授权兑换码 |
| 积分账户 | GET /mini/points、GET /mini/points/records | balance、明细、有效期 |
| 兑换目录 | GET /mini/exchanges | 所需积分、库存、兑换上限、类型、履约方式 |
| 积分兑换 | POST /mini/exchanges/:id/redeem | 扣分、扣库存、发放权益保持事务一致和幂等 |
| 门店 | GET /mini/stores、GET /mini/stores/:id | 地址、电话、坐标、营业时间、服务码/客服码/社群码 |
| 核销查询 | POST /mini/staff/redemptions/lookup | 校验核销员身份与所属门店，查询个人奖品资格 |
| 确认核销 | POST /mini/staff/redemptions/confirm | 原子操作、一次性核销、防重放、审计记录 |
| 推广 | GET /mini/promotion、GET /mini/promotion/team | 服务端确认关系、业绩、佣金和状态 |
| 排行 | GET /mini/promotion/ranking | 统计周期、排名、奖励规则 |
| 推广码 | POST /mini/promotion/code | 服务端生成真实小程序码，不信任客户端推广归属 |
| 品牌配置 | GET /mini/brand | 视频号finderUserName、公众号二维码、客服、社群 |

## 微信接入位置

- 支付按钮在 `pages/order-detail/index.vue`。接入 `uni.requestPayment` 后，无论成功或取消，都向服务端查询实际订单状态；前端不直接把订单改为已付。
- 红包领取在 `pages/redpacket/index.vue`。依据商户实际权限选择确认收款或授权免确认模式，不使用支付按钮模拟转账。
- 扫码在 `pages/scan/index.vue`，当前识别到活动码只提示未接入；替换为服务端抽奖接口后展示返回结果。
- 核销在 `pages/verification/index.vue`，线上必须以服务端用户角色、门店范围、奖品资格为准。
- 公众号关注事件在公众号服务端接收并与小程序身份关联；视频号打开主页API不返回关注状态，前端不会因点击或返回自动发券。
- 门店与客服二维码由服务端配置实际图片/小程序码，替换当前清楚标注的占位图。

## 需确认的运营配置

实际商品及参考价格、正式门店及坐标、活动期限和库存、人群资格、积分规则、取消/退款/部分退款的返券分摊、佣金结算和核销员权限。前端演示默认每单一张券、不可叠加、门槛不计运费。
