<script setup lang="ts">
// App.vue es el root component — todo el routing pasa por <router-view>
</script>

<template>
  <router-view v-slot="{ Component, route }">
    <transition :name="route.meta.transition as string || 'fade'" mode="out-in">
      <component :is="Component" :key="route.path" />
    </transition>
  </router-view>
</template>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
