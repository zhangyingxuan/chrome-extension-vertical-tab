<template>
  <div class="modal-overlay" @click="$emit('close')">
    <div class="modal-content" @click.stop>
      <h3>{{ title }}</h3>
      <div class="modal-body">
        <div v-if="type === 'rename'">
          <input
            v-model="localTitle"
            type="text"
            placeholder="输入分组名称"
            @keyup.enter="$emit('confirm')"
          />
        </div>
        <div v-if="type === 'color'">
          <div class="color-options">
            <div
              v-for="color in GROUP_COLORS"
              :key="color.value"
              class="color-option"
              :class="{ active: localColor === color.value }"
              :style="{ backgroundColor: getGroupColor(color.value) }"
              @click="localColor = color.value"
            >
              {{ color.label }}
            </div>
          </div>
        </div>
      </div>
      <div class="modal-actions">
        <button @click="$emit('close')">取消</button>
        <button @click="$emit('confirm')">确认</button>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, watch } from "vue";
import { GROUP_COLORS } from "../type";

interface Props {
  type: "rename" | "color";
  title: string;
  groupId: number | null;
  newTitle: string;
  selectedColor: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  close: [];
  confirm: [];
}>();

const localTitle = ref(props.newTitle);
const localColor = ref(props.selectedColor);

// 监听props变化，更新本地状态
watch(
  () => props.newTitle,
  (newValue) => {
    localTitle.value = newValue;
  }
);

watch(
  () => props.selectedColor,
  (newValue) => {
    localColor.value = newValue;
  }
);

const getGroupColor = (color: string): string => {
  const colorMap: { [key: string]: string } = {
    grey: "#999",
    blue: "#4285f4",
    red: "#ea4335",
    yellow: "#fbbc05",
    green: "#34a853",
    pink: "#f28b82",
    purple: "#a142f4",
    cyan: "#24c1e0",
  };
  return colorMap[color] || "#999";
};
</script>

<style lang="less" scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: var(--modal-bg);
  border-radius: 8px;
  padding: 20px;
  min-width: 300px;
  max-width: 500px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);

  h3 {
    margin: 0 0 16px 0;
    font-size: 16px;
    color: var(--font-color);
  }

  .modal-body {
    margin-bottom: 20px;

    input {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid var(--input-border);
      border-radius: 4px;
      background: var(--input-bg);
      color: var(--font-color);
      font-size: 14px;

      &:focus {
        outline: none;
        border-color: var(--primary-color);
      }
    }

    .color-options {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;

      .color-option {
        padding: 12px;
        border-radius: 4px;
        text-align: center;
        cursor: pointer;
        font-size: 12px;
        color: white;
        transition: transform 0.2s, box-shadow 0.2s;

        &.active {
          transform: scale(1.05);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        }

        &:hover {
          transform: scale(1.02);
        }
      }
    }
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;

    button {
      padding: 8px 16px;
      border: 1px solid var(--button-border);
      border-radius: 4px;
      background: var(--button-bg);
      color: var(--font-color);
      cursor: pointer;
      transition: background-color 0.2s;

      &:hover {
        background: var(--button-hover-bg);
      }

      &:last-child {
        background: var(--primary-color);
        color: white;
        border-color: var(--primary-color);

        &:hover {
          background: var(--primary-hover-color);
        }
      }
    }
  }
}
</style>
