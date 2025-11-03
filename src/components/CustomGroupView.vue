<template>
  <div class="custom-group-view">
    <!-- 分组列表 -->
    <div
      v-for="group in groups"
      :key="group.id"
      class="group-panel"
      :class="{
        active: activeGroupId === group.id,
        collapsed: shouldGroupBeCollapsed(group),
        'drag-over': dragOverGroupId === group.id,
      }"
      :data-group-id="group.id"
      :style="{
        '--group-border-color': ColorUtils.getColorValue(group.color),
        '--group-bg-color': ColorUtils.getColorValue(group.color),
        '--group-border-bottom-color': ColorUtils.getColorValue(group.color),
        '--group-border-active-color': ColorUtils.getColorValue(group.color),
        '--group-bg-active-color': ColorUtils.getColorValue(group.color),
        '--group-border-bottom-active-color': ColorUtils.getColorValue(
          group.color
        ),
      }"
      @contextmenu.stop.prevent="$emit('group-context-menu', $event, group)"
      @dragover.prevent="$emit('drag-over', $event, group)"
      @dragenter.prevent="$emit('drag-enter', $event, group)"
      @dragleave.prevent="$emit('drag-leave', $event, group)"
      @drop.prevent="$emit('drop', $event, group)"
    >
      <h3
        class="group-title"
        :style="{ backgroundColor: ColorUtils.getColorValue(group.color) }"
        @click="$emit('toggle-collapse', group.id)"
      >
        <p class="title">{{ group.title || "未命名分组" }}</p>
        <p class="count">({{ getFilteredTabs(group).length }})</p>
        <i class="right-arrow iconfont icon-arrow-down"></i>
      </h3>
      <transition name="slide-down">
        <ul v-show="!shouldGroupBeCollapsed(group)" class="tab-list">
          <!-- 拖拽位置指示器 - 顶部 -->
          <div
            v-if="
              sortPositionHint.groupId === group.id &&
              sortPositionHint.position === 'before' &&
              sortPositionHint.index === 0
            "
            class="drop-indicator before"
          ></div>

          <li
            v-for="(tab, jdx) in getFilteredTabs(group)"
            :key="jdx"
            :title="tab?.title"
            :class="{
              active: tab.id === activeTabId,
              'sort-position-hint':
                sortPositionHint.groupId === group.id &&
                sortPositionHint.index === jdx,
              'sort-before':
                sortPositionHint.groupId === group.id &&
                sortPositionHint.position === 'before' &&
                sortPositionHint.index === jdx,
              'sort-after':
                sortPositionHint.groupId === group.id &&
                sortPositionHint.position === 'after' &&
                sortPositionHint.index === jdx,
            }"
            :data-favicon="tab.favIconUrl"
            @click="$emit('click-tab', tab)"
            @contextmenu.stop.prevent="
              $emit('tab-context-menu', $event, tab, group)
            "
            draggable="true"
            @dragstart="$emit('drag-start', $event, tab, group)"
            @dragend="$emit('drag-end', $event)"
            @dragover.prevent="$emit('drag-over-tab', $event, tab, group, jdx)"
            @dragenter.prevent="
              $emit('drag-enter-tab', $event, tab, group, jdx)
            "
            @dragleave.prevent="
              $emit('drag-leave-tab', $event, tab, group, jdx)
            "
          >
            <img
              class="left-facicon"
              :src="tab?.favIconUrl || defaultIcon"
              alt=""
              srcset=""
            />
            <div class="left-title" :data-tab-id="tab?.id">
              {{ tab.title }}
            </div>
            <div class="right-actions">
              <button title="关闭标签页" @click.stop="$emit('close-tab', tab)">
                <i class="iconfont icon-close-circle"></i>
              </button>
            </div>
          </li>

          <!-- 拖拽位置指示器 - 底部 -->
          <div
            v-if="
              sortPositionHint.groupId === group.id &&
              sortPositionHint.position === 'after' &&
              sortPositionHint.index === getFilteredTabs(group).length
            "
            class="drop-indicator after"
          ></div>
        </ul>
      </transition>
    </div>

    <!-- 未分组标签页区域 -->
    <div
      v-if="getFilteredUngroupedTabs().length > 0"
      class="group-panel ungrouped-panel"
      :class="{
        'drag-over': dragOverGroupId === -1,
      }"
      @dragover.prevent="$emit('drag-over', $event, null)"
      @dragenter.prevent="$emit('drag-enter', $event, null)"
      @dragleave.prevent="$emit('drag-leave', $event, null)"
      @drop.prevent="$emit('drop', $event, null)"
    >
      <p class="count" style="position: absolute; top: 0; right: 0">
        ({{ getFilteredUngroupedTabs().length }})
      </p>
      <ul class="tab-list">
        <!-- 拖拽位置指示器 - 顶部 -->
        <div
          v-if="
            sortPositionHint.groupId === -1 &&
            sortPositionHint.position === 'before' &&
            sortPositionHint.index === 0
          "
          class="drop-indicator before"
        ></div>

        <li
          v-for="(tab, index) in getFilteredUngroupedTabs()"
          :key="index"
          :title="tab?.title"
          :class="{
            active: tab.id === activeTabId,
            'sort-position-hint':
              sortPositionHint.groupId === -1 &&
              sortPositionHint.index === index,
            'sort-before':
              sortPositionHint.groupId === -1 &&
              sortPositionHint.position === 'before' &&
              sortPositionHint.index === index,
            'sort-after':
              sortPositionHint.groupId === -1 &&
              sortPositionHint.position === 'after' &&
              sortPositionHint.index === index,
          }"
          :data-favicon="tab.favIconUrl"
          @click="$emit('click-tab', tab)"
          @contextmenu.stop.prevent="
            $emit('tab-context-menu', $event, tab, undefined)
          "
          draggable="true"
          @dragstart="$emit('drag-start', $event, tab, null)"
          @dragend="$emit('drag-end', $event)"
          @dragover.prevent="$emit('drag-over-tab', $event, tab, null, index)"
          @dragenter.prevent="$emit('drag-enter-tab', $event, tab, null, index)"
          @dragleave.prevent="$emit('drag-leave-tab', $event, tab, null, index)"
        >
          <img
            class="left-facicon"
            :src="tab?.favIconUrl || defaultIcon"
            alt=""
            srcset=""
          />
          <div class="left-title" :data-tab-id="tab?.id">
            {{ tab.title }}
          </div>
          <div class="right-actions">
            <button title="关闭标签页" @click.stop="$emit('close-tab', tab)">
              <i class="iconfont icon-close-circle"></i>
            </button>
          </div>
        </li>

        <!-- 拖拽位置指示器 - 底部 -->
        <div
          v-if="
            sortPositionHint.groupId === -1 &&
            sortPositionHint.position === 'after' &&
            sortPositionHint.index === getFilteredUngroupedTabs().length
          "
          class="drop-indicator after"
        ></div>
      </ul>
    </div>

    <!-- 搜索结果为空时的提示 -->
    <div
      v-if="groups.length === 0 && getFilteredUngroupedTabs().length === 0"
      class="no-search-results"
    >
      <div class="icon">🔍</div>
      <div class="message">未找到匹配的结果</div>
      <div class="suggestion">尝试使用不同的关键词搜索</div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ICustomTabGroup } from "../type";
