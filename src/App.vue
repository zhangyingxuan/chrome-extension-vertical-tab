<template>
  <div class="tabs-tree">
    <!-- 域名分组模式 -->
    <DomainGroupView
      v-if="groupType === 'domain'"
      :tabList="showTabList"
      :activeDomain="activeDomain"
      :currDomain="currDomain"
      :activeTabId="activeTabId"
      @active-domain="handleActiveDomain"
      @click-tab="handleClickTab"
      @close-tab="handleCloseTab"
    />

    <!-- 自定义分组模式 -->
    <CustomGroupView
      v-else-if="groupType === 'custom'"
      :groups="customTabGroups"
      :ungroupedTabs="ungroupedTabs"
      :activeGroupId="activeGroupId"
      :activeTabId="activeTabId"
      :dragOverGroupId="dragOverGroupId"
      @toggle-collapse="toggleGroupCollapse"
      @group-context-menu="handleGroupContextMenu"
      @tab-context-menu="handleTabContextMenu"
      @drag-start="handleDragStart"
      @drag-end="handleDragEnd"
      @drag-enter="handleDragEnter"
      @drag-leave="handleDragLeave"
      @drag-over="handleDragOver"
      @drop="handleDrop"
      @click-tab="handleClickTab"
      @close-tab="handleCloseTab"
    />

    <FooterBar
      :groupType="groupType"
      @change="handleSearch"
      @change-group-type="handleGroupTypeChange"
    />

    <!-- 右键菜单 -->
    <ContextMenu
      v-if="showContextMenu"
      :position="contextMenuPosition"
      :config="contextMenuConfig"
      @rename-group="handleRenameGroup"
      @change-color="handleChangeGroupColor"
      @ungroup-tabs="handleUngroupTabs"
      @close-group="handleCloseGroup"
      @move-to-new-group="handleMoveToNewGroup"
      @move-to-existing-group="handleMoveToExistingGroup"
      @close-tab="handleCloseTabFromMenu"
      @close="closeContextMenu"
    />

    <!-- 分组设置模态框 -->
    <GroupModal
      v-if="showGroupModal"
      :type="modalType"
      :title="modalTitle"
      :groupId="currentGroupId"
      :newTitle="newGroupTitle"
      :selectedColor="selectedColor"
      @close="closeGroupModal"
      @confirm="confirmGroupAction"
    />
  </div>
</template>

<script lang="ts" setup>
import { computed, nextTick, onMounted, onUnmounted, reactive, ref } from "vue";
import {
  ISearchData,
  ITabGroup,
  ICustomTabGroup,
  IContextMenuConfig,
} from "./type";
import { wait } from "./utils/index";
import { groupTypeStoreKey } from "./config";

// 导入组件
import DomainGroupView from "./components/DomainGroupView.vue";
import CustomGroupView from "./components/CustomGroupView.vue";
import FooterBar from "./components/FooterBar.vue";
import ContextMenu from "./components/ContextMenu.vue";
import GroupModal from "./components/GroupModal.vue";

// 导入工具函数
import {
  getAllDomainTabs,
  getAllCustomTabs,
  getActiveTab,
  getDomainOfUrl,
  toggleGroupCollapse as toggleGroupCollapseUtil,
  handleDropOperation,
  handleGroupInternalSort,
  showDragSuccessFeedback,
  showDragErrorFeedback,
  showSortSuccessFeedback,
  showSortErrorFeedback,
} from "./utils/tabManager";

// 状态管理
const groupType = ref("domain");
const activeTabId = ref(0);
const activeDomain = ref("");
const currDomain = ref("");

// TabGroup相关状态
const customTabGroups = ref<ICustomTabGroup[]>([]);
const ungroupedTabs = ref<chrome.tabs.Tab[]>([]);
const activeGroupId = ref<number | null>(null);

// 右键菜单相关状态
const showContextMenu = ref(false);
const contextMenuPosition = reactive({ x: 0, y: 0 });
const contextMenuConfig = reactive<IContextMenuConfig>({ type: "group" });

// 模态框相关状态
const showGroupModal = ref(false);
const modalType = ref<"rename" | "color">("rename");
const modalTitle = ref("");
const newGroupTitle = ref("");
const selectedColor = ref("grey");
const currentGroupId = ref<number | null>(null);

// 拖拽相关状态
const dragData = ref<{
  tab: chrome.tabs.Tab;
  sourceGroup: ICustomTabGroup | null;
} | null>(null);
const dragOverGroupId = ref<number | null>(null);

// 搜索相关状态
const tabList = ref<ITabGroup[]>([]);
const searchData = reactive({
  keywords: "",
});

