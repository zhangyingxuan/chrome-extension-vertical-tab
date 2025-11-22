<template>
  <div class="domain-group-view">
    <div
      v-for="(item, index) in filteredTabList"
      :key="index"
      class="domain-panel"
      :class="{ active: shouldDomainBeExpanded(item.domain) }"
    >
      <h3
        class="domain-title"
        @click="() => $emit('active-domain', item.domain)"
      >
        <img
          class="left-facicon"
          :src="item?.tabs?.[0]?.favIconUrl || defaultIcon"
          alt=""
        />
        <p class="title">{{ item.domain }}</p>
        <p class="count">({{ getFilteredTabs(item).length }})</p>
        <CaretDownIcon class="right-arrow" />
      </h3>
      <transition name="slide-down">
        <ul v-show="shouldDomainBeExpanded(item.domain)" class="tab-list">
          <li
            v-for="(tab, jdx) in getFilteredTabs(item)"
            :key="jdx"
            :title="tab?.title"
            :class="{ active: tab.id === activeTabId }"
            @click="$emit('click-tab', tab)"
          >
            <div class="left-title" :data-tab-id="tab?.id">{{ tab.title }}</div>
            <div class="right-actions">
              <button title="关闭标签页" @click.stop="$emit('close-tab', tab)">
                <CloseCircleIcon />
              </button>
            </div>
          </li>
        </ul>
      </transition>
    </div>

    <div
      v-if="filteredTabList.length === 0 && searchKeywords"
      class="no-search-results"
    >
      <div class="icon">🔍</div>
      <div class="message">未找到匹配的结果</div>
      <div class="suggestion">尝试使用不同的关键词搜索</div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed } from "vue";
import { CaretDownIcon, CloseCircleIcon } from "tdesign-icons-vue-next";

interface Props {
  tabList: any[];
  activeDomain: string;
  currDomain: string;
  activeTabId: number;
  searchKeywords?: string;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  "active-domain": [domain: string];
  "click-tab": [tab: any];
  "close-tab": [tab: any];
}>();

const defaultIcon = chrome.runtime.getURL("/sources/ic-chrome-16.png");

// 优化：统一搜索关键词处理
const normalizedKeywords = computed(
  () => props.searchKeywords?.toLowerCase() || ""
);

// 优化：合并搜索匹配逻辑
const isTabMatchingSearch = (tab: any): boolean => {
  if (!normalizedKeywords.value) return true;
  const title = tab?.title?.toLowerCase() || "";
  const url = tab?.url?.toLowerCase() || "";
  return (
    title.includes(normalizedKeywords.value) ||
    url.includes(normalizedKeywords.value)
  );
};

// 优化：判断域名是否应该被展开
const shouldDomainBeExpanded = (domain: string): boolean => {
  if (normalizedKeywords.value) {
    const domainItem = props.tabList.find((item) => item.domain === domain);
    return domainItem?.tabs?.some(isTabMatchingSearch) || false;
  }
  return props.activeDomain === domain || props.currDomain === domain;
};

// 优化：合并过滤逻辑
const filteredTabList = computed(() => {
  if (!normalizedKeywords.value) return props.tabList;

  return props.tabList.filter((item) => {
    const domainMatch = item.domain
      .toLowerCase()
      .includes(normalizedKeywords.value);
    const tabMatch = item.tabs?.some(isTabMatchingSearch);
    return domainMatch || tabMatch;
  });
});

// 优化：简化标签页过滤
const getFilteredTabs = (domainItem: any): any[] => {
  return normalizedKeywords.value
    ? (domainItem.tabs || []).filter(isTabMatchingSearch)
    : domainItem.tabs || [];
};
</script>

<style lang="less" scoped>
.domain-group-view {
  overflow-x: hidden;
  height: 100%;

  &::-webkit-scrollbar,
  &::-webkit-scrollbar-thumb {
    width: 3px;
  }
}

.domain-panel {
  color: var(--font-color);

  .domain-title {
    height: 28px;
    margin: 0;
    padding: 0 26px 0 12px;
    width: 100%;
    display: flex;
    align-items: center;
    cursor: pointer;
    position: relative;

    .left-facicon {
      width: 16px;
      height: 16px;
      transition: transform 0.2s;
      // margin-right: 6px;
    }

    &:hover {
      background-color: var(--domain-hover-color);
    }

    .title {
      padding-left: 5px;
      flex-grow: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .count {
      flex-shrink: 0;
      font-weight: 500;
      font-size: 12px;
    }

    .right-arrow {
      position: absolute;
      right: 8px;
      top: 50%;
      margin-top: -6px;
      transition: all 0.3s;
      font-size: 12px;
    }
  }

  .tab-list {
    overflow: hidden;
    margin: 0;
    padding: 0;

    li {
      list-style: none;
      height: 32px;
      padding: 0 0 0 16px;
      display: flex;
      align-items: center;
      color: var(--font-color);
      position: relative;
      cursor: pointer;

      .left-title {
        flex-grow: 1;
        height: 32px;
        line-height: 32px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .right-actions {
        opacity: 0;
        flex-shrink: 0;
        height: 32px;
        display: flex;
        align-items: center;

        button {
          border: 0;
          background: transparent;
          width: 32px;
          height: 32px;
          color: var(--font-color);
          cursor: pointer;
          text-align: center;
          border-radius: 3px;

          i {
            transition: all 0.3s;
            display: inline-block;
          }
          &:hover i {
            transform: rotate(90deg) scale(1.2);
          }
        }
      }

      &:hover {
        background-color: var(--tab-hover-color);
        .right-actions {
          opacity: 1;
        }
      }

      &.active {
        background-color: rgb(241, 222, 198);
      }
    }
  }

  &.active .domain-title .right-arrow {
    transform: rotateZ(180deg) translateY(-50%);
    margin-top: -14px;
  }
}

.no-search-results {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: var(--font-color-secondary);
  text-align: center;

  .icon {
    font-size: 48px;
    margin-bottom: 16px;
  }
  .message {
    font-size: 16px;
    margin-bottom: 8px;
  }
  .suggestion {
    font-size: 14px;
    opacity: 0.7;
  }
}
</style>
