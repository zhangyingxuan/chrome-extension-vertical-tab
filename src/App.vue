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
          loading="lazy"
        />
        <p class="title">{{ item.domain }}</p>
        <p class="count">({{ item?.tabs?.length }})</p>
        <i class="right-arrow iconfont icon-arrow-down"></i>
      </h3>
      <transition name="slide-down">
        <div
          v-show="activeDomain === item.domain || currDomain === item.domain"
          class="tab-list-container"
        >
          <div class="tab-list">
            <div
              v-for="(tab, jdx) in item.tabs"
              :key="jdx"
              :title="tab?.title"
              :class="{ active: tab.id === activeTabId }"
              :data-favicon="tab.favIconUrl"
              class="tab-item"
              @click="handleClickTab(tab)"
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
            </div>
          </div>
        </div>
      </transition>
    </div>
  </div>
  <div v-else></div>
  <footer-bar @change="handleSearch" @changeGroupType="handleGroupTypeChange" />
</template>

<script lang="ts" setup>
import { computed, nextTick, onMounted, onUnmounted, reactive, ref } from "vue";
import { ISearchData, ITabGroup } from "./type";
import { getDomainOfUrl } from "./utils/index";
import { groupTypeStoreKey } from "./config";
import FooterBar from "./components/FooterBar.vue";

const groupType = ref("domain");
const activeTabId = ref(0);
const activeDomain = ref(""); // 选中展开的域名
const currDomain = ref(""); // 当前tab的域名
const defaultIcon = chrome.runtime.getURL("/sources/ic-chrome-16.png");
// 添加防抖相关变量
const debounceTimer = ref<number | null>(null);
const isUpdatingTabs = ref(false);
// 添加缓存机制
const tabDataCache = ref<{ timestamp: number; data: ITabGroup[] } | null>(null);
const CACHE_TIMEOUT = 5000; // 5秒缓存

function handleGroupTypeChange(type: string) {
  groupType.value = type;
}

function handleClickTab(tab: chrome.tabs.Tab) {
  if (!tab.id) return;
  chrome.tabs.update(tab.id, { active: true });
}
const tabList = ref<ITabGroup[]>([]);
const searchData = reactive({
  keywords: "",
});