// 计算属性 - 优化搜索性能
const showTabList = computed<ITabGroup[]>(() => {
  const keywords = searchData.keywords.toLowerCase();
  if (!keywords) return tabList.value;

  return tabList.value.filter((item) => {
    const domainMatch = item.domain.toLowerCase().includes(keywords);
    const tabMatch = item.tabs?.some((tab) => {
      const title = tab?.title?.toLowerCase() || "";
      const url = tab?.url?.toLowerCase() || "";
      return title.includes(keywords) || url.includes(keywords);
    });

    return domainMatch || tabMatch;
  });
});

// 事件处理函数
function handleGroupTypeChange(type: string) {
  groupType.value = type;
  getAllTabs();
}

function handleSearch(data: ISearchData) {
  searchData.keywords = data.keywords;
}

function handleClickTab(tab: chrome.tabs.Tab) {
  if (!tab.id) return;
  chrome.tabs.update(tab.id, { active: true });
}

const handleActiveDomain = (domain: string) => {
  if (activeDomain.value !== domain) {
    activeDomain.value = domain;
  } else {
    activeDomain.value = "";
  }
};

/**
 * 展开指定domain目录
 */
const openDomainFold = async () => {
  const acTab = await getActiveTab();
  const domain = getDomainOfUrl(acTab?.url || "");
  if (domain) {
    currDomain.value = domain;
    return;
  }
};

/**
 * 选中tab
 */
const changeActiveTab = async (activeInfo: {
  tabId: number;
  windowId: number;
}) => {
  if (!activeInfo.tabId) return;
  activeTabId.value = activeInfo.tabId;

  // 更新活动分组
  if (groupType.value === "custom") {
    const tabs = await chrome.tabs.query({ currentWindow: true });
    const activeTab = tabs.find((tab) => tab.id === activeInfo.tabId);
    if (activeTab) {
      activeGroupId.value = activeTab.groupId !== -1 ? activeTab.groupId : null;
    }
  }
};

// 分组操作
const toggleGroupCollapse = async (groupId: number) => {
  try {
    await toggleGroupCollapseUtil(groupId, customTabGroups.value);
  } catch (error) {
    console.error("切换分组折叠状态失败:", error);
  }
};

// 右键菜单处理
const handleGroupContextMenu = (event: MouseEvent, group: ICustomTabGroup) => {
  contextMenuPosition.x = event.clientX;
  contextMenuPosition.y = event.clientY;
  contextMenuConfig.type = "group";
  contextMenuConfig.groupId = group.id;
  showContextMenu.value = true;
};

const handleTabContextMenu = (
  event: MouseEvent,
  tab: chrome.tabs.Tab,
  group?: ICustomTabGroup
) => {
  contextMenuPosition.x = event.clientX;
  contextMenuPosition.y = event.clientY;
  contextMenuConfig.type = "tab";
  contextMenuConfig.tabId = tab.id;
  if (group) {
    contextMenuConfig.groupId = group.id;
  }
  showContextMenu.value = true;
};

// 关闭右键菜单
const closeContextMenu = () => {
  showContextMenu.value = false;
};

// 分组操作
const handleRenameGroup = () => {
  if (contextMenuConfig.groupId) {
    currentGroupId.value = contextMenuConfig.groupId;
    modalType.value = "rename";
    modalTitle.value = "重命名分组";
    showGroupModal.value = true;
    showContextMenu.value = false;
  }
};

const handleChangeGroupColor = () => {
  if (contextMenuConfig.groupId) {
    currentGroupId.value = contextMenuConfig.groupId;
    modalType.value = "color";
    modalTitle.value = "修改分组颜色";
    showGroupModal.value = true;
    showContextMenu.value = false;
  }
};

const handleUngroupTabs = async () => {
  if (contextMenuConfig.groupId) {
    const group = customTabGroups.value.find(
      (g) => g.id === contextMenuConfig.groupId
    );
    if (group) {
      // 将分组中的标签页移动到未分组
      ungroupedTabs.value.push(...group.tabs);
      // 移除分组
      customTabGroups.value = customTabGroups.value.filter(
        (g) => g.id !== contextMenuConfig.groupId
      );
      showContextMenu.value = false;
    }
  }
};

const handleCloseGroup = async () => {
  if (contextMenuConfig.groupId) {
    const group = customTabGroups.value.find(
      (g) => g.id === contextMenuConfig.groupId
    );
    if (group) {
      // 关闭分组中的所有标签页
      const tabIds = group.tabs
        .map((tab) => tab.id)
        .filter(Boolean) as number[];
      await chrome.tabs.remove(tabIds);
      // 移除分组
      customTabGroups.value = customTabGroups.value.filter(
        (g) => g.id !== contextMenuConfig.groupId
      );
      showContextMenu.value = false;
      getAllTabs();
    }
  }
};

