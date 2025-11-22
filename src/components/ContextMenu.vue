<template>
  <div
    ref="menuRef"
    class="context-menu"
    :style="{
      left: adjustedPosition.x + 'px',
      top: adjustedPosition.y + 'px',
    }"
    @click.stop
    v-click-outside="handleClickOutside"
  >
    <div v-if="config.type === 'group'" class="menu-section">
      <!-- 重命名分组输入框 -->
      <div class="rename-input-container">
        <input
          ref="renameInputRef"
          v-model="editingGroupTitle"
          class="rename-input"
          placeholder="输入分组名称"
          @keydown.enter="saveGroupRename"
          @keydown.escape="cancelGroupRename"
        />
      </div>

      <div class="menu-divider"></div>

      <!-- 颜色选择区域 -->
      <div class="color-picker-section">
        <div class="color-picker-grid">
          <div
            v-for="color in GROUP_COLORS"
            :key="color.value"
            class="color-circle"
            :class="{ active: selectedColor === color.value }"
            :style="{ backgroundColor: ColorUtils.getColorValue(color.value) }"
            @click="selectColor(color.value)"
          >
            <div class="color-checkmark" v-if="selectedColor === color.value">
              ✓
            </div>
          </div>
        </div>
      </div>

      <div class="menu-divider"></div>
      <div class="menu-item" @click="$emit('ungroup-tabs')">
        <span>取消分组</span>
      </div>
      <div class="menu-item" @click="$emit('close-group')">
        <span>关闭分组</span>
      </div>
    </div>
    <div v-if="config.type === 'tab'" class="menu-section">
      <div class="menu-item" @click="$emit('move-to-new-group')">
        <span>移动到新分组</span>
      </div>
      <div class="menu-divider"></div>
      <div class="menu-item" @click="copyTabUrl">
        <span>复制链接</span>
      </div>
      <div class="menu-item" @click="copyTabTitle">
        <span>复制标题</span>
      </div>
      <div class="menu-divider"></div>
      <div class="menu-item" @click="openInNewTab">
        <span>在新标签页打开</span>
      </div>
      <div class="menu-item" @click="openInNewWindow">
        <span>在新窗口打开</span>
      </div>
      <div class="menu-item" @click="reloadTab">
        <span>重新加载</span>
      </div>
      <div class="menu-divider"></div>
      <div class="menu-item" @click="$emit('close-tab')">
        <span>关闭标签页</span>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, onUnmounted, nextTick, watch } from "vue";
import { IContextMenuConfig } from "../type";
import { GROUP_COLORS } from "../type";
import { ColorUtils } from "../utils/colorUtils";

interface Props {
  position: { x: number; y: number };
  config: IContextMenuConfig;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  "rename-group": [newTitle: string];
  "change-color": [color: string];
  "ungroup-tabs": [];
  "close-group": [];
  "move-to-new-group": [];
  "move-to-existing-group": [];
  "close-tab": [];
  close: [];
}>();

// 重命名相关状态
const renameInputRef = ref<HTMLInputElement | null>(null);
const editingGroupTitle = ref("");

// 颜色选择相关状态
const selectedColor = ref("grey");

// 菜单元素引用和调整位置
const menuRef = ref<HTMLElement | null>(null);
const adjustedPosition = ref({ x: 0, y: 0 });

// 精确边界检测和位置调整函数
const adjustMenuPosition = () => {
  if (!menuRef.value) return;

  const { x: originalX, y: originalY } = props.position;
  const { innerWidth: winWidth, innerHeight: winHeight } = window;

  // 使用实际DOM尺寸进行精确计算
  const menuRect = menuRef.value.getBoundingClientRect();
  const menuWidth = menuRect.width;
  const menuHeight = menuRect.height;

  // 计算边界安全距离
  const safeMargin = 10;

  // 精确计算最终位置，确保菜单完全在可视区域内
  const adjustedX = Math.max(
    safeMargin,
    Math.min(originalX, winWidth - menuWidth - safeMargin)
  );
  const adjustedY = Math.max(
    safeMargin,
    Math.min(originalY, winHeight - menuHeight - safeMargin)
  );

  adjustedPosition.value = { x: adjustedX, y: adjustedY };
};

// 统一初始化函数
const initMenuState = () => {
  if (props.config.type === "group" && props.config.groupId) {
    editingGroupTitle.value = props.config.groupTitle || "";
    selectedColor.value = props.config.groupColor || "grey";

    nextTick(() => renameInputRef.value?.focus());
  }
};

// 监听位置变化，立即调整位置
watch(
  () => props.position,
  () => {
    console.log("位置变化:", props.position);
    initMenuState();
    adjustMenuPosition();
  },
  { immediate: true, deep: true }
);

// 监听配置变化
watch(() => props.config.type, initMenuState, { immediate: true });

// 保存分组重命名
const saveGroupRename = () => {
  const trimmedTitle = editingGroupTitle.value.trim();
  if (trimmedTitle) {
    emit("rename-group", trimmedTitle);
  }
  emit("close");
};

