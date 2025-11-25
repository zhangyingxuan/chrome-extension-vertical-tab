<template>
  <div class="tabs-tree">
    <!-- 自定义分组模式 -->
    <CustomGroupView
      v-if="groupType === 'custom'"
      :groups="showCustomGroups"
      :ungroupedTabs="showUngroupedTabs"
      :activeGroupId="activeGroupId"
      :activeTabId="activeTabId"
      :dragOverGroupId="dragOverGroupId"
      :sortPositionHint="sortPositionHint"
      :searchKeywords="searchData.keywords"
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
      @drag-enter-tab="handleDragEnterTab"
      @drag-leave-tab="handleDragLeaveTab"
      @drag-over-tab="handleDragOverTab"
    />

    <!-- 域名分组模式 -->
    <DomainGroupView
      v-else-if="groupType === 'domain'"
      :tabList="showTabList"
      :activeDomain="activeDomain"
      :currDomain="currDomain"
      :activeTabId="activeTabId"
      :searchKeywords="searchData.keywords"
      @active-domain="handleActiveDomain"
      @click-tab="handleClickTab"
      @close-tab="handleCloseTab"
    />

    <FooterBar
      :groupType="groupType"
      :sortType="domainSortType"
      @change="handleSearch"
      @changeGroupType="handleGroupTypeChange"
      @change-sort="handleDomainSortChange"
    />

    <!-- 搜索统计信息 -->
    <div v-if="searchStats && searchData.keywords" class="search-stats">
      找到 {{ searchStats.matchedGroups }} 个分组，{{ searchStats.matchedTabs }}
      个标签页
    </div>

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
      @close-tab="handleCloseTabFromMenu"
      @close="closeContextMenu"
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
import { groupTypeStoreKey, domainSortTypeStoreKey } from "./config";

// 导入组件
import DomainGroupView from "./components/DomainGroupView.vue";
import CustomGroupView from "./components/CustomGroupView.vue";
import FooterBar from "./components/FooterBar.vue";
import ContextMenu from "./components/ContextMenu.vue";

// 导入工具函数
import {
  getAllDomainTabs,
  getAllCustomTabs,
  getActiveTab,
  getDomainOfUrl,
  toggleGroupCollapse as toggleGroupCollapseUtil,
  handleDropOperation,
  handleGroupInternalSort,
  handleUngroupedSort,
  showDragSuccessFeedback,
  showDragErrorFeedback,
  showSortSuccessFeedback,
  showSortErrorFeedback,
  sortDomainGroups,
  moveNewTabToSameDomain,
  isTabLoaded,
} from "./utils/tabManager";

// 状态管理
const groupType = ref("custom");
const activeTabId = ref(0);
const activeDomain = ref("");
const currDomain = ref("");

// 域名排序类型
const domainSortType = ref<"default" | "asc" | "desc">("default");

// TabGroup相关状态
const customTabGroups = ref<ICustomTabGroup[]>([]);
const ungroupedTabs = ref<chrome.tabs.Tab[]>([]);
const activeGroupId = ref<number | null>(null);

// 右键菜单相关状态
const showContextMenu = ref(false);
const contextMenuPosition = reactive({ x: 0, y: 0 });
const contextMenuConfig = reactive<IContextMenuConfig>({ type: "group" });

// 拖拽相关状态
const dragData = ref<{
  tab: chrome.tabs.Tab;
  sourceGroup: ICustomTabGroup | null;
} | null>(null);
const dragOverGroupId = ref<number | null>(null);

// 拖拽排序位置提示状态
const sortPositionHint = reactive({
  groupId: null as number | null,
  index: -1,
  position: "before" as "before" | "after",
});

// 搜索相关状态
const tabList = ref<ITabGroup[]>([]);
const searchData = reactive({
  keywords: "",
});