// 标签页操作
const handleMoveToNewGroup = () => {
  showContextMenu.value = false;
};

const handleMoveToExistingGroup = () => {
  showContextMenu.value = false;
};

const handleCloseTabFromMenu = async () => {
  if (contextMenuConfig.tabId) {
    await chrome.tabs.remove(contextMenuConfig.tabId);
    showContextMenu.value = false;
    getAllTabs();
  }
};

// 拖拽操作
const handleDragStart = (
  event: DragEvent,
  tab: chrome.tabs.Tab,
  group: ICustomTabGroup | null
) => {
  if (!tab.id) return;

  dragData.value = {
    tab,
    sourceGroup: group,
  };

  // 设置拖拽数据
  event.dataTransfer?.setData("text/plain", tab.id.toString());
  event.dataTransfer!.effectAllowed = "move";

  // 添加拖拽样式
  if (event.target) {
    (event.target as HTMLElement).classList.add("dragging");
  }

  // 设置拖拽图像
  if (event.dataTransfer && event.target) {
    const dragElement = event.target as HTMLElement;
    const rect = dragElement.getBoundingClientRect();
    event.dataTransfer.setDragImage(
      dragElement,
      rect.width / 2,
      rect.height / 2
    );
  }
};

const handleDragEnd = (event: DragEvent) => {
  dragData.value = null;
  dragOverGroupId.value = null;

  // 移除拖拽样式
  if (event.target) {
    (event.target as HTMLElement).classList.remove("dragging");
  }

  // 移除所有拖拽相关样式
  document.querySelectorAll(".drag-over, .dragging").forEach((el) => {
    el.classList.remove("drag-over", "dragging");
  });
};

const handleDragEnter = (event: DragEvent, group: ICustomTabGroup | null) => {
  const groupId = group ? group.id : -1;
  dragOverGroupId.value = groupId;

  // 确保分组展开以便拖拽
  if (group && group.collapsed) {
    toggleGroupCollapse(group.id);
  }
};

const handleDragLeave = (event: DragEvent, group: ICustomTabGroup | null) => {
  const groupId = group ? group.id : -1;

  // 只有当拖拽离开当前分组时才清除状态
  const relatedTarget = event.relatedTarget as HTMLElement;
  if (
    !relatedTarget ||
    !relatedTarget.closest(`[data-group-id="${groupId}"]`)
  ) {
    dragOverGroupId.value = null;
  }
};

const handleDragOver = (event: DragEvent, group: ICustomTabGroup | null) => {
  event.preventDefault();
  const groupId = group ? group.id : -1;
  dragOverGroupId.value = groupId;
};

const handleDrop = async (
  event: DragEvent,
  targetGroup: ICustomTabGroup | null
) => {
  event.preventDefault();

  if (!dragData.value || !dragData.value.tab.id) {
    return;
  }

  const { tab, sourceGroup } = dragData.value;
  const targetGroupId = targetGroup ? targetGroup.id : -1;

  // 如果源分组和目标分组相同，执行分组内排序
  if (sourceGroup?.id === targetGroupId) {
    try {
      await handleGroupInternalSort(event, tab, sourceGroup);
      showSortSuccessFeedback(targetGroupId);
    } catch (error) {
      console.error("分组内拖拽排序失败:", error);
      showSortErrorFeedback();
    } finally {
      dragOverGroupId.value = null;
      dragData.value = null;
    }
    return;
  }

  try {
    await handleDropOperation(dragData.value, targetGroup);
    await getAllTabs();
    showDragSuccessFeedback(targetGroupId);
  } catch (error) {
    console.error("拖拽移动标签页失败:", error);
    showDragErrorFeedback();
  } finally {
    dragOverGroupId.value = null;
    dragData.value = null;
  }
};

// 模态框操作
const closeGroupModal = () => {
  showGroupModal.value = false;
  newGroupTitle.value = "";
  selectedColor.value = "grey";
  currentGroupId.value = null;
};

const confirmGroupAction = async () => {
  if (currentGroupId.value) {
    const group = customTabGroups.value.find(
      (g) => g.id === currentGroupId.value
    );
    if (group) {
      if (modalType.value === "rename" && newGroupTitle.value.trim()) {
        group.title = newGroupTitle.value.trim();
      } else if (modalType.value === "color") {
        group.color = selectedColor.value;
      }
    }
  }
  closeGroupModal();
};