// 取消重命名
const cancelGroupRename = () => {
  emit("close");
};

// 选择颜色并关闭菜单
const selectColor = (color: string) => {
  selectedColor.value = color;
  emit("change-color", color);
  emit("close");
};

// 优化复制文本到剪贴板
const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // 降级方案
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand("copy");
    document.body.removeChild(textArea);
  }
};

// 复制标签页链接
const copyTabUrl = async () => {
  const tab = await getCurrentTab();
  if (tab?.url) {
    await copyToClipboard(tab.url);
  }
  emit("close");
};

// 复制标签页标题
const copyTabTitle = async () => {
  const tab = await getCurrentTab();
  if (tab?.title) {
    await copyToClipboard(tab.title);
  }
  emit("close");
};

// 获取当前标签页信息
const getCurrentTab = async () => {
  return props.config.tabId
    ? (await chrome.tabs.query({})).find((t) => t.id === props.config.tabId)
    : null;
};

// 在新标签页打开
const openInNewTab = async () => {
  const tab = await getCurrentTab();
  if (tab?.url) {
    await chrome.tabs.create({ url: tab.url });
  }
  emit("close");
};

// 在新窗口打开
const openInNewWindow = async () => {
  const tab = await getCurrentTab();
  if (tab?.url) {
    await chrome.windows.create({ url: tab.url });
  }
  emit("close");
};

// 重新加载标签页
const reloadTab = async () => {
  if (props.config.tabId) {
    try {
      await chrome.tabs.reload(props.config.tabId);
      console.log("标签页已重新加载");
    } catch (error) {
      console.error("重新加载标签页失败:", error);
    }
  }
  emit("close");
};

// 点击外部关闭菜单
const handleClickOutside = () => {
  emit("close");
};

// 简化点击外部关闭指令
const vClickOutside = {
  mounted(el: HTMLElement, binding: any) {
    const handler = (event: MouseEvent) => {
      !el.contains(event.target as Node) && binding.value(event);
    };
    (el as any).clickOutsideHandler = handler;
    document.addEventListener("click", handler);
  },
  unmounted(el: HTMLElement) {
    document.removeEventListener("click", (el as any).clickOutsideHandler);
  },
};

// 组件挂载时初始化
onMounted(() => {
  initMenuState();
  // 使用nextTick确保DOM已渲染完成后再调整位置
  nextTick(() => {
    adjustMenuPosition();
  });
});
</script>

<style lang="less" scoped>
.context-menu {
  position: fixed;
  background: var(--bg-color);
  border: 1px solid var(--border-color-light);
  border-radius: 8px;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
  z-index: 10000;
  min-width: 200px;
  max-width: 300px;
  min-height: 100px;
  max-height: 400px;
  padding: 8px 0;
  font-size: 13px;
  backdrop-filter: blur(10px);
  animation: fadeIn 0.1s ease-out;
  box-sizing: border-box;
  overflow: hidden;
  will-change: transform, opacity;
}

.rename-input-container {
  padding: 8px 16px;
}
.rename-input {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid var(--border-color-light);
  border-radius: 4px;
  background: var(--bg-color-secondary);
  color: var(--font-color);
  font-size: 13px;
  outline: none;
  transition: border-color 0.15s ease;
}
.rename-input:focus {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(var(--primary-color-rgb), 0.1);
}
.rename-input::placeholder {
  color: var(--font-color-secondary);
}

.color-picker-section {
  padding: 8px 16px;
}
.color-picker-grid {
  display: flex;
  gap: 6px;
  justify-content: space-between;
}
.color-circle {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid transparent;
  transition: all 0.15s ease;
}
.color-circle:hover {
  transform: scale(1.1);
  border-color: var(--border-color);
}
.color-circle.active {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(var(--primary-color-rgb), 0.2);
}
.color-checkmark {
  color: white;
  font-size: 12px;
  font-weight: bold;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

.menu-section {
  max-height: 350px;
  overflow-y: auto;
  overflow-x: hidden;
}
.menu-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  cursor: pointer;
  color: var(--font-color);
  transition: all 0.12s ease-out;
  gap: 12px;
}
.menu-item:hover {
  background-color: var(--tab-hover-color);
  transform: translateX(1px);
}
.menu-item:active {
  transform: translateX(0);
}
.menu-divider {
  height: 1px;
  background-color: var(--border-color-light);
  margin: 6px 0;
  opacity: 0.5;
}

.menu-section::-webkit-scrollbar {
  width: 4px;
}
.menu-section::-webkit-scrollbar-track {
  background: transparent;
}
.menu-section::-webkit-scrollbar-thumb {
  background: var(--border-color-light);
  border-radius: 2px;
}
.menu-section::-webkit-scrollbar-thumb:hover {
  background: var(--border-color);
}

@keyframes fadeIn {
  0% {
    opacity: 0;
    transform: scale(0.98) translateY(-2px);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}
</style>