// 计算属性 - 优化搜索性能
const showTabList = computed<ITabGroup[]>(() => {
  const keywords = searchData.keywords.toLowerCase();
  let filteredList = tabList.value;

  if (keywords) {
    filteredList = tabList.value.filter((item) => {
      const domainMatch = item.domain.toLowerCase().includes(keywords);
      const tabMatch = item.tabs?.some((tab) => {
        const title = tab?.title?.toLowerCase() || "";
        const url = tab?.url?.toLowerCase() || "";
        return title.includes(keywords) || url.includes(keywords);
      });

      return domainMatch || tabMatch;
    });
  }

  // 根据排序类型排序（这里只做本地排序，Chrome标签页顺序在排序变更时同步）
  if (domainSortType.value === "asc") {
    // 按域名字母顺序升序排序
    return [...filteredList].sort((a, b) => a.domain.localeCompare(b.domain));
  } else if (domainSortType.value === "desc") {
    // 按域名字母顺序降序排序
    return [...filteredList].sort((a, b) => b.domain.localeCompare(a.domain));
  } else {
    // 默认排序：按标签页数量降序，然后按域名排序
    return [...filteredList].sort((a, b) => {
      const aCount = a.tabs?.length || 0;
      const bCount = b.tabs?.length || 0;
      if (bCount !== aCount) {
        return bCount - aCount;
      }
      return a.domain.localeCompare(b.domain);
    });
  }
});

// 自定义分组模式下的搜索计算属性
const showCustomGroups = computed(() => {
  const keywords = searchData.keywords.toLowerCase();
  let filteredGroups = customTabGroups.value;

  if (keywords) {
    filteredGroups = customTabGroups.value.filter((group) => {
      // 搜索分组名称
      const groupNameMatch = group.title.toLowerCase().includes(keywords);

      // 搜索分组内的标签页
      const tabMatch = group.tabs?.some((tab) => {
        const title = tab?.title?.toLowerCase() || "";
        const url = tab?.url?.toLowerCase() || "";
        return title.includes(keywords) || url.includes(keywords);
      });

      return groupNameMatch || tabMatch;
    });
  }

  // 在自定义分组模式下，只有当用户主动选择了排序类型时才应用排序
  // 否则保持用户通过拖拽进行的自定义排序
  if (domainSortType.value !== "default") {
    const sortedGroups = sortCustomGroups(filteredGroups, domainSortType.value);

    // 对每个分组内的标签页也进行排序
    return sortedGroups.map((group) => ({
      ...group,
      tabs: sortGroupTabs(group.tabs || [], domainSortType.value),
    }));
  }

  return filteredGroups;
});

// 未分组标签页的搜索计算属性
const showUngroupedTabs = computed(() => {
  const keywords = searchData.keywords.toLowerCase();
  let filteredTabs = ungroupedTabs.value;

  if (keywords) {
    filteredTabs = ungroupedTabs.value.filter((tab) => {
      const title = tab?.title?.toLowerCase() || "";
      const url = tab?.url?.toLowerCase() || "";
      return title.includes(keywords) || url.includes(keywords);
    });
  }

  // 在自定义分组模式下，只有当用户主动选择了排序类型时才应用排序
  if (domainSortType.value !== "default") {
    return sortUngroupedTabs(filteredTabs, domainSortType.value);
  }

  return filteredTabs;
});

// 搜索结果的统计信息
const searchStats = computed(() => {
  if (!searchData.keywords) return null;

  if (groupType.value === "domain") {
    const matchedGroups = showTabList.value.length;
    const matchedTabs = showTabList.value.reduce((total, group) => {
      return total + (group.tabs?.length || 0);
    }, 0);
    return { matchedGroups, matchedTabs };
  } else {
    const matchedGroups = showCustomGroups.value.length;
    const matchedGroupTabs = showCustomGroups.value.reduce((total, group) => {
      return total + (group.tabs?.length || 0);
    }, 0);
    const matchedUngroupedTabs = showUngroupedTabs.value.length;
    const matchedTabs = matchedGroupTabs + matchedUngroupedTabs;
    return { matchedGroups, matchedTabs };
  }
});

