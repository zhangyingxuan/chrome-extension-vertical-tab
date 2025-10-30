<template>
  <div
    class="context-menu"
    :style="{
      left: position.x + 'px',
      top: position.y + 'px',
    }"
    @click.stop
  >
    <div v-if="config.type === 'group'" class="menu-section">
      <div class="menu-item" @click="$emit('rename-group')">重命名分组</div>
      <div class="menu-item" @click="$emit('change-color')">修改颜色</div>
      <div class="menu-item" @click="$emit('ungroup-tabs')">取消分组</div>
      <div class="menu-item" @click="$emit('close-group')">关闭分组</div>
    </div>
    <div v-if="config.type === 'tab'" class="menu-section">
      <div class="menu-item" @click="$emit('move-to-new-group')">
        移动到新分组
      </div>
      <div class="menu-item" @click="$emit('move-to-existing-group')">
        移动到现有分组
      </div>
      <div class="menu-item" @click="$emit('close-tab')">关闭标签页</div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { IContextMenuConfig } from "../type";

interface Props {
  position: { x: number; y: number };
  config: IContextMenuConfig;
}

defineProps<Props>();

const emit = defineEmits<{
  "rename-group": [];
  "change-color": [];
  "ungroup-tabs": [];
  "close-group": [];
  "move-to-new-group": [];
  "move-to-existing-group": [];
  "close-tab": [];
  close: [];
}>();

// 点击外部关闭菜单
const handleClickOutside = (event: MouseEvent) => {
  const contextMenu = document.querySelector(".context-menu");
  if (contextMenu && !contextMenu.contains(event.target as Node)) {
    emit("close");
  }
};

// 添加全局点击事件监听
document.addEventListener("click", handleClickOutside);
</script>

<style lang="less" scoped>
.context-menu {
  position: fixed;
  background: var(--context-menu-bg);
  border: 1px solid var(--context-menu-border);
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  min-width: 120px;
  padding: 4px 0;

  .menu-section {
    .menu-item {
      padding: 8px 12px;
      cursor: pointer;
      font-size: 12px;
      color: var(--font-color);
      transition: background-color 0.2s;

      &:hover {
        background-color: var(--tab-hover-color);
      }
    }
  }
}
</style>
