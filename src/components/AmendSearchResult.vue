<template>
  <div class="custom-result">
    <!-- Always visible table row header -->
    <div class="table-row-view">
      <div class="table-cell date-cell">{{ result.meta.date }}</div>
      <div class="table-cell type-cell">{{ result.filters?.type[0] }}</div>
      <div class="table-cell title-cell">
        <a :href="result.raw_url" class="title-link">{{ result.meta.title }}</a>
      </div>
      <div class="table-cell expand-cell">
        <button
          type="button"
          @click="toggleExpand"
          class="expand-button-table"
          :aria-expanded="isExpanded"
          :aria-label="isExpanded ? 'Collapse details' : 'Expand details'"
        >
          {{ isExpanded ? 'Hide Detail' : 'Show Detail' }}
        </button>
      </div>
    </div>

    <!-- Expanded detailed view -->
    <div v-if="isExpanded" class="expanded-view">
      <!-- Full content -->
      <div class="result-content">
        <div class="result-text">
          <p v-if="searchQuery" class="result-excerpt" v-html="result.excerpt"></p>

          <dl v-if="result.meta.topics" class="topics-container">
            <dt>State of Origin:</dt>
            <dd>{{ result.filters?.state_of_origin[0] }}</dd>
            <dt>Congress:</dt>
            <dd>{{ result.filters?.congress[0] }}</dd>
            <dt>Summary:</dt>
            <dd>{{ result.meta.summary }}</dd>
            <dt>Text:</dt>
            <dd>{{ result.meta.text }}</dd>
            <dt>Ratification Status:</dt>
            <dd>{{ result.filters?.ratification_status[0] }}</dd>
            <dt>Chamber:</dt>
            <dd>{{ result.filters?.chamber[0] }}</dd>
            <dt>Sponsor:</dt>
            <dd>{{ result.filters?.sponsor_or_proponent[0] }}</dd>
            <dt>Topics:</dt>
            <dd class="topics-list">
              <a
                v-for="topic in getTopicsArray(result.meta.topics)"
                :key="topic"
                class="topic-link"
                :href="`/amend?topics=${topic}`"
              >
                {{ topic }}
              </a>
            </dd>
            <dt>Comments:</dt>
            <dd>{{ result.meta.comments_external }}</dd>
            <dt>Record Source:</dt>
            <dd>{{ result.meta.record_source }}</dd>
            <dt>Detail View:</dt>
            <dd>
              <a :href="result.raw_url">{{ result.meta.unique_id }}</a>
            </dd>
          </dl>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { ResultData } from './types'

interface Props {
  result: ResultData
  searchQuery?: string
}

defineProps<Props>()

// Reactive state for expand/collapse
const isExpanded = ref(false)

// Helper function to parse topics if they come as a string
const getTopicsArray = (topics: string): string[] => {
  return topics
    .split('|')
    .map((topic) => topic.trim())
    .filter(Boolean)
}

// Toggle expansion, stop event propagation to avoid parent handlers
function toggleExpand(event: MouseEvent) {
  event.stopPropagation()
  isExpanded.value = !isExpanded.value
}
</script>

<style scoped>
.custom-result {
  background: #f8f8ff;
  border: 1px solid rgba(0, 0, 0, 0.3);
  margin-bottom: 0.5rem;
  border-radius: 4px;
  overflow: visible;
}

/* Table row view (collapsed) */
.table-row-view {
  display: grid;
  grid-template-columns: 150px 200px 1fr 120px;
  gap: 1rem;
  align-items: center;
  padding: 0.75rem 1.5rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  min-height: 60px; /* Ensure consistent row height */
  transition: background-color 0.2s ease;
}

.table-cell {
  padding: 0.5rem 0;
  overflow: hidden; /* Prevent content from breaking grid */
}

.date-cell {
  font-size: 0.9rem;
  white-space: nowrap;
  font-weight: 500;
  text-align: left;
}

.type-cell {
  font-size: 0.9rem;
  white-space: nowrap;
  font-weight: 500;
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
}

.title-cell {
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.title-link {
  color: #000;
}

.expand-cell {
  text-align: center;
}

.expand-button-table {
  border: 1px solid black;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  border-radius: 2px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  transform: scale(1);
}

.expand-button-table:hover {
  background: #f4794d;
}

/* Transition animations */
.expand-enter-active {
  transition:
    max-height 0.4s ease,
    opacity 0.3s ease;
  overflow: hidden;
}

.expand-leave-active {
  transition:
    max-height 0.4s ease,
    opacity 0.25s ease;
  overflow: hidden;
}

.expand-enter-from {
  max-height: 0;
  opacity: 0;
}

.expand-enter-to {
  max-height: 2000px;
  opacity: 1;
}

.expand-leave-from {
  max-height: 2000px;
  opacity: 1;
}

.expand-leave-to {
  max-height: 0;
  opacity: 0;
}

/* Expanded detailed view */
.expanded-view {
  overflow: visible;
  padding: 1.5rem;
}

.result-header {
  margin-bottom: 1rem;
}

a {
  color: inherit;
  text-underline-offset: 4px;
}

.result-title {
  color: #000;
  text-decoration: none;
  margin: 0 0 0.5rem 0;
  font-size: 1.25rem;
  font-weight: 600;
  line-height: 1.4;
}

/* Full content in expanded view */
.result-content {
  display: flex;
  gap: 1.5rem;
  align-items: flex-start;
  padding-top: 1rem;
}

.result-text {
  flex: 1;
}

.result-excerpt {
  margin: 0 0 1rem 0;
  line-height: 1.6;
  color: #495057;
  font-style: italic;
}

.result-excerpt :deep(mark) {
  background-color: #fff3cd;
  color: #856404;
  padding: 0.1rem 0.2rem;
  border-radius: 3px;
  font-weight: 600;
}

.flex-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.topics-container {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.75rem 1rem;
  align-items: center;
  margin: 0;
}

.topics-container dt {
  font-weight: 600;
  color: #495057;
  margin: 0;
  grid-column: 1;
}

.topics-container dd {
  margin: 0;
  grid-column: 2;
  color: #3d3d3d;
}

.topics-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin: 0;
  grid-column: 2;
}

.result-image {
  max-width: 200px;
  height: auto;
  border-radius: 4px;
}

/* Responsive design */
@media (max-width: 768px) {
  .table-row-view {
    grid-template-columns: 1fr;
    gap: 0.5rem;
    text-align: left;
  }

  .table-cell {
    border-bottom: 1px solid rgba(0, 0, 0, 0.1);
    padding-bottom: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .table-cell:last-child {
    border-bottom: none;
    margin-bottom: 0;
  }

  .date-cell::before {
    content: 'Date: ';
    font-weight: 600;
    color: #495057;
  }

  .type-cell::before {
    content: 'Type: ';
    font-weight: 600;
    color: #495057;
  }
}
</style>