// 分组类型变化，调整排序
async function handleGroupTypeChange(type: string) {
  // 保存分组类型到本地存储
  chrome.storage.local.set({ [groupTypeStoreKey]: type });
}

// 域名排序变更处理
async function handleDomainSortChange(sortType: "default" | "asc" | "desc") {
  // 保存排序类型到本地存储
  chrome.storage.local.set({ [domainSortTypeStoreKey]: sortType });

  try {
    // 按域名排序并同步Chrome标签页顺序
    await sortDomainGroups(sortType);
    // 刷新标签页数据以获取最新的顺序
    await refreshAllTabsData();
  } catch (error) {
    console.error("同步Chrome标签页顺序失败:", error);
  }
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
  contextMenuConfig.groupTitle = group.title; // 添加分组标题
  contextMenuConfig.groupColor = group.color; // 添加分组颜色
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
const handleRenameGroup = (newTitle?: string) => {
  if (contextMenuConfig.groupId && newTitle && newTitle.trim()) {
    // 直接更新分组名称
    const group = customTabGroups.value.find(
      (g) => g.id === contextMenuConfig.groupId
    );
    if (group) {
      const trimmedTitle = newTitle.trim();
      group.title = trimmedTitle;

      // 同步更新Chrome的分组标题
      try {
        chrome.tabGroups.update(contextMenuConfig.groupId, {
          title: trimmedTitle,
        });
        console.log("分组重命名成功:", trimmedTitle);
      } catch (error) {
        console.error("更新Chrome分组标题失败:", error);
      }
    }
    showContextMenu.value = false;
  }
};

const handleChangeGroupColor = (color?: string) => {
  if (contextMenuConfig.groupId && color) {
    // 直接修改颜色
    const group = customTabGroups.value.find(
      (g) => g.id === contextMenuConfig.groupId
    );
    console.log("group: 修改颜色", group);
    if (group) {
      group.color = color;

      // 同步更新Chrome的分组颜色
      try {
        chrome.tabGroups.update(contextMenuConfig.groupId, {
          color: color as chrome.tabGroups.Color,
        });
        console.log("分组颜色修改成功:", color);
      } catch (error) {
        console.error("更新Chrome分组颜色失败:", error);
      }
    }
  }
};

const handleUngroupTabs = async () => {
  if (contextMenuConfig.groupId) {
    const group = customTabGroups.value.find(
      (g) => g.id === contextMenuConfig.groupId
    );
    if (group) {
      try {
        // 使用Chrome API取消分组
        const tabIds = group.tabs
          .map((tab) => tab.id)
          .filter(Boolean) as number[];

        if (tabIds.length > 0) {
          await chrome.tabs.ungroup(tabIds);
          console.log("分组取消成功，标签页已移动到未分组");
        }

        // 更新本地状态
        ungroupedTabs.value.push(...group.tabs);
        customTabGroups.value = customTabGroups.value.filter(
          (g) => g.id !== contextMenuConfig.groupId
        );

        showContextMenu.value = false;

        // 刷新标签页数据以确保状态同步
        await refreshAllTabsData();
      } catch (error) {
        console.error("取消分组失败:", error);
        // 如果Chrome API调用失败，回滚本地状态
        ungroupedTabs.value = ungroupedTabs.value.filter(
          (tab) => !group.tabs.includes(tab)
        );
      }
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
      refreshAllTabsData();
    }
  }
};

// 标签页操作
const handleMoveToNewGroup = async () => {
  if (contextMenuConfig.tabId) {
    try {
      // 获取当前窗口的所有标签页和未分组标签页的位置
      const allTabs = await chrome.tabs.query({ currentWindow: true });
      const ungroupedTabs = allTabs.filter((tab) => tab.groupId === -1);
      const firstUngroupedTabIndex =
        ungroupedTabs.length > 0
          ? Math.min(...ungroupedTabs.map((tab) => tab.index))
          : allTabs.length;

      // 创建新分组
      const tabId = contextMenuConfig.tabId;
      const group = await chrome.tabs.group({ tabIds: [tabId] });

      // 设置分组标题和颜色
      const groupTitle = `新分组 ${new Date().getTime()}`;
      await chrome.tabGroups.update(group, {
        title: groupTitle,
        color: "grey",
      });

      // 将新分组移动到未分组标签之前
      try {
        // 获取分组中的标签页
        const groupTabs = await chrome.tabs.query({ groupId: group });
        if (groupTabs.length > 0) {
          const groupTab: any = groupTabs[0];

          // 如果分组不在未分组标签之前，则移动它
          if (groupTab.index > firstUngroupedTabIndex) {
            await chrome.tabs.move(groupTab.id, {
              index: firstUngroupedTabIndex,
            });
          }
        }
      } catch (moveError) {
        console.warn(`移动新分组"${groupTitle}"失败:`, moveError);
      }

      // 显示成功提示
      console.log("标签页已移动到新分组");
    } catch (error) {
      console.error("移动到新分组失败:", error);
    } finally {
      showContextMenu.value = false;
      await refreshAllTabsData();
    }
  }
};

const handleCloseTabFromMenu = async () => {
  if (contextMenuConfig.tabId) {
    await chrome.tabs.remove(contextMenuConfig.tabId);
    showContextMenu.value = false;
    refreshAllTabsData();
  }
};

// 键盘快捷键支持
const handleKeyDown = (event: KeyboardEvent) => {
  console.log("closeContextMenu");
  if (!showContextMenu.value) return;

  // ESC键关闭菜单
  if (event.key === "Escape") {
    console.log("Escape");
    closeContextMenu();
    event.preventDefault();
    event.stopPropagation();
  }
};

// 拖拽操作
const handleDragStart = (
  event: DragEvent,
  tab: chrome.tabs.Tab,
  group: ICustomTabGroup | null
) => {
  if (!tab.id) return;

  // 在自定义分组模式下，当用户开始拖拽标签时，自动取消排序类型，设置为default
  if (groupType.value === "custom" && domainSortType.value !== "default") {
    // 保存排序类型到本地存储
    chrome.storage.local.set({ [domainSortTypeStoreKey]: "default" });
  }

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

  // 清除位置提示
  clearSortPositionHint();
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

  clearSortPositionHint();
};

const handleDragEnter = (event: DragEvent, group: ICustomTabGroup | null) => {
  const groupId = group ? group.id : -1;
  if (dragOverGroupId.value !== groupId) {
    dragOverGroupId.value = groupId;
  }

  // 确保分组展开以便拖拽
  if (group && group.collapsed) {
    toggleGroupCollapse(group.id);
  }
};

// 拖拽离开分组
const handleDragLeave = (event: DragEvent, group: ICustomTabGroup | null) => {
  // 只有当鼠标真正离开分组区域时才清除状态
  const relatedTarget = event.relatedTarget as HTMLElement;
  const currentTarget = event.currentTarget as HTMLElement;
  if (!relatedTarget || !currentTarget?.contains(relatedTarget)) {
    dragOverGroupId.value = null;
    clearSortPositionHint();
  }
};

const handleDragOver = (event: DragEvent, group: ICustomTabGroup | null) => {
  event.preventDefault();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = "move";
  }
};

