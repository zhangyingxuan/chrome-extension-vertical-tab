<template>
  <div v-if="groupType === 'domain'" class="tabs-tree">
    <div
      v-for="(item, index) in showTabList"
      :key="index"
      class="domain-panel"
      :class="{
        active: activeDomain === item.domain || currDomain === item.domain,
      }"
    >
      <h3 class="domain-title" @click="() => handleActiveDomain(item.domain)">
        <img
          class="left-facicon"
          :src="item?.tabs?.[0]?.favIconUrl || defaultIcon"
          alt=""
          srcset=""
        />
        <p class="title">{{ item.domain }}</p>
        <p class="count">({{ item?.tabs?.length }})</p>
        <i class="right-arrow iconfont icon-arrow-down"></i>
      </h3>
      <transition name="slide-down">
        <ul
          v-show="activeDomain === item.domain || currDomain === item.domain"
          class="tab-list"
        >
          <li
            v-for="(tab, jdx) in item?.tabs"
            :key="jdx"
            :title="tab?.title"
            :class="{ active: tab.id === activeTabId }"
            :data-favicon="tab.favIconUrl"
            @click="handleClickTab(tab)"
          >
            <!-- <img class="favicon" :src="tab.favIconUrl" alt="" srcset="" /> -->
            <div class="left-title" :data-tab-id="tab?.id">
              {{ tab.title }}
            </div>
            <div class="right-actions">
              <button
                title="关闭标签页"
                @click.stop="() => handleCloseTab(tab)"
              >
                <i class="iconfont icon-close-circle"></i>
              </button>
            </div>
          </li>
        </ul>
      </transition>
    </div>
  </div>
  <div v-else-if="groupType === 'custom'" class="tabs-tree">
    <div
      v-for="(group, index) in customTabGroups"
      :key="group.id"
      class="group-panel"
      :class="{
        active: activeGroupId === group.id,
        collapsed: group.collapsed,
        'drag-over': dragOverGroupId === group.id,
      }"
      :data-group-id="group.id"
      @contextmenu.prevent="handleGroupContextMenu($event, group)"
      @dragover.prevent="handleDragOver($event, group)"
      @dragenter.prevent="handleDragEnter($event, group)"
      @dragleave.prevent="handleDragLeave($event, group)"
      @drop.prevent="handleDrop($event, group)"
    >
      <h3 class="group-title" @click="() => toggleGroupCollapse(group.id)">
        <div
          class="group-color"
          :style="{ backgroundColor: getGroupColor(group.color) }"
        ></div>
        <p class="title">{{ group.title || "未命名分组" }}</p>
        <p class="count">({{ group.tabs?.length }})</p>
        <i
          class="right-arrow iconfont"
          :class="group.collapsed ? 'icon-arrow-right' : 'icon-arrow-down'"
        ></i>
      </h3>
      <transition name="slide-down">
        <ul v-show="!group.collapsed" class="tab-list">
          <li
            v-for="(tab, jdx) in group.tabs"
            :key="jdx"
            :title="tab?.title"
            :class="{ active: tab.id === activeTabId }"
            :data-favicon="tab.favIconUrl"
            @click="handleClickTab(tab)"
            @contextmenu.prevent="handleTabContextMenu($event, tab, group)"
            draggable="true"
            @dragstart="handleDragStart($event, tab, group)"
            @dragend="handleDragEnd"
          >
            <div class="left-title" :data-tab-id="tab?.id">
              {{ tab.title }}
            </div>
            <div class="right-actions">
              <button
                title="关闭标签页"
                @click.stop="() => handleCloseTab(tab)"
              >
                <i class="iconfont icon-close-circle"></i>
              </button>
            </div>
          </li>
        </ul>
      </transition>
    </div>

    <!-- 未分组标签页区域 -->
    <div
      v-if="ungroupedTabs.length > 0"
      class="group-panel ungrouped-panel"
      :class="{
        'drag-over': dragOverGroupId === -1,
      }"
      @dragover.prevent="handleDragOver($event, null)"
      @dragenter.prevent="handleDragEnter($event, null)"
      @dragleave.prevent="handleDragLeave($event, null)"
      @drop.prevent="handleDrop($event, null)"
    >
      <h3 class="group-title">
        <div class="group-color" style="background-color: #ccc"></div>
        <p class="title">未分组</p>
        <p class="count">({{ ungroupedTabs.length }})</p>
      </h3>
      <ul class="tab-list">
        <li
          v-for="(tab, index) in ungroupedTabs"
          :key="index"
          :title="tab?.title"
          :class="{ active: tab.id === activeTabId }"
          :data-favicon="tab.favIconUrl"
          @click="handleClickTab(tab)"
          @contextmenu.prevent="handleTabContextMenu($event, tab, undefined)"
          draggable="true"
          @dragstart="handleDragStart($event, tab, null)"
          @dragend="handleDragEnd"
        >
          <div class="left-title" :data-tab-id="tab?.id">
            {{ tab.title }}
          </div>
          <div class="right-actions">
            <button title="关闭标签页" @click.stop="() => handleCloseTab(tab)">
              <i class="iconfont icon-close-circle"></i>
            </button>
          </div>
        </li>
      </ul>
    </div>
  </div>
  <div v-else></div>
  <footer-bar @change="handleSearch" @changeGroupType="handleGroupTypeChange" />

  <!-- 右键菜单 -->
  <div
    v-if="showContextMenu"
    class="context-menu"
    :style="{
      left: contextMenuPosition.x + 'px',
      top: contextMenuPosition.y + 'px',
    }"
    @click.stop
  >
    <div v-if="contextMenuConfig.type === 'group'" class="menu-section">
      <div class="menu-item" @click="handleRenameGroup">重命名分组</div>
      <div class="menu-item" @click="handleChangeGroupColor">修改颜色</div>
      <div class="menu-item" @click="handleUngroupTabs">取消分组</div>
      <div class="menu-item" @click="handleCloseGroup">关闭分组</div>
    </div>
    <div v-if="contextMenuConfig.type === 'tab'" class="menu-section">
      <div class="menu-item" @click="handleMoveToNewGroup">移动到新分组</div>
      <div class="menu-item" @click="handleMoveToExistingGroup">
        移动到现有分组
      </div>
      <div class="menu-item" @click="handleCloseTabFromMenu">关闭标签页</div>
    </div>
  </div>

  <!-- 分组设置模态框 -->
  <div v-if="showGroupModal" class="modal-overlay" @click="closeGroupModal">
    <div class="modal-content" @click.stop>
      <h3>{{ modalTitle }}</h3>
      <div class="modal-body">
        <div v-if="modalType === 'rename'">
          <input
            v-model="newGroupTitle"
            type="text"
            placeholder="输入分组名称"
          />
        </div>
        <div v-if="modalType === 'color'">
          <div class="color-options">
            <div
              v-for="color in GROUP_COLORS"
              :key="color.value"
              class="color-option"
              :class="{ active: selectedColor === color.value }"
              :style="{ backgroundColor: getGroupColor(color.value) }"
              @click="selectedColor = color.value"
            >
              {{ color.label }}
            </div>
          </div>
        </div>
      </div>
      <div class="modal-actions">
        <button @click="closeGroupModal">取消</button>
        <button @click="confirmGroupAction">确认</button>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, nextTick, onMounted, onUnmounted, reactive, ref } from "vue";