import { ColorUtils } from "../utils/colorUtils";

interface Props {
  groups: ICustomTabGroup[];
  ungroupedTabs: any[];
  activeGroupId: number | null;
  activeTabId: number;
  dragOverGroupId: number | null;
  sortPositionHint: {
    groupId: number | null;
    index: number;
    position: "before" | "after";
  };
  // 新增：搜索关键词，用于自动展开包含匹配标签页的分组
  searchKeywords?: string;
}

const props = defineProps<Props>();

const defaultIcon = chrome.runtime.getURL("/sources/ic-chrome-16.png");
const emit = defineEmits<{
  "toggle-collapse": [groupId: number];
  "group-context-menu": [event: MouseEvent, group: ICustomTabGroup];
  "tab-context-menu": [event: MouseEvent, tab: any, group?: ICustomTabGroup];
  "drag-start": [event: DragEvent, tab: any, group: ICustomTabGroup | null];
  "drag-end": [event: DragEvent];
  "drag-enter": [event: DragEvent, group: ICustomTabGroup | null];
  "drag-leave": [event: DragEvent, group: ICustomTabGroup | null];
  "drag-over": [event: DragEvent, group: ICustomTabGroup | null];
  drop: [event: DragEvent, group: ICustomTabGroup | null];
  "click-tab": [tab: any];
  "close-tab": [tab: any];
  "drag-over-tab": [
    event: DragEvent,
    tab: any,
    group: ICustomTabGroup | null,
    index: number
  ];
  "drag-enter-tab": [
    event: DragEvent,
    tab: any,
    group: ICustomTabGroup | null,
    index: number
  ];
  "drag-leave-tab": [
    event: DragEvent,
    tab: any,
    group: ICustomTabGroup | null,
    index: number
  ];
}>();