// 拖拽进入标签页（用于排序）
const handleDragEnterTab = (
  event: DragEvent,
  tab: any,
  group: ICustomTabGroup | null,
  index: number
) => {
  if (!dragData.value) return;

  // 计算拖拽位置
  const rect = (event.target as HTMLElement).getBoundingClientRect();
  const mouseY = event.clientY;
  const elementCenterY = rect.top + rect.height / 2;

  const position = mouseY < elementCenterY ? "before" : "after";

  // 更新位置提示
  sortPositionHint.groupId = group?.id ?? -1;
  sortPositionHint.index = index;
  sortPositionHint.position = position;
};

// 拖拽离开标签页
const handleDragLeaveTab = (
  event: DragEvent,
  tab: any,
  group: ICustomTabGroup | null,
  index: number
) => {
  const relatedTarget = event.relatedTarget as HTMLElement;
  const currentTarget = event.currentTarget as HTMLElement;
  if (!relatedTarget || !currentTarget?.contains(relatedTarget)) {
    clearSortPositionHint();
  }
};

// 拖拽在标签页上移动
const handleDragOverTab = (
  event: DragEvent,
  tab: any,
  group: ICustomTabGroup | null,
  index: number
) => {
  event.preventDefault();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = "move";
  }

  // 实时更新位置提示
  const rect = (event.target as HTMLElement).getBoundingClientRect();
  const mouseY = event.clientY;
  const elementCenterY = rect.top + rect.height / 2;

  const position = mouseY < elementCenterY ? "before" : "after";

  sortPositionHint.groupId = group?.id ?? -1;
  sortPositionHint.index = index;
  sortPositionHint.position = position;
};