import {
  ISearchData,
  ITabGroup,
  ICustomTabGroup,
  IContextMenuConfig,
  GROUP_COLORS,
} from "./type";
import { getDomainOfUrl, wait } from "./utils/index";
import { groupTypeStoreKey } from "./config";
import FooterBar from "./components/FooterBar.vue";

const groupType = ref("domain");
const activeTabId = ref(0);
const activeDomain = ref(""); // 选中展开的域名
const currDomain = ref(""); // 当前tab的域名
const defaultIcon = chrome.runtime.getURL("/sources/ic-chrome-16.png");

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

function handleGroupTypeChange(type: string) {
  groupType.value = type;
  getAllTabs();
}

function handleClickTab(tab: chrome.tabs.Tab) {
  if (!tab.id) return;
  chrome.tabs.update(tab.id, { active: true });
}

const tabList = ref<ITabGroup[]>([]);
const searchData = reactive({
  keywords: "",
});

const showTabList = computed<ITabGroup[]>(() => {
  const list = tabList.value.filter((item) => {
    const hasTabWidthSearchTitle = item?.tabs?.some((tab) => {
      if (!tab?.title || !tab?.url) return false;
      return (
        tab?.title?.indexOf(searchData.keywords) >= 0 ||
        tab?.url?.indexOf(searchData.keywords) >= 0
      );
    });
    return (
      item?.domain.indexOf(searchData.keywords) >= 0 || hasTabWidthSearchTitle
    );
  });
  return [...list];
});

