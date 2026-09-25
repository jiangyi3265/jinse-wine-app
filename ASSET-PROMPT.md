# 图片编辑记录

- 使用工具：内置 ImageGen。
- 输入：从V3商品详情页提取的 `static/design/detail-scene.jpg`。
- 最终使用：`static/design/detail-scene-clean.jpg`。
- 目的：移除原图片固化的“1 / 3”轮播标记，页码由真实页面组件显示。
- 处理：内置工具完成编辑后，使用Sharp等比缩至900px宽并压缩为JPEG，原素材保留。

完整提示词：

Use case: precise-object-edit. Edit target: supplied product photograph extracted from the approved UI design. Remove ONLY the small dark rounded badge labelled '1 / 3' at the bottom right of the picture, reconstructing the continuous green and black marble tabletop underneath. Preserve every other detail exactly: same ivory porcelain bottle, same gold cap, exact gold Chinese label 金色酒业, same bottle position, same dark forest green curtains, same rock at left, same lighting, original camera framing and 384:278 landscape aspect ratio. No new objects, no other text, no design changes, no UI. Output a clean product photograph with no pagination mark.