/**
 * 关闭tab回调
 */
const handleCloseTab = async (tab: chrome.tabs.Tab) => {
  if (!tab.id) return;
  await chrome.tabs.remove(tab.id);
  getAllTabs();
};

// 获取所有标签页数据
async function getAllTabs() {
  console.log("getAllTabs 获取所有标签页数据...", groupType.value);
  if (groupType.value === "domain") {
    tabList.value = await getAllDomainTabs();
    console.log("domain 获取所有标签页数据...", tabList.value);
  } else {
    const {
      groups,
      ungroupedTabs: ungrouped,
      activeGroupId: activeId,
    } = await getAllCustomTabs();
    customTabGroups.value = groups;
    ungroupedTabs.value = ungrouped;
    activeGroupId.value = activeId;
    console.log("custom 获取所有标签页数据...", groups, ungrouped, activeId);
  }
}

const initGroupType = async () => {
  const obj = await chrome.storage.local.get(groupTypeStoreKey);
  const gt = obj[groupTypeStoreKey];
  groupType.value = gt || "domain";
};

// 事件监听器
onMounted(async () => {
  await initGroupType();
  // 监听分组类型变化
  chrome.storage.onChanged.addListener((changes) => {
    if (changes[groupTypeStoreKey]) {
      groupType.value = changes[groupTypeStoreKey].newValue;
      getAllTabs();
    }
  });

  await getAllTabs();
  const acTab = await getActiveTab();
  if (acTab?.id) {
    changeActiveTab({ tabId: acTab.id, windowId: acTab.windowId || 0 });
  }
  if (acTab?.url) {
    openDomainFold();
  }

  // 添加全局点击事件监听，用于关闭右键菜单
  document.addEventListener("click", closeContextMenu);

  // TabGroup相关事件监听
  chrome.tabGroups.onCreated.addListener((group) => {
    if (groupType.value === "custom") {
      getAllTabs();
    }
  });

  chrome.tabGroups.onRemoved.addListener((group) => {
    if (groupType.value === "custom") {
      getAllTabs();
    }
  });

  chrome.tabGroups.onUpdated.addListener((group) => {
    if (groupType.value === "custom") {
      // 更新本地分组的collapsed状态
      const localGroup = customTabGroups.value.find((g) => g.id === group.id);
      if (localGroup && localGroup.collapsed !== group.collapsed) {
        localGroup.collapsed = group.collapsed;
      }
    }
  });

  // 标签页移动到分组事件
  chrome.tabs.onAttached.addListener((tabId, attachInfo) => {
    if (groupType.value === "custom") {
      getAllTabs();
    }
  });

  chrome.tabs.onDetached.addListener((tabId, detachInfo) => {
    if (groupType.value === "custom") {
      getAllTabs();
    }
  });

  chrome.tabs.onMoved.addListener((tabId, moveInfo) => {
    if (groupType.value === "custom") {
      getAllTabs();
    }
  });

  // 现有的标签页事件监听保持不变
  chrome.tabs.onActivated.addListener(async (activeInfo) => {
    await getAllTabs();
    wait(300);
    changeActiveTab({ tabId: activeInfo.tabId, windowId: activeInfo.windowId });
    const tabs = await chrome.tabs.query({ currentWindow: true });
    const activeTab = tabs.find((item) => item.id === activeInfo?.tabId);
    if (activeTab?.url) {
      openDomainFold();
    }
  });

  chrome.tabs.onCreated.addListener(async (tab) => {
    await getAllTabs();
    if (tab?.id) {
      changeActiveTab({ tabId: tab.id, windowId: tab.windowId || 0 });
    }
  });

  chrome.tabs.onRemoved.addListener(async (tabId, removeInfo) => {
    if (removeInfo?.isWindowClosing) return;
    await getAllTabs();
    const newAcTab = await getActiveTab();
    if (newAcTab?.id) {
      changeActiveTab({ tabId: newAcTab.id, windowId: newAcTab.windowId || 0 });
    }
    if (newAcTab?.url) {
      openDomainFold();
    }
  });

  chrome.tabs.onUpdated.addListener(async (upTabId, changeInfo, tab) => {
    await getAllTabs();
    nextTick(() => {
      if (
        tab.active &&
        changeInfo.status === "complete" &&
        tab.url &&
        groupType.value === "domain"
      ) {
        const domain = getDomainOfUrl(tab.url);
        currDomain.value = domain;
      }
    });
  });
});

onUnmounted(() => {
  document.removeEventListener("click", closeContextMenu);
});
</script>

<style lang="less">
@import "./styles/app.less";
</style>