/**
 * 获取当前激活的tab
 */
const getActiveTab = async (): Promise<chrome.tabs.Tab> => {
  const [currTab] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });
  return currTab;
};

const handleActiveDomain = (domain: string) => {
  if (activeDomain.value !== domain) {
    activeDomain.value = domain;
  } else {
    activeDomain.value = "";
  }
};

/**
 * 展开指定domain目录
 * @param domain
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
 * @param activeInfo
 */
const changeActiveTab = async (activeInfo: chrome.tabs.TabActiveInfo) => {
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

// TabGroup相关方法
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

const toggleGroupCollapse = async (groupId: number) => {
  const group = customTabGroups.value.find((g) => g.id === groupId);
  if (group) {
    const newCollapsedState = !group.collapsed;
    group.collapsed = newCollapsedState;

    // 同步更新Chrome tabGroups的collapsed状态
    try {
      await chrome.tabGroups.update(groupId, {
        collapsed: newCollapsedState,
      });
    } catch (error) {
      console.error("更新分组折叠状态失败:", error);
      // 如果更新失败，恢复本地状态
      group.collapsed = !newCollapsedState;
    }
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
  // 实现移动到新分组逻辑
  showContextMenu.value = false;
};

const handleMoveToExistingGroup = () => {
  // 实现移动到现有分组逻辑
  showContextMenu.value = false;
};

const handleCloseTabFromMenu = async () => {
  if (contextMenuConfig.tabId) {
    await chrome.tabs.remove(contextMenuConfig.tabId);
    showContextMenu.value = false;
    getAllTabs();
  }
};

// 拖拽开始
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

// 拖拽结束
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

// 拖拽进入分组区域
const handleDragEnter = (event: DragEvent, group: ICustomTabGroup | null) => {
  const groupId = group ? group.id : -1; // -1 表示未分组区域
  dragOverGroupId.value = groupId;

  // 确保分组展开以便拖拽
  if (group && group.collapsed) {
    toggleGroupCollapse(group.id);
  }
};

// 拖拽离开分组区域
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

// 拖拽在分组区域上移动
const handleDragOver = (event: DragEvent, group: ICustomTabGroup | null) => {
  event.preventDefault();
  const groupId = group ? group.id : -1;
  dragOverGroupId.value = groupId;
};

// 拖拽放置
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
    await handleGroupInternalSort(event, tab, sourceGroup);
    return;
  }

  // 如果源分组和目标分组相同，不执行操作
  if (sourceGroup?.id === targetGroupId) {
    dragOverGroupId.value = null;
    return;
  }

  try {
    // 使用 Chrome API 将标签页移动到目标分组
    if (targetGroupId === -1) {
      // 移动到未分组
      await chrome.tabs.ungroup(tab.id);
    } else {
      // 移动到指定分组
      await chrome.tabs.group({
        tabIds: tab.id,
        groupId: targetGroupId,
      });

      // 如果目标分组有自定义标题或颜色，同步更新Chrome分组
      if (
        targetGroup &&
        (targetGroup.title !== `分组 ${targetGroupId}` ||
          targetGroup.color !== "grey")
      ) {
        await chrome.tabGroups.update(targetGroupId, {
          title: targetGroup.title,
          color: targetGroup.color as chrome.tabGroups.Color,
        });
      }
    }

    // 刷新标签页数据
    await getAllTabs();

    // 显示操作成功的视觉反馈
    showDragSuccessFeedback(targetGroupId);
  } catch (error) {
    console.error("拖拽移动标签页失败:", error);
    // 显示错误提示
    showDragErrorFeedback();
  } finally {
    // 重置拖拽状态
    dragOverGroupId.value = null;
    dragData.value = null;
  }
};

