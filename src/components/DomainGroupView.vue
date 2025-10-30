<template>
  <div class="domain-group-view">
    <div
      v-for="(item, index) in tabList"
      :key="index"
      class="domain-panel"
      :class="{
        active: activeDomain === item.domain || currDomain === item.domain,
      }"
    >
      <h3
        class="domain-title"
        @click="() => $emit('active-domain', item.domain)"
      >
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
            @click="$emit('click-tab', tab)"
          >
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
  </div>
</template>

<script lang="ts" setup>
import { ref } from "vue";

interface Props {
  tabList: any[];
  activeDomain: string;
  currDomain: string;
  activeTabId: number;
}

defineProps<Props>();

const emit = defineEmits<{
  "active-domain": [domain: string];
  "click-tab": [tab: any];
  "close-tab": [tab: any];
}>();

const defaultIcon = chrome.runtime.getURL("/sources/ic-chrome-16.png");
</script>

<style lang="less" scoped>
.domain-group-view {
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

.domain-panel {
  color: var(--font-color);

  .domain-title {
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

    .left-facicon {
      width: 16px;
      height: 16px;
      transition: transform 0.2s;
      margin-right: 6px;
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
      border: 1px solid transparent;
      padding-left: 32px;
      display: flex;
      align-items: center;
      padding-right: 0;
      text-wrap: nowrap;
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
    .domain-title {
      .right-arrow {
        transform: rotateZ(180deg) translateY(-50%);
        margin-top: -14px;
      }
    }
  }
}
</style>