// 清除位置提示
const clearSortPositionHint = () => {
  sortPositionHint.groupId = null;
  sortPositionHint.index = -1;
  sortPositionHint.position = "before";
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

  // 如果源分组和目标分组都是未分组（null），执行未分组标签页排序
  if (sourceGroup === null && targetGroup === null) {
    try {
      await handleUngroupedSort(event, tab, ungroupedTabs.value);
      showSortSuccessFeedback(-1);
    } catch (error) {
      console.error("未分组标签页拖拽排序失败:", error);
      showSortErrorFeedback();
    } finally {
      dragOverGroupId.value = null;
      dragData.value = null;
    }
    return;
  }

  try {
    await handleDropOperation(dragData.value, targetGroup);
    await refreshAllTabsData();
    showDragSuccessFeedback(targetGroupId);
  } catch (error) {
    console.error("拖拽移动标签页失败:", error);
    showDragErrorFeedback();
  } finally {
    dragOverGroupId.value = null;
    dragData.value = null;
  }
};

/**
 * 关闭tab回调
 */
const handleCloseTab = async (tab: chrome.tabs.Tab) => {
  if (!tab.id) return;
  await chrome.tabs.remove(tab.id);
  refreshAllTabsData();
};

// 获取所有标签页数据
async function refreshAllTabsData() {
  if (groupType.value === "domain") {
    tabList.value = await getAllDomainTabs();
  } else {
    const {
      groups,
      ungroupedTabs: ungrouped,
      activeGroupId: activeId,
    } = await getAllCustomTabs();
    customTabGroups.value = groups;
    ungroupedTabs.value = ungrouped;
    activeGroupId.value = activeId;
  }
}

// 初始化分组类型和排序类型
const initGroupType = async () => {
  const result = await chrome.storage.local.get([
    groupTypeStoreKey,
    domainSortTypeStoreKey,
  ]);
  groupType.value = result[groupTypeStoreKey] || "domain";
  domainSortType.value = result[domainSortTypeStoreKey] || "default";
};

/**
 * 对自定义分组进行排序
 */