// 优化计算属性，添加更高效的搜索算法和缓存
const showTabList = computed<ITabGroup[]>(() => {
  // 如果tabList.value不是数组，返回空数组避免错误
  if (!Array.isArray(tabList.value)) {
    return [];
  }

  // 如果搜索关键词为空，直接返回原始列表，避免不必要的过滤计算
  if (!searchData.keywords.trim()) {
    return tabList.value;
  }

  const keywords = searchData.keywords.toLowerCase();
  // 使用更高效的过滤算法
  const list = tabList.value.filter((item) => {
    // 先检查域名匹配 - 使用startsWith和includes组合提高性能
    if (
      item.domain.toLowerCase().startsWith(keywords) ||
      item.domain.toLowerCase().includes(keywords)
    ) {
      return true;
    }

    // 优化标签页匹配，减少不必要的遍历
    return item?.tabs?.some((tab) => {
      if (!tab?.title || !tab?.url) return false;

      // 使用更高效的字符串匹配
      const title = tab.title.toLowerCase();
      const url = tab.url.toLowerCase();

      return title.includes(keywords) || url.includes(keywords);
    });
  });
  return list;
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
  console.log("展开的菜单id", acTab);

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
};

// 优化防抖函数，添加缓存检查
const debouncedGetAllTabs = () => {
  // 检查缓存是否有效
  const now = Date.now();
  if (
    tabDataCache.value &&
    now - tabDataCache.value.timestamp < CACHE_TIMEOUT
  ) {
    console.log("使用缓存数据，跳过API调用");
    return;
  }

  if (debounceTimer.value) {
    clearTimeout(debounceTimer.value);
  }
  debounceTimer.value = setTimeout(() => {
    getAllTabs();
  }, 150); // 增加到150ms防抖，进一步减少频繁调用
};

// 优化getAllTabs函数，添加缓存和性能优化
async function getAllTabs() {
  if (isUpdatingTabs.value) return;
  isUpdatingTabs.value = true;

  try {
    // 根据分组类型 对tab进行分组
    if (groupType.value === "domain") {
      const resp = await chrome.tabs.query({
        currentWindow: true,
      });

      // 更新缓存
      tabDataCache.value = {
        timestamp: Date.now(),
        data: tabList.value, // 先保存当前数据作为缓存
      };

      const listMap: { [domain: string]: chrome.tabs.Tab[] } = {};
      // 添加数组检查，防止在非数组上调用forEach
      if (Array.isArray(resp)) {
        // 使用for循环替代forEach，性能更好
        for (let i = 0; i < resp.length; i++) {
          const tab = resp[i];
          if (tab.url) {
            const domain = getDomainOfUrl(tab.url);
            if (listMap[domain]) {
              listMap[domain].push(tab);
            } else {
              listMap[domain] = [tab];
            }
          }
        }
      }
      tabList.value = Object.keys(listMap).map((domain) => {
        return {
          domain,
          tabs: listMap[domain],
        };
      });

      // 更新缓存
      tabDataCache.value = {
        timestamp: Date.now(),
        data: tabList.value,
      };
    } else {
      // 分组，分组名称list，普通tablist
      const respTab = await chrome.tabs.query({
        currentWindow: true,
      });
      // 获取多个分组信息
      const respTabGroup = await chrome.tabs.query({});
    }
  } finally {
    isUpdatingTabs.value = false;
  }
  return;
}

/**
 * 关闭tab回调
 * @param tab
 */
const handleCloseTab = async (tab: chrome.tabs.Tab) => {
  if (!tab.id) return;
  await chrome.tabs.remove(tab.id);
  // 清除缓存，因为数据已变化
  tabDataCache.value = null;
  debouncedGetAllTabs(); // 使用防抖版本
};

const handleSearch = (data: ISearchData) => {
  console.log("search", data);
  searchData.keywords = data.keywords;
};

onMounted(async () => {
  // 监听
  chrome.storage.onChanged.addListener((changes) => {
    if (changes[groupTypeStoreKey]) {
      groupType.value = changes[groupTypeStoreKey].newValue;
    }
  });

  await getAllTabs();
  const acTab = await getActiveTab();
  acTab?.id && changeActiveTab({ tabId: acTab?.id, windowId: acTab?.windowId });
  acTab.url && openDomainFold();

  // tab激活切换 - 优化事件监听器
  chrome.tabs.onActivated.addListener(async (activeInfo) => {
    console.log("标签页激活", activeInfo);
    // 只在必要时更新数据
    if (activeTabId.value !== activeInfo.tabId) {
      debouncedGetAllTabs();
      changeActiveTab({
        tabId: activeInfo.tabId,
        windowId: activeInfo.windowId,
      });
    }
  });

  // tab新创建
  chrome.tabs.onCreated.addListener(async (tab) => {
    console.log("标签页创建", tab);
    // 清除缓存，因为数据已变化
    tabDataCache.value = null;
    debouncedGetAllTabs();
    tab?.id && changeActiveTab({ tabId: tab?.id, windowId: tab?.windowId });
  });

  // tab被关闭
  chrome.tabs.onRemoved.addListener(async (tabId, removeInfo) => {
    console.log("标签页关闭", removeInfo);
    if (removeInfo?.isWindowClosing) return;
    // 清除缓存，因为数据已变化
    tabDataCache.value = null;
    debouncedGetAllTabs();
    const newAcTab = await getActiveTab();
    newAcTab?.id &&
      changeActiveTab({ tabId: newAcTab?.id, windowId: newAcTab?.windowId });
    newAcTab.url && openDomainFold();
  });

  // 内容更新不用重新处理选中展开逻辑 - 优化更新逻辑
  chrome.tabs.onUpdated.addListener(async (upTabId, changeInfo, tab) => {
    console.log("标签页更新", tab, changeInfo);
    // 只有在标题、URL或图标变化时才更新列表，避免频繁更新
    if (changeInfo?.url || changeInfo?.favIconUrl || changeInfo?.title) {
      // 清除缓存，因为数据已变化
      tabDataCache.value = null;
      debouncedGetAllTabs();
    }
    nextTick(() => {
      // 如果刷新的是当前激活的tab，则更新选中domain文件夹
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
  // 清理所有事件监听器
  chrome.tabs.onActivated.removeListener(changeActiveTab);
  chrome.tabs.onCreated.removeListener(debouncedGetAllTabs);
  chrome.tabs.onRemoved.removeListener(debouncedGetAllTabs);
  chrome.tabs.onUpdated.removeListener(debouncedGetAllTabs);

  if (debounceTimer.value) {
    clearTimeout(debounceTimer.value);
  }
  // 清除缓存
  tabDataCache.value = null;
});
</script>
<style lang="less" src="./styles/app.less" scoped></style>
