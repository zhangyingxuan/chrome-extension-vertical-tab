<template>
  <div
    class="context-menu"
    :style="{
      left: Math.min(position.x, windowWidth - 200) + 'px',
      top: Math.min(position.y, windowHeight - 300) + 'px',
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
          @blur="saveGroupRename"
          @keydown.enter="saveGroupRename"
          @keydown.escape="cancelGroupRename"
        />
      </div>

      <div class="menu-divider"></div>

      <div class="menu-item" @click="$emit('change-color')">
        <span>修改颜色</span>
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

interface Props {
  position: { x: number; y: number };
  config: IContextMenuConfig;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  "rename-group": [newTitle: string];
  "change-color": [];
  "ungroup-tabs": [];
  "close-group": [];
  "move-to-new-group": [];
  "move-to-existing-group": [];
  "close-tab": [];
  close: [];
}>();

// 窗口尺寸
const windowWidth = ref(0);
const windowHeight = ref(0);

// 重命名相关状态
const renameInputRef = ref<HTMLInputElement | null>(null);
const editingGroupTitle = ref("");

// 更新窗口尺寸
const updateWindowSize = () => {
  windowWidth.value = window.innerWidth;
  windowHeight.value = window.innerHeight;
};

// 初始化重命名输入框
const initRenameInput = async () => {
  if (props.config.type === "group" && props.config.groupId) {
    // 使用从props传递的分组标题
    editingGroupTitle.value = props.config.groupTitle || "";

    // 聚焦输入框
    nextTick(() => {
      if (renameInputRef.value) {
        renameInputRef.value.focus();
      }
    });
  }
};

// 监听props.config的变化，当配置变化时重新初始化输入框
watch(
  () => props.config,
  (newConfig) => {
    if (newConfig.type === "group" && newConfig.groupId) {
      initRenameInput();
    }
  },
  { immediate: true, deep: true }
);

// 保存分组重命名
const saveGroupRename = () => {
  if (editingGroupTitle.value.trim()) {
    emit("rename-group", editingGroupTitle.value.trim());
  }
  emit("close");
};

// 取消重命名
const cancelGroupRename = () => {
  emit("close");
};

// 复制标签页链接
const copyTabUrl = async () => {
  if (props.config.tabId) {
    const tabs = await chrome.tabs.query({});
    const tab = tabs.find((t) => t.id === props.config.tabId);
    if (tab?.url) {
      try {
        await navigator.clipboard.writeText(tab.url);
        console.log("链接已复制到剪贴板");
      } catch (err) {
        console.error("复制链接失败:", err);
        // 降级方案
        const textArea = document.createElement("textarea");
        textArea.value = tab.url;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
    }
  }
  emit("close");
};

// 复制标签页标题
const copyTabTitle = async () => {
  if (props.config.tabId) {
    const tabs = await chrome.tabs.query({});
    const tab = tabs.find((t) => t.id === props.config.tabId);
    if (tab?.title) {
      try {
        await navigator.clipboard.writeText(tab.title);
        console.log("标题已复制到剪贴板");
      } catch (err) {
        console.error("复制标题失败:", err);
      }
    }
  }
  emit("close");
};

// 在新标签页打开
const openInNewTab = async () => {
  if (props.config.tabId) {
    const tabs = await chrome.tabs.query({});
    const tab = tabs.find((t) => t.id === props.config.tabId);
    if (tab?.url) {
      await chrome.tabs.create({ url: tab.url });
    }
  }
  emit("close");
};

// 在新窗口打开
const openInNewWindow = async () => {
  if (props.config.tabId) {
    const tabs = await chrome.tabs.query({});
    const tab = tabs.find((t) => t.id === props.config.tabId);
    if (tab?.url) {
      await chrome.windows.create({ url: tab.url });
    }
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

// 自定义指令：点击外部关闭
const vClickOutside = {
  mounted(el: HTMLElement, binding: any) {
    const clickOutsideEvent = function (event: MouseEvent) {
      if (!el.contains(event.target as Node)) {
        binding.value(event);
      }
    };
    (el as any).clickOutsideEvent = clickOutsideEvent;
    document.addEventListener("click", clickOutsideEvent);
  },
  unmounted(el: HTMLElement) {
    const clickOutsideEvent = (el as any).clickOutsideEvent;
    if (clickOutsideEvent) {
      document.removeEventListener("click", clickOutsideEvent);
    }
  },
};

// 组件挂载时初始化窗口尺寸
onMounted(() => {
  updateWindowSize();
  window.addEventListener("resize", updateWindowSize);

  // 初始化重命名输入框
  initRenameInput();
});

onUnmounted(() => {
  window.removeEventListener("resize", updateWindowSize);
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
  padding: 8px 0;
  font-size: 13px;
  backdrop-filter: blur(10px);
  animation: fadeIn 0.15s ease-out;

  .rename-input-container {
    padding: 8px 16px;

    .rename-input {
      width: 100%;
      padding: 6px 8px;
      border: 1px solid var(--border-color-light);
      border-radius: 4px;
      background: var(--bg-color-secondary);
      color: var(--font-color);
      font-size: 13px;
      outline: none;
      transition: border-color 0.2s ease;

      &:focus {
        border-color: var(--primary-color);
        box-shadow: 0 0 0 2px rgba(var(--primary-color-rgb), 0.1);
      }

      &::placeholder {
        color: var(--font-color-secondary);
      }
    }
  }

  .menu-section {
    .menu-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 16px;
      cursor: pointer;
      color: var(--font-color);
      transition: all 0.2s ease;
      gap: 12px;

      &:hover {
        background-color: var(--tab-hover-color);
        transform: translateX(2px);
      }

      &:active {
        transform: translateX(0);
      }
    }

    .menu-divider {
      height: 1px;
      background-color: var(--border-color-light);
      margin: 6px 0;
      opacity: 0.5;
    }
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(-4px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}
</style>
