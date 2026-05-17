<script setup>
import { useSitesStore } from '../stores/sitesStore'
import Select from 'primevue/select'

const sitesStore = useSitesStore()
</script>

<template>
  <Select
    v-model="sitesStore.currentSiteId"
    :options="sitesStore.sites"
    optionLabel="name"
    optionValue="id"
    placeholder="Выберите сайт"
    class="site-select"
    @update:model-value="sitesStore.selectSite"
  />
</template>

<style scoped>
.site-select {
  min-width: 160px;
}
</style>
