<script>
import { loadPresentationCatalog } from './services/catalog.js'
import { toast } from './services/navigation.js'
import { acceptEntryInvitation } from './services/invitation.js'

function acceptInvitation(options) {
  acceptEntryInvitation(options).catch(() => toast('推广关系暂未确认，将在下次操作时重试'))
}

function preloadCatalog() {
  loadPresentationCatalog().catch(() => {})
}

export default {
  onLaunch(options) {
    acceptInvitation(options)
    preloadCatalog()
  },
  onShow(options) {
    acceptInvitation(options)
    preloadCatalog()
  },
}
</script>
<style>@import './styles/app.css';</style>
