<script>
import { loadCatalog } from './services/catalog.js'
import { toast } from './services/navigation.js'

export default {
  onLaunch() {
    loadCatalog().catch((error) => toast(error.message))
  },
  onShow() {
    loadCatalog().catch((error) => toast(error.message))
  },
}
</script>
<style>@import './styles/app.css';</style>