function sortCustomGroups(
  groups: ICustomTabGroup[],
  sortType: "default" | "asc" | "desc"
): ICustomTabGroup[] {
  if (sortType === "asc") {
    // 按分组内标签页的域名进行升序排序
    return [...groups].sort((a, b) => {
      // 获取分组内标签页的域名（取第一个标签页的域名）
      const getGroupDomain = (group: ICustomTabGroup): string => {
        if (!group.tabs || group.tabs.length === 0) return "";
        const firstTab = group.tabs[0];
        return getDomainOfUrl(firstTab.url || "");
      };

      const domainA = getGroupDomain(a);
      const domainB = getGroupDomain(b);

      // 如果域名相同，按分组标题排序
      if (domainA === domainB) {
        return a.title.localeCompare(b.title);
      }

      return domainA.localeCompare(domainB);
    });
  } else if (sortType === "desc") {
    // 按分组内标签页的域名进行降序排序
    return [...groups].sort((a, b) => {
      // 获取分组内标签页的域名（取第一个标签页的域名）
      const getGroupDomain = (group: ICustomTabGroup): string => {
        if (!group.tabs || group.tabs.length === 0) return "";
        const firstTab = group.tabs[0];
        return getDomainOfUrl(firstTab.url || "");
      };

      const domainA = getGroupDomain(a);
      const domainB = getGroupDomain(b);

      // 如果域名相同，按分组标题排序
      if (domainA === domainB) {
        return a.title.localeCompare(b.title);
      }

      return domainB.localeCompare(domainA);
    });
  } else {
    // 默认排序：按标签页数量降序，然后按分组标题排序
    return [...groups].sort((a, b) => {
      const aCount = a.tabs?.length || 0;
      const bCount = b.tabs?.length || 0;
      if (bCount !== aCount) {
        return bCount - aCount;
      }
      return a.title.localeCompare(b.title);
    });
  }
}

/**
 * 对未分组标签页进行排序
 */
function sortUngroupedTabs(
  tabs: chrome.tabs.Tab[],
  sortType: "default" | "asc" | "desc"
): chrome.tabs.Tab[] {
  if (sortType === "asc") {
    // 按域名升序排序
    return [...tabs].sort((a, b) => {
      const domainA = getDomainOfUrl(a.url || "");
      const domainB = getDomainOfUrl(b.url || "");

      // 如果域名相同，按标题排序
      if (domainA === domainB) {
        const titleA = a.title?.toLowerCase() || "";
        const titleB = b.title?.toLowerCase() || "";
        return titleA.localeCompare(titleB);
      }

      return domainA.localeCompare(domainB);
    });
  } else if (sortType === "desc") {
    // 按域名降序排序
    return [...tabs].sort((a, b) => {
      const domainA = getDomainOfUrl(a.url || "");
      const domainB = getDomainOfUrl(b.url || "");

      // 如果域名相同，按标题排序
      if (domainA === domainB) {
        const titleA = a.title?.toLowerCase() || "";
        const titleB = b.title?.toLowerCase() || "";
        return titleA.localeCompare(titleB);
      }

      return domainB.localeCompare(domainA);
    });
  } else {
    // 默认排序：按标题排序
    return [...tabs].sort((a, b) => {
      const titleA = a.title?.toLowerCase() || "";
      const titleB = b.title?.toLowerCase() || "";
      return titleA.localeCompare(titleB);
    });
  }
}

/**
 * 对分组内的标签页进行排序
 */
function sortGroupTabs(
  tabs: chrome.tabs.Tab[],
  sortType: "default" | "asc" | "desc"
): chrome.tabs.Tab[] {
  if (sortType === "asc") {
    // 按域名升序排序
    return [...tabs].sort((a, b) => {
      const domainA = getDomainOfUrl(a.url || "");
      const domainB = getDomainOfUrl(b.url || "");

      // 如果域名相同，按标题排序
      if (domainA === domainB) {
        const titleA = a.title?.toLowerCase() || "";
        const titleB = b.title?.toLowerCase() || "";
        return titleA.localeCompare(titleB);
      }

      return domainA.localeCompare(domainB);
    });
  } else if (sortType === "desc") {
    // 按域名降序排序
    return [...tabs].sort((a, b) => {
      const domainA = getDomainOfUrl(a.url || "");
      const domainB = getDomainOfUrl(b.url || "");

      // 如果域名相同，按标题排序
      if (domainA === domainB) {
        const titleA = a.title?.toLowerCase() || "";
        const titleB = b.title?.toLowerCase() || "";
        return titleA.localeCompare(titleB);
      }

      return domainB.localeCompare(domainA);
    });
  } else {
    // 默认排序：按标题排序
    return [...tabs].sort((a, b) => {
      const titleA = a.title?.toLowerCase() || "";
      const titleB = b.title?.toLowerCase() || "";
      return titleA.localeCompare(titleB);
    });
  }
}

