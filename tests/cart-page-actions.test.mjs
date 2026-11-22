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
test('checkout selects available lines only, including after a stock change', async () => {
  const h = harness()
  await h.page.refresh()
  h.cart[1].stock = 0
  await h.page.refresh()
  assert.deepEqual([...h.page.selectedIds.value], ['1'])
  assert.equal(h.page.allSelected.value, true)
  h.page.toggleAll()
  h.page.toggleAll()
  h.page.toggle(2)
  assert.deepEqual([...h.page.selectedIds.value], ['1'])
  h.page.checkout()
  assert.deepEqual(h.calls, [['prepare', ['1']], ['go', 'checkout']])
})
test('deletion starts unselected, allows sold-out items and retains the purchase selection', async () => {
  const h = harness()
  h.cart[1].stock = 0
  await h.page.refresh()
  await h.page.change(h.cart[0], 1)
  assert.equal(h.page.total.value, 2000)
  h.page.toggleManaging()
  assert.equal(h.page.chosen.value.length, 0)
  await h.page.removeSelected()
  assert.equal(h.cart.length, 2)
  h.page.toggle(2)
  await h.page.removeSelected()
  h.page.toggleManaging()
  assert.deepEqual(h.cart.map(x => x.id), [1])
  assert.equal(h.page.total.value, 2000)
  h.page.toggleManaging()
  h.page.toggleAll()
  await h.page.removeSelected()
  assert.equal(h.page.itemQuantity.value, 0)
  assert.equal(h.page.managing.value, false)
})

test('quantity edits respect both stock and the API limit for a single update', async () => {
  const h = harness()
  Object.assign(h.cart[0], {quantity: 99, stock: 150})
  let writes = 0
  h.setUpdate(async (id, quantity) => { writes++; h.cart[0].quantity = quantity })
  await h.page.refresh()
  await h.page.change(h.cart[0], 1)
  assert.equal(writes, 0)
  Object.assign(h.cart[0], {quantity: 110, stock: 105})
  await h.page.adjustToStock(h.cart[0])
  assert.equal(h.cart[0].quantity, 99)
  h.cart[0].stock = 4
  await h.page.adjustToStock(h.cart[0])
  assert.equal(h.cart[0].quantity, 4)
  h.cart[0].stock = 0
  await h.page.change(h.cart[0], -1)
  assert.equal(writes, 2)
})

test('late cart reads cannot hide the newer list or restore stale quantities', async () => {
  const h = harness()
  let reject
  h.setRead(() => new Promise((_, fail) => { reject = fail }))
  const stale = h.page.refresh()
  h.setRead(async () => [{...h.cart[0], quantity: 3}])
  await h.page.refresh()
  reject(Error('旧请求超时'))
  await stale
  assert.equal(h.page.loadError.value, '')
  assert.equal(h.page.itemQuantity.value, 3)
})

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
