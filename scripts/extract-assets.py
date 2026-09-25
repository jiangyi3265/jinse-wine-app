"""Extract only photography from approved design boards, never UI controls or text."""
from pathlib import Path
from PIL import Image
root = Path(__file__).resolve().parents[2]
dest = root / '金色酒业/static/design'
dest.mkdir(parents=True, exist_ok=True)
boards = {
 'shop': root/'output/ui-design-v3/01-价格与订单优惠.png',
 'reward': root/'output/ui-design-v2/02-抽奖与兑换.png',
 'member': root/'output/ui-design-v2/03-会员与服务.png',
 'promo': root/'output/ui-design-v2/04-推广与门店核销.png',
 'coupons': root/'output/ui-design-v3/03-优惠券与积分兑换.png',
}
assets = {
 'product-classic': ('shop', (456,311,627,475)),
 'product-mellow': ('shop', (642,311,810,475)),
 'product-double': ('shop', (456,571,627,730)),
 'product-gift': ('shop', (642,571,810,730)),
 'hero-product': ('shop', (236,167,421,470)),
 'detail-scene': ('shop', (847,149,1231,427)),
 'detail-landscape': ('shop', (1029,743,1217,811)),
 'cup': ('member', (459,364,663,556)),
 'cups': ('member', (459,588,663,782)),
 'voucher': ('coupons', (880,451,1001,535)),
 'map': ('reward', (1255,218,1631,471)),
 'avatar': ('member', (58,173,131,246)),
 'store': ('promo', (1272,163,1356,232)),
 'landscape': ('promo', (848,818,1228,875)),
 'texture': ('reward', (49,155,142,330)),
}
for name, (key, bounds) in assets.items():
 im = Image.open(boards[key]).convert('RGB').crop(bounds)
 im.save(dest / f'{name}.jpg', quality=95, optimize=True)
 print(name, im.size)