// 事件监听器
onMounted(async () => {
  await initGroupType();

  // 监听分组类型变化
  chrome.storage.onChanged.addListener((changes) => {
    if (changes[groupTypeStoreKey]) {
      groupType.value = changes[groupTypeStoreKey].newValue;
      refreshAllTabsData();
    }

    // 监听排序类型变化
    if (changes[domainSortTypeStoreKey]) {
      domainSortType.value = changes[domainSortTypeStoreKey].newValue;
    }
  });

  await refreshAllTabsData();
  const acTab = await getActiveTab();
  if (acTab?.id) {
    changeActiveTab({ tabId: acTab.id, windowId: acTab.windowId || 0 });
  }
  if (acTab?.url) {
    openDomainFold();
  }

  // 添加全局点击事件监听，用于关闭右键菜单
  document.addEventListener("click", closeContextMenu);

  // 添加键盘事件监听
  document.addEventListener("keydown", handleKeyDown);

  // TabGroup相关事件监听
  chrome.tabGroups.onCreated.addListener((group) => {
    if (groupType.value === "custom") {
      refreshAllTabsData();
    }
  });

  chrome.tabGroups.onRemoved.addListener((group) => {
    if (groupType.value === "custom") {
      refreshAllTabsData();
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
      refreshAllTabsData();
    }
  });

  chrome.tabs.onDetached.addListener((tabId, detachInfo) => {
    if (groupType.value === "custom") {
      refreshAllTabsData();
    }
  });

  chrome.tabs.onMoved.addListener((tabId, moveInfo) => {
    if (groupType.value === "custom") {
      refreshAllTabsData();
    }
  });

  // 现有的标签页事件监听保持不变
  chrome.tabs.onActivated.addListener(async (activeInfo) => {
    await refreshAllTabsData();
    wait(300);
    changeActiveTab({ tabId: activeInfo.tabId, windowId: activeInfo.windowId });
    const tabs = await chrome.tabs.query({ currentWindow: true });
    const activeTab = tabs.find((item) => item.id === activeInfo?.tabId);
    if (activeTab?.url) {
      openDomainFold();
    }
  });

  chrome.tabs.onCreated.addListener(async (tab) => {
    await refreshAllTabsData();
    if (tab?.id) {
      changeActiveTab({ tabId: tab.id, windowId: tab.windowId || 0 });
    }

    // 如果排序方式为默认，则直接返回
    if (domainSortType.value === "default") return;

    // 监听标签页更新，当标签页加载完成时自动排序
    const onTabUpdated = async (
      tabId: number,
      changeInfo: chrome.tabs.TabChangeInfo,
      updatedTab: chrome.tabs.Tab
    ) => {
      if (tabId === tab.id && isTabLoaded(updatedTab)) {
        // 标签页已加载完成，执行自动排序
        try {
          await moveNewTabToSameDomain(updatedTab);
        } catch (error) {
          console.error("自动排序新标签页失败:", error);
        }

        // 移除监听器，避免重复执行
        chrome.tabs.onUpdated.removeListener(onTabUpdated);
      }
    };

    // 添加标签页更新监听器
    chrome.tabs.onUpdated.addListener(onTabUpdated);
  });

  chrome.tabs.onRemoved.addListener(async (tabId, removeInfo) => {
    if (removeInfo?.isWindowClosing) return;
    await refreshAllTabsData();
    const newAcTab = await getActiveTab();
    if (newAcTab?.id) {
      changeActiveTab({ tabId: newAcTab.id, windowId: newAcTab.windowId || 0 });
    }
    if (newAcTab?.url) {
      openDomainFold();
    }
  });

  chrome.tabs.onUpdated.addListener(async (upTabId, changeInfo, tab) => {
    await refreshAllTabsData();
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
  document.removeEventListener("keydown", handleKeyDown);
});
</script>

<style lang="less">
@import "./styles/app.less";
</style>
