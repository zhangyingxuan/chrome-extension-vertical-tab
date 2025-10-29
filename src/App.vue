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
            <!-- <img class="favicon" :src="tab.favIconUrl" alt="" srcset=""> -->
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
      }"
      @contextmenu.prevent="handleGroupContextMenu($event, group)"
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
    <!-- 未分组的标签页 -->
    <div v-if="ungroupedTabs.length > 0" class="group-panel">
      <h3 class="group-title">
        <div class="group-color" style="background-color: #999"></div>
        <p class="title">未分组</p>
        <p class="count">({{ ungroupedTabs.length }})</p>
      </h3>
      <ul class="tab-list">
        <li
          v-for="(tab, index) in ungroupedTabs"
          :key="index"
          :title="tab?.title"
          :class="{ active: tab.id === activeTabId }"
          @click="handleClickTab(tab)"
          @contextmenu.prevent="handleTabContextMenu($event, tab)"
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

const toggleGroupCollapse = (groupId: number) => {
  const group = customTabGroups.value.find((g) => g.id === groupId);
  if (group) {
    group.collapsed = !group.collapsed;
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

    // 初始化分组
    respTabGroup.forEach((group) => {
      groupsMap.set(group.id, {
        id: group.id,
        title: group.title || `分组 ${group.id}`,
        color: group.color || "grey",
        tabs: [],
        collapsed: false,
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
      getAllTabs();
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
