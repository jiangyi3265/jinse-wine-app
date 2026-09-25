import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'
const paths = {
 home:'<path d="m3 10 9-7 9 7v11h-6v-7H9v7H3z"/>',bag:'<path d="M5 5h14l1 16H4L5 5Z"/><path d="M8 8a4 4 0 0 0 8 0"/>',
 scan:'<path d="M3 9V5a2 2 0 0 1 2-2h4m6 0h4a2 2 0 0 1 2 2v4m0 6v4a2 2 0 0 1-2 2h-4m-6 0H5a2 2 0 0 1-2-2v-4M3 12h18"/>',
 share:'<circle cx="18" cy="5" r="3"/><circle cx="5" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8 10 7-4M8 14l7 4"/>',
 user:'<circle cx="12" cy="7" r="4"/><path d="M3 22v-2a9 9 0 0 1 18 0v2Z"/>',users:'<circle cx="9" cy="7" r="4"/><path d="M1 22v-3a8 8 0 0 1 16 0v3H1m15-19a4 4 0 0 1 0 8m4 11v-3a8 8 0 0 0-3-6"/>',
 shop:'<path d="m3 3-2 6a4 4 0 0 0 6 3 4 4 0 0 0 5 0 4 4 0 0 0 5 0 4 4 0 0 0 6-3l-2-6H3Zm0 10v8h18v-8M2 8h20"/>',
 coin:'<ellipse cx="12" cy="5" rx="9" ry="4"/><path d="M3 5v14c0 5 18 5 18 0V5M3 10c0 5 18 5 18 0M3 15c0 5 18 5 18 0"/>',
 coupon:'<path d="M3 3h18v6a3 3 0 0 0 0 6v6H3v-6a3 3 0 0 0 0-6V3Z"/><path stroke-dasharray="2 2" d="M9 4v16"/>',gift:'<path d="M2 9h20v5H2zM4 14v8h16v-8M12 9v13"/><path d="M12 9C-2 7 6-4 12 9c6-13 14-2 0 0Z"/>',
 pin:'<path d="M20 9c0 6-8 14-8 14S4 15 4 9a8 8 0 1 1 16 0Z"/><circle cx="12" cy="9" r="3"/>',search:'<circle cx="10" cy="10" r="7"/><path d="m15 15 7 7"/>',arrow:'<path d="M4 12h16m-5-5 5 5-5 5"/>',chevron:'<path d="m9 5 7 7-7 7"/>',back:'<path d="m15 3-9 9 9 9"/>',check:'<path d="m4 12 5 5L21 5"/>',
 phone:'<path d="m5 2 5 5-3 3c2 4 3 5 7 7l3-3 5 5c-3 7-10 1-14-3S-2 5 5 2Z"/>',navigation:'<path d="m2 10 20-8-8 20-3-9-9-3Z"/>',headset:'<path d="M3 14V11a9 9 0 0 1 18 0v3M3 12H1v8h5v-8H3m18 0h2v8h-5v-8h3m-2 8c0 3-3 3-7 3"/>',
 qr:'<path d="M2 2h7v7H2zM15 2h7v7h-7zM2 15h7v7H2zM15 15h3v3h-3zM21 14v8h-6M12 2v10H2m10 4v6M18 12h4"/>',clock:'<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 3"/>',info:'<circle cx="12" cy="12" r="10"/><path d="M12 11v7M12 6v2"/>',
 truck:'<path d="M1 4h13v13H1V4Zm13 5h5l4 5v3h-9"/><circle cx="5" cy="19" r="3"/><circle cx="19" cy="19" r="3"/>',box:'<path d="m12 2 10 5v11l-10 5L2 18V7l10-5Zm0 10L2 7m10 5 10-5M12 12v11M7 4l10 6"/>',wallet:'<path d="M3 6V3h15v3M2 6h20v16H2V6Zm20 5h-8v6h8"/><circle cx="17" cy="14" r="1"/>',order:'<path d="M20 10V2H3v20h10M7 6h9M7 10h7M7 14h4m3 4 3 3 6-8"/>',
 trophy:'<path d="M6 2h12v9a6 6 0 0 1-12 0V2Zm0 3H2v5a5 5 0 0 0 5 5m11-10h4v5a5 5 0 0 1-5 5m-5 2v5m-5 0h10"/>',bell:'<path d="M4 17h16l-2-4V8a6 6 0 0 0-12 0v5l-2 4Zm5 3a3 3 0 0 0 6 0"/>',play:'<circle cx="12" cy="12" r="10"/><path d="m9 7 8 5-8 5V7Z"/>',
 wechat:'<path d="M14 13c0-5 9-5 9 0 0 2-1 3-2 4v3l-3-2c-4 1-6-1-6-3"/><path d="M18 7C16-1 1 0 1 9c0 3 2 5 4 6v4l4-3h2"/><circle cx="6" cy="8" r=".6"/><circle cx="12" cy="8" r=".6"/>',crown:'<path d="m2 6 5 4 5-7 5 7 5-4-3 14H5L2 6Zm3 11h14"/>',export:'<path d="M5 10H2v12h20V10h-3M12 17V2m-5 5 5-5 5 5"/>',close:'<path d="m5 5 14 14M5 19 19 5"/>',location:'<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/><path d="M12 1v4m0 14v4M1 12h4m14 0h4"/>',
}
await mkdir('static/icons',{recursive:true})
for(const [name,path] of Object.entries(paths))for(const [tone,color] of Object.entries({ink:'#182D28',muted:'#707680',gold:'#C0AA7D',light:'#F7F7F2'})){
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="72" height="72" fill="none" stroke="${color}" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`
 await sharp(Buffer.from(svg)).png().toFile(`static/icons/${name}-${tone}.png`)
}
const cells=[]
for(let y=0;y<29;y++)for(let x=0;x<29;x++){
 const finder=(ox,oy)=>x>=ox&&x<ox+7&&y>=oy&&y<oy+7 ? (x===ox||x===ox+6||y===oy||y===oy+6||(x>=ox+2&&x<=ox+4&&y>=oy+2&&y<=oy+4)) : false
 const inCorner=(x<8&&y<8)||(x>20&&y<8)||(x<8&&y>20)
 if(finder(0,0)||finder(22,0)||finder(0,22)||(!inCorner&&(x*17+y*13+x*y)%7<3))cells.push(`<rect x="${x+2}" y="${y+2}" width="1" height="1"/>`)
}
await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="330" height="330" viewBox="0 0 33 33"><rect width="33" height="33" fill="#fafaf7"/><g fill="#12241d">${cells.join('')}</g></svg>`)).png().toFile('static/design/qr-demo.png')
console.log('Icons and intentionally non-functional demo QR generated')
