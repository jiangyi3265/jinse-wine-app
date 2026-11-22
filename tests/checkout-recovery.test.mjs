import test from 'node:test'
import assert from 'node:assert/strict'
import * as vue from 'vue'
import { loadPageScript } from './helpers/page-script.mjs'

async function harness() {
  const state=vue.reactive({ checkout:{source:'product',productId:'rice',quantity:1,addressId:1,fulfillmentMode:'delivery'}, addresses:[{id:1,name:'测试',phone:'13800000000'}],coupons:[] })
  const product={id:'rice',name:'米酒',price:14800}
  const valid={subtotal:14800,shipping:0,discount:0,total:14800}
  let quote=async()=>({...valid}),submissions=0
  const page=loadPageScript('checkout',{
    vue,'@dcloudio/uni-app':{onShow(){}},
    '../../services/store.js':{state,submitOrder:async()=>{submissions++;return{id:1}},quoteCheckout:()=>quote(),refreshDomain:async()=>{},loadCart:async()=>[],selectedCartItems:()=>[]},
    '../../services/catalog.js':{getProduct:()=>product,stores:[{storeId:15,name:'自提门店A'},{storeId:16,name:'自提门店B'}],loadProductCatalog:async()=>{},loadCouponCatalog:async()=>{},loadStoreCatalog:async()=>{}},
    '../../services/pricing.js':{quoteOrder:()=>valid,money:String},
    '../../services/navigation.js':{go(){},confirm:async()=>true,toast(){}},
    '../../services/config.js':{isApiMode:()=>true},'../../services/product-media.js':{productImage:String},
  }, { uni: { showActionSheet: ({success}) => success({tapIndex:1}) } })
  await page.loadCheckout();await vue.nextTick()
  return{page,valid,setQuote:fn=>{quote=fn},submissions:()=>submissions}
}

test('quote failure is actionable, blocks submission, and a retry restores the confirmed total',async()=>{
  const h=await harness();h.setQuote(async()=>{throw Error('网络暂时不可用')});await h.page.updateQuote()
  assert.equal(h.page.quoteError.value,'网络暂时不可用');assert.equal(h.page.quoteLoading.value,false)
  assert.equal(h.page.canSubmit.value,false);await h.page.submit();assert.equal(h.submissions(),0)
  h.setQuote(async()=>h.valid);await h.page.updateQuote()
  assert.equal(h.page.quoteError.value,'');assert.equal(h.page.canSubmit.value,true)
  assert.equal(h.page.quote.value.total,14800)
})

test('pickup waits for the customer to choose a store, delivery only requires an address', async () => {
  const {page} = await harness()
  await page.setFulfillment('pickup')
  await page.updateQuote()
  assert.equal(page.hasFulfillmentTarget.value, false)
  assert.equal(page.canSubmit.value, false)
  await page.openStoreSelect()
  await vue.nextTick()
  await page.updateQuote()
  assert.equal(page.selectedStore.value.storeId, 16)
  assert.equal(page.canSubmit.value, true)
  await page.setFulfillment('delivery')
  await page.updateQuote()
  assert.equal(page.canSubmit.value, true)
})

test('an old failed quote cannot replace a newer success or re-enable submission while calculating',async()=>{
  const h=await harness();let reject,resolve
  h.setQuote(()=>new Promise((yes,no)=>{reject=no}));const old=h.page.updateQuote()
  h.setQuote(()=>new Promise(yes=>{resolve=yes}));const current=h.page.updateQuote()
  assert.equal(h.page.quoteLoading.value,true);assert.equal(h.page.canSubmit.value,false)
  await h.page.submit();assert.equal(h.submissions(),0)
  resolve({...h.valid,total:29600});await current;reject(Error('旧请求失败'));await old
  assert.equal(h.page.quoteError.value,'');assert.equal(h.page.quote.value.total,29600)
  assert.equal(h.page.canSubmit.value,true)
})
