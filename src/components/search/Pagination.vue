<template>
  <div class="pagination">
    <button :disabled="isFirstPage" @click="changePage(internalPage - 1)">Previous</button>
    <span>Page {{ internalPage }} of {{ totalPages }}</span>
    <button :disabled="isLastPage" @click="changePage(internalPage + 1)">Next</button>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';

const props = defineProps<{
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
}>();

const emit = defineEmits(['page-change']);

const internalPage = ref(props.currentPage);

watch([() => props.currentPage, () => props.totalItems], () => {
  internalPage.value = props.currentPage;
}, { immediate: true });

const isFirstPage = computed(() => internalPage.value <= 1);
const isLastPage = computed(() => internalPage.value >= totalPages.value);
const totalPages = computed(() => Math.max(1, Math.ceil(props.totalItems / props.itemsPerPage)));

const changePage = (page: number) => {
  internalPage.value = page;
  emit('page-change', page);
};
</script>

<style scoped>
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  margin: 1rem 0;
}

button {
  padding: 0.5rem 1rem;
  cursor: pointer;
  font-style: normal;
  text-wrap-mode: nowrap;
  width: 6rem;
}

span {
  text-wrap-mode: nowrap;
}

.pagination button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
