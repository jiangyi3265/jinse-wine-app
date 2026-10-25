import { reactive } from 'vue'

export const profileCompletion = reactive({ user: null, visible: false })
const promptedMembers = new Set()

export function offerProfileCompletion(user, force = false) {
  if (!user?.id) return
  const id = String(user.id)
  const complete = Boolean(user.name?.trim() && user.name !== '微信用户' && user.avatar)
  if (complete) {
    if (String(profileCompletion.user?.id) === id) profileCompletion.visible = false
    return
  }
  if (!force && promptedMembers.has(id)) return
  promptedMembers.add(id)
  profileCompletion.user = { ...user }
  profileCompletion.visible = true
}

export function dismissProfileCompletion() {
  profileCompletion.visible = false
}
