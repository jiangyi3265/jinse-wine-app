import test from 'node:test'
import assert from 'node:assert/strict'
import * as vue from 'vue'
import { loadPageScript } from './helpers/page-script.mjs'
import { couponEligibility } from '../services/pricing.js'
function harness() {
  const cart = [{ id:1, name:'商品A', productId:'a', quantity:1, price:1000, stock:10 },{id:2,name:'商品B',productId:'b',quantity:2,price:2000,stock:10}]
  const calls=[], state=vue.reactive({checkout:{},addresses:[],coupons:[]})
  let update = async (id,q)=>{cart.find(x=>x.id===id).quantity=q}, read = async()=>cart.map(x=>({...x}))
  const page=loadPageScript('cart',{
    vue,'@dcloudio/uni-app':{onShow(){}},
    '../../services/navigation.js':{go:(...args)=>calls.push(['go',...args]),toast:message=>calls.push(['toast',message]),confirm:async()=>true},
    '../../services/config.js':{isApiMode:()=>true},'../../services/product-media.js':{productImage:String},
    '../../services/store.js':{state,loadCart:()=>read(),updateCartItem:(id,q)=>update(id,q),removeCartItem:async id=>cart.splice(cart.findIndex(x=>x.id===id),1),prepareCartCheckout:ids=>calls.push(['prepare',ids]),quoteCartOrder:async()=>{throw Error('cart must not quote')},refreshDomain:async()=>{}},
    '../../services/catalog.js':{stores:[],loadCouponCatalog:async()=>{},loadStoreCatalog:async()=>{}},'../../services/pricing.js':{couponEligibility}
  });return{page,cart,calls,setUpdate:fn=>{update=fn},setRead:fn=>{read=fn}}
}
test('selection and all-select calculate only chosen items and navigate without creating an order',async()=>{const h=harness();await h.page.refresh();assert.equal(h.page.total.value,5000);h.page.toggle(2);assert.equal(h.page.total.value,1000);h.page.checkout();assert.deepEqual(h.calls,[['prepare',['1']],['go','checkout']]);h.page.toggleAll();assert.equal(h.page.totalQuantity.value,3);h.page.toggleAll();assert.equal(h.page.total.value,0);h.page.checkout();assert.equal(h.calls.at(-1)[0],'toast')})
test('unselected unavailable item cannot block available selected products',async()=>{const h=harness();h.cart[1].stock=0;await h.page.refresh();assert.deepEqual([...h.page.selectedIds.value],['1']);h.page.checkout();assert.equal(h.calls.at(-1)[1],'checkout');h.page.toggle(2);h.page.checkout();assert.equal(h.calls.at(-1)[0],'toast')})
test('quantity adjustment retains selection and removal preserves unchecked items',async()=>{const h=harness();await h.page.refresh();h.page.toggle(2);await h.page.change(h.cart[0],1);assert.equal(h.page.total.value,2000);await h.page.removeSelected();assert.deepEqual(h.cart.map(x=>x.id),[2]);assert.equal(h.page.total.value,0)})

test('minus at quantity one never silently deletes a cart item', async()=>{
  const h=harness();await h.page.refresh();await h.page.change(h.page.items.value[0],-1)
  assert.equal(h.cart.length,2);assert.equal(h.cart[0].quantity,1)
})

test('a pending cart change blocks duplicate writes and checkout without blanking the list', async()=>{
  const h=harness();await h.page.refresh();let finish,writes=0
  h.setUpdate((id,q)=>{writes++;return new Promise(resolve=>{finish=()=>{h.cart.find(x=>x.id===id).quantity=q;resolve()}})})
  const pending=h.page.change(h.page.items.value[0],1)
  await h.page.change(h.page.items.value[0],1);h.page.checkout();h.page.toggle(2)
  assert.equal(h.page.submitting.value,true);assert.equal(h.page.loading.value,false)
  assert.equal(h.page.items.value.length,2);assert.equal(h.page.chosen.value.length,2)
  assert.equal(writes,1);assert.equal(h.calls.some(c=>c[0]==='prepare'),false)
  finish();await pending
  assert.equal(h.page.submitting.value,false);assert.equal(h.page.total.value,6000)
  h.page.checkout();assert.equal(h.calls.at(-1)[1],'checkout')
})

test('failed refresh after a write cannot send stale cart quantities into checkout', async()=>{
  const h=harness();await h.page.refresh();h.setRead(async()=>{throw Error('断网')})
  await h.page.change(h.page.items.value[0],1)
  assert.equal(h.page.loadError.value,'断网');assert.equal(h.page.submitting.value,false)
  h.page.checkout();assert.equal(h.calls.some(c=>c[0]==='prepare'),false)
  h.setRead(async()=>h.cart.map(x=>({...x})));await h.page.refresh()
  assert.equal(h.page.items.value[0].quantity,2);h.page.checkout()
  assert.equal(h.calls.at(-1)[1],'checkout')
})