// 显示拖拽成功反馈
const showDragSuccessFeedback = (targetGroupId: number) => {
  // 可以添加视觉反馈，比如短暂的背景色变化
  const targetElement =
    targetGroupId === -1
      ? document.querySelector(".ungrouped-panel")
      : document.querySelector(`[data-group-id="${targetGroupId}"]`);

  if (targetElement) {
    targetElement.classList.add("drag-success");
    setTimeout(() => {
      targetElement.classList.remove("drag-success");
    }, 500);
  }
};

// 显示拖拽错误反馈
const showDragErrorFeedback = () => {
  // 可以添加错误提示，比如红色闪烁
  const errorElement = document.querySelector(".tabs-tree");
  if (errorElement) {
    errorElement.classList.add("drag-error");
    setTimeout(() => {
      errorElement.classList.remove("drag-error");
    }, 1000);
  }
};

// 分组内拖拽排序
const handleGroupInternalSort = async (
  event: DragEvent,
  draggedTab: chrome.tabs.Tab,
  group: ICustomTabGroup
) => {
  if (!draggedTab.id) return;

  try {
    // 获取拖拽目标位置的元素
    const targetElement = event.target as HTMLElement;
    const tabListElement = targetElement.closest(".tab-list");

    if (!tabListElement) return;

    // 获取所有标签页元素
    const tabElements = Array.from(tabListElement.querySelectorAll("li"));

    // 找到拖拽的标签页元素
    const draggedElement = tabElements.find((el) => {
      const tabIdElement = el.querySelector("[data-tab-id]") as HTMLElement;
      return (
        tabIdElement &&
        parseInt(tabIdElement.dataset.tabId || "0") === draggedTab.id
      );
    });

    if (!draggedElement) return;

    // 计算拖拽的目标位置
    const mouseY = event.clientY;
    let targetIndex = -1;
    let insertPosition: "before" | "after" = "before";

    // 遍历所有标签页元素，找到插入位置
    for (let i = 0; i < tabElements.length; i++) {
      const element = tabElements[i];
      if (element === draggedElement) continue;

      const rect = element.getBoundingClientRect();
      const elementCenterY = rect.top + rect.height / 2;

      // 如果鼠标在元素的上半部分，插入到该元素之前
      if (mouseY < elementCenterY) {
        targetIndex = i;
        insertPosition = "before";
        break;
      }
      // 如果鼠标在元素的下半部分，检查是否是最后一个元素
      else if (i === tabElements.length - 1) {
        targetIndex = i;
        insertPosition = "after";
      }
    }

    // 如果找不到合适的位置，插入到最后
    if (targetIndex === -1) {
      targetIndex = tabElements.length;
      insertPosition = "after";
    }

    // 获取当前分组中的所有标签页（按当前显示顺序）
    const currentTabIds = group.tabs
      .map((tab) => tab.id)
      .filter(Boolean) as number[];

    // 从数组中移除拖拽的标签页
    const draggedTabIndex = currentTabIds.indexOf(draggedTab.id);
    if (draggedTabIndex === -1) return;

    currentTabIds.splice(draggedTabIndex, 1);

    // 调整目标索引（考虑移除拖拽标签页后的数组变化）
    let adjustedTargetIndex = targetIndex;
    if (targetIndex > draggedTabIndex) {
      adjustedTargetIndex--;
    }

    // 根据插入位置确定最终索引
    const finalIndex =
      insertPosition === "after"
        ? adjustedTargetIndex + 1
        : adjustedTargetIndex;

    // 插入到目标位置
    currentTabIds.splice(finalIndex, 0, draggedTab.id);

    // 使用Chrome API重新排序标签页
    // 首先获取窗口中的所有标签页
    const allTabs = await chrome.tabs.query({ currentWindow: true });

    // 找到分组中第一个标签页的索引作为基准
    const groupTabs = allTabs.filter((tab) => tab.groupId === group.id);
    if (groupTabs.length === 0) return;

    const firstGroupTabIndex = groupTabs[0].index;

    // 重新排列分组内的标签页顺序
    for (let i = 0; i < currentTabIds.length; i++) {
      await chrome.tabs.move(currentTabIds[i], {
        index: firstGroupTabIndex + i,
      });
    }

    // 刷新标签页数据
    await getAllTabs();

    // 显示排序成功的视觉反馈
    showSortSuccessFeedback(group.id);
  } catch (error) {
    console.error("分组内拖拽排序失败:", error);
    showSortErrorFeedback();
  } finally {
    // 重置拖拽状态
    dragOverGroupId.value = null;
    dragData.value = null;
  }
};

