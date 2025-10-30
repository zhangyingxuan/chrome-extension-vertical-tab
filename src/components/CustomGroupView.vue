<template>
  <div class="custom-group-view">
    <!-- 分组列表 -->
    <div
      v-for="(group, index) in groups"
      :key="group.id"
      class="group-panel"
      :class="{
        active: activeGroupId === group.id,
        collapsed: group.collapsed,
        'drag-over': dragOverGroupId === group.id,
      }"
      :data-group-id="group.id"
      @contextmenu.prevent="$emit('group-context-menu', $event, group)"
      @dragover.prevent="$emit('drag-over', $event, group)"
      @dragenter.prevent="$emit('drag-enter', $event, group)"
      @dragleave.prevent="$emit('drag-leave', $event, group)"
      @drop.prevent="$emit('drop', $event, group)"
    >
      <h3 class="group-title" @click="$emit('toggle-collapse', group.id)">
        <div
          class="group-color"
          :style="{ backgroundColor: getGroupColor(group.color) }"
        ></div>
        <p class="title">{{ group.title || "未命名分组" }}</p>
        <p class="count">({{ group.tabs?.length }})</p>
        <i class="right-arrow iconfont icon-arrow-down"></i>
      </h3>
      <transition name="slide-down">
        <ul v-show="!group.collapsed" class="tab-list">
          <li
            v-for="(tab, jdx) in group.tabs"
            :key="jdx"
            :title="tab?.title"
            :class="{ active: tab.id === activeTabId }"
            :data-favicon="tab.favIconUrl"
            @click="$emit('click-tab', tab)"
            @contextmenu.prevent="$emit('tab-context-menu', $event, tab, group)"
            draggable="true"
            @dragstart="$emit('drag-start', $event, tab, group)"
            @dragend="$emit('drag-end', $event)"
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
      @dragover.prevent="$emit('drag-over', $event, null)"
      @dragenter.prevent="$emit('drag-enter', $event, null)"
      @dragleave.prevent="$emit('drag-leave', $event, null)"
      @drop.prevent="$emit('drop', $event, null)"
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
          @click="$emit('click-tab', tab)"
          @contextmenu.prevent="
            $emit('tab-context-menu', $event, tab, undefined)
          "
          draggable="true"
          @dragstart="$emit('drag-start', $event, tab, null)"
          @dragend="$emit('drag-end', $event)"
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
      </ul>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ICustomTabGroup } from "../type";

interface Props {
  groups: ICustomTabGroup[];
  ungroupedTabs: any[];
  activeGroupId: number | null;
  activeTabId: number;
  dragOverGroupId: number | null;
}

defineProps<Props>();

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
}>();

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
</script>

<style lang="less" scoped>
.custom-group-view {
  overflow-x: hidden;
  height: 100%;
  padding-bottom: var(--footer-bar-height);

  &::-webkit-scrollbar {
    width: 3px;
  }

  &::-webkit-scrollbar-thumb {
    width: 3px;
  }
}

.group-panel {
  color: var(--font-color);

  .group-title {
    height: 28px;
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
      background-color: var(--domain-hover-color);
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
      padding-left: 32px;
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
}
</style>