// 新增：判断分组是否应该被折叠
const shouldGroupBeCollapsed = (group: ICustomTabGroup): boolean => {
  // 如果有搜索关键词，且分组包含匹配的标签页，则自动展开
  if (props.searchKeywords) {
    const hasMatchingTabs = group.tabs?.some((tab) =>
      isTabMatchingSearch(tab, props.searchKeywords!)
    );
    return !hasMatchingTabs;
  }
  // 没有搜索关键词时，使用原有的折叠状态
  return group.collapsed;
};

// 新增：判断标签页是否匹配搜索条件
const isTabMatchingSearch = (tab: any, keywords: string): boolean => {
  const title = tab?.title?.toLowerCase() || "";
  const url = tab?.url?.toLowerCase() || "";
  return (
    title.includes(keywords.toLowerCase()) ||
    url.includes(keywords.toLowerCase())
  );
};

// 新增：获取过滤后的标签页列表
const getFilteredTabs = (group: ICustomTabGroup): any[] => {
  if (!props.searchKeywords) {
    return group.tabs || [];
  }

  const keywords = props.searchKeywords.toLowerCase();
  return (group.tabs || []).filter((tab) => isTabMatchingSearch(tab, keywords));
};

// 新增：获取未分组标签页的过滤列表
const getFilteredUngroupedTabs = (): any[] => {
  if (!props.searchKeywords) {
    return props.ungroupedTabs;
  }

  const keywords = props.searchKeywords.toLowerCase();
  return props.ungroupedTabs.filter((tab) =>
    isTabMatchingSearch(tab, keywords)
  );
};
</script>

<style lang="less" scoped>
.custom-group-view {
  overflow-x: hidden;
  height: 100%;

  &::-webkit-scrollbar {
    width: 3px;
  }

  &::-webkit-scrollbar-thumb {
    width: 3px;
  }
}

.group-panel {
  color: var(--font-color);
  border: 3px solid;
  border-radius: 10px;
  margin: 3px 0;
  overflow: hidden;
  transition: all 0.3s ease;

  // 未分组区域不显示边框
  &.ungrouped-panel {
    border: none;
    border-radius: 0;
    margin: 0;
  }

  .group-title {
    color: #fff;
    height: 22px;
    margin: 0;
    padding: 0;
    width: calc(100%);
    display: flex;
    align-items: center;
    background-repeat: no-repeat;
    padding-left: 12px;
    padding-right: 26px;
    cursor: pointer;
    position: relative;
    transition: all 0.3s ease;

    // 未分组区域的标题不显示边框
    .ungrouped-panel & {
      border-bottom: none;
    }

    .group-color {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      margin-right: 8px;
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

    &:hover {
      background-color: rgba(var(--primary-color-rgb), 0.1);
    }
  }

  .tab-list {
    overflow: hidden;
    margin: 0;
    padding: 0;

    li {
      list-style: none;
      height: 32px;
      border: 1px solid transparent;
      padding-left: 16px;
      display: flex;
      align-items: center;
      padding-right: 0;
      text-wrap: nowrap;
      color: var(--font-color);
      position: relative;
      cursor: pointer;

      .left-facicon {
        width: 16px;
        height: 16px;
        transition: transform 0.2s;
        margin-right: 6px;
      }
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
          background-color: transparent;
          width: 32px;
          height: 32px;
          color: var(--font-color);
          cursor: pointer;
          text-align: center;
          border: 1px solid transparent;
          border-radius: 3px;

          i {
            transition: all 0.3s;
            display: inline-block;
          }

          &:hover {
            i {
              transform: rotate(90deg) scale(1.2);
            }
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

  &.active {
    .group-title {
      .right-arrow {
        transform: rotateZ(180deg) translateY(-50%);
        margin-top: -14px;
      }
    }
  }

  // 动态边框和背景色样式 - 使用分组颜色
  &[data-group-id] {
    border-color: var(
      --group-border-color,
      rgba(var(--primary-color-rgb), 0.3)
    );

    .group-title {
      background-color: var(
        --group-bg-color,
        rgba(var(--primary-color-rgb), 0.05)
      );
      border-bottom-color: var(
        --group-border-bottom-color,
        rgba(var(--primary-color-rgb), 0.2)
      );
    }

    &.active {
      border-color: var(
        --group-border-active-color,
        rgba(var(--primary-color-rgb), 0.7)
      );

      .group-title {
        background-color: var(
          --group-bg-active-color,
          rgba(var(--primary-color-rgb), 0.15)
        );
        border-bottom-color: var(
          --group-border-bottom-active-color,
          rgba(var(--primary-color-rgb), 0.4)
        );
      }
    }
  }
}
</style>
