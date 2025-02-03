<template>
  <div class="datalist-wrapper">
    <input 
      type="text"
      :list="listId"
      :value="modelValue"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      :placeholder="placeholder"
    />
    <datalist :id="listId">
      <option v-for="(count, value) in options" :key="value" :value="value">
        {{ value }} ({{ count }})
      </option>
    </datalist>
    <button 
      v-if="modelValue" 
      type="button" 
      class="clear-button" 
      @click="$emit('update:modelValue', '')"
    >
      ×
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  modelValue: string;
  options: { [key: string]: number };
  placeholder: string;
  listId: string;
}>();

defineEmits<{
  (e: 'update:modelValue', value: string): void;
}>();
</script>

<style scoped>
.datalist-wrapper {
  position: relative;
  width: 100%;
}

input {
  width: 100%;
  padding: 0.5rem;
  padding-right: 2rem;
  margin-bottom: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.clear-button {
  position: absolute;
  right: 0.5rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.2rem;
  color: #666;
  padding: 0;
  margin: 0;
}

.clear-button:hover {
  color: #333;
}
</style>