// 显示排序成功反馈
const showSortSuccessFeedback = (groupId: number) => {
  const groupElement = document.querySelector(`[data-group-id="${groupId}"]`);
  if (groupElement) {
    groupElement.classList.add("sort-success");
    setTimeout(() => {
      groupElement.classList.remove("sort-success");
    }, 500);
  }
};

// 显示排序错误反馈
const showSortErrorFeedback = () => {
  const errorElement = document.querySelector(".tabs-tree");
  if (errorElement) {
    errorElement.classList.add("sort-error");
    setTimeout(() => {
      errorElement.classList.remove("sort-error");
    }, 500);
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

// 获取所有标签页数据
async function getAllTabs() {
  if (groupType.value === "domain") {
    // 现有的域名分组逻辑
    const resp = await chrome.tabs.query({
      currentWindow: true,
    });
    const listMap: { [domain: string]: chrome.tabs.Tab[] } = {};
    resp?.forEach((tab) => {
      if (tab.url) {
        const domain = getDomainOfUrl(tab.url);
        if (listMap[domain]) {
          listMap[domain].push(tab);
        } else {
          listMap[domain] = [tab];
        }
      }
    });
    tabList.value = Object.keys(listMap).map((domain) => {
      return {
        domain,
        tabs: listMap[domain],
      };
    });
  } else {
    // TabGroup分组逻辑
    const respTab = await chrome.tabs.query({
      currentWindow: true,
    });

    // 获取Chrome原生分组信息
    const respTabGroup = await chrome.tabGroups.query({});

    // 处理分组数据
    const groupsMap: Map<number, ICustomTabGroup> = new Map();

    // 初始化分组，从Chrome tabGroups获取collapsed状态
    respTabGroup.forEach((group) => {
      groupsMap.set(group.id, {
        id: group.id,
        title: group.title || `分组 ${group.id}`,
        color: group.color || "grey",
        tabs: [],
        collapsed: group.collapsed || false, // 从Chrome获取collapsed状态
      });
    });

    // 清空未分组标签页数组，避免重复累积
    ungroupedTabs.value = [];

    // 将标签页分配到对应分组
    respTab.forEach((tab) => {
      if (tab.groupId !== -1 && groupsMap.has(tab.groupId)) {
        const group = groupsMap.get(tab.groupId);
        if (group) {
          group.tabs.push(tab);
        }
      } else {
        // 未分组的标签页
        ungroupedTabs.value.push(tab);
      }
    });

    // 更新自定义分组列表
    customTabGroups.value = Array.from(groupsMap.values());

    // 设置活动分组
    const activeTab = respTab.find((tab) => tab.active);
    if (activeTab && activeTab.groupId !== -1) {
      activeGroupId.value = activeTab.groupId;
    }
  }
}

/**
 * 关闭tab回调
 * @param tab
 */
const handleCloseTab = async (tab: chrome.tabs.Tab) => {
  if (!tab.id) return;
  await chrome.tabs.remove(tab.id);
  getAllTabs();
};

const handleSearch = (data: ISearchData) => {
  searchData.keywords = data.keywords;
};

// 事件监听器
onMounted(async () => {
  // 监听分组类型变化
  chrome.storage.onChanged.addListener((changes) => {
    if (changes[groupTypeStoreKey]) {
      groupType.value = changes[groupTypeStoreKey].newValue;
      getAllTabs();
    }
  });

  await getAllTabs();
  const acTab = await getActiveTab();
  acTab?.id && changeActiveTab({ tabId: acTab?.id, windowId: acTab?.windowId });
  acTab.url && openDomainFold();

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
    activeTab?.url && openDomainFold();
  });

  chrome.tabs.onCreated.addListener(async (tab) => {
    await getAllTabs();
    tab?.id && changeActiveTab({ tabId: tab?.id, windowId: tab?.windowId });
  });

  chrome.tabs.onRemoved.addListener(async (tabId, removeInfo) => {
    if (removeInfo?.isWindowClosing) return;
    await getAllTabs();
    const newAcTab = await getActiveTab();
    newAcTab?.id &&
      changeActiveTab({ tabId: newAcTab?.id, windowId: newAcTab?.windowId });
    newAcTab.url && openDomainFold();
  });

  chrome.tabs.onUpdated.addListener(async (upTabId, changeInfo, tab) => {
    await getAllTabs();
    nextTick(() => {
      if (
        tab.active &&
        (changeInfo.status === "complete" ||
          changeInfo?.url ||
          changeInfo?.favIconUrl ||
          changeInfo?.title)
      ) {
        tab?.url && openDomainFold();
      }
    });
  });
});

