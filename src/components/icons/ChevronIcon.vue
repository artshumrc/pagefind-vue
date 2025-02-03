<template>
  <svg
    class="chevron-icon"
    xmlns="http://www.w3.org/2000/svg"
    :width="props.size || '16'"
    :height="props.size || '16'"
    :fill="props.color || '#000'"
    :style="{ transform: `rotate(${rotations[direction]}deg)` }"
    viewBox="0 0 256 256"
  >
    <path
      d="M213.66,101.66l-80,80a8,8,0,0,1-11.32,0l-80-80A8,8,0,0,1,53.66,90.34L128,164.69l74.34-74.35a8,8,0,0,1,11.32,11.32Z"
    ></path>
  </svg>
</template>

<script lang="ts" setup>
const props = defineProps<{
  direction: 'down' | 'up' | 'left' | 'right'
  size?: string
  color?: string
}>()

const rotations = {
  up: 180,
  left: 90,
  right: 270,
  down: 0,
}
</script>

<style>
.chevron-icon {
  transition: transform 0.2s ease-in-out;
}
</style>