onUnmounted(() => {
  chrome.tabs.onActivated.removeListener(changeActiveTab);
  document.removeEventListener("click", closeContextMenu);
});
</script>

<style lang="less" src="./styles/app.less" scoped></style>

<style lang="less" scoped>
// TabGroup分组样式
.group-panel {
  border-bottom: 1px solid var(--border-color);

  &.active {
    background-color: var(--domain-hover-color);
  }

  &.collapsed {
    .tab-list {
      display: none;
    }
  }

  &.drag-over {
    background-color: var(--domain-hover-color);
  }
}

.group-title {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  margin: 0;
  cursor: pointer;
  user-select: none;
  border-bottom: 1px solid transparent;

  &:hover {
    background-color: var(--domain-hover-color);
  }

  .group-color {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    margin-right: 8px;
    flex-shrink: 0;
  }

  .title {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: var(--font-color);
    flex: 1;
  }

  .count {
    margin: 0;
    font-size: 12px;
    color: var(--secondary-font-color);
  }

  .right-arrow {
    font-size: 12px;
    color: var(--secondary-font-color);
    transition: transform 0.2s;
  }
}

// 右键菜单样式
.context-menu {
  position: fixed;
  background: var(--bg-color);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  min-width: 160px;

  .menu-section {
    padding: 4px 0;
  }

  .menu-item {
    padding: 8px 12px;
    cursor: pointer;
    font-size: 13px;
    color: var(--font-color);

    &:hover {
      background-color: var(--domain-hover-color);
    }
  }
}

// 模态框样式
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
  z-index: 1001;
}

.modal-content {
  background: var(--bg-color);
  border-radius: 8px;
  padding: 20px;
  min-width: 300px;
  max-width: 500px;

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
      border: 1px solid var(--border-color);
      border-radius: 4px;
      background: var(--bg-color);
      color: var(--font-color);

      &:focus {
        outline: none;
        border-color: var(--border-color);
      }
    }

    .color-options {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
    }

    .color-option {
      padding: 8px;
      border: 2px solid transparent;
      border-radius: 4px;
      text-align: center;
      cursor: pointer;
      font-size: 12px;
      color: white;
      text-shadow: 1px 1px 1px rgba(0, 0, 0, 0.5);

      &.active {
        border-color: var(--border-color);
      }

      &:hover {
        opacity: 0.8;
      }
    }
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;

    button {
      padding: 8px 16px;
      border: 1px solid var(--border-color);
      border-radius: 4px;
      background: var(--bg-color);
      color: var(--font-color);
      cursor: pointer;

      &:last-child {
        background: var(--button-bg-color);
        color: var(--font-color);
        border-color: var(--border-color);
      }

      &:hover {
        opacity: 0.8;
      }
    }
  }
}

// 响应式调整
@media (max-width: 768px) {
  .modal-content {
    margin: 20px;
    width: calc(100% - 40px);
  }

  .color-options {
    grid-template-columns: repeat(2, 1fr) !important;
  }
}
</style>
