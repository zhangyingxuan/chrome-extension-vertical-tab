<template>
  <footer>
    <div class="tab-actions">
      <div class="left">
        <button title="设置" @click="handleSetting">
          <SettingIcon />
        </button>
      </div>
      <div class="center">
        <button title="创建新标签页" @click="handleNewTab">
          <AddIcon />
        </button>
      </div>
      <div class="right">
        <!-- 域名分组排序控制 -->
        <div class="sort-controls">
          <button
            class="sort-button"
            @click="toggleSortType"
            :title="getSortTitle"
          >
            <LineHeightIcon v-if="sortType === 'default'" />
            <OrderAscendingIcon
              color="#0052D9"
              v-else-if="sortType === 'asc'"
            />
            <OrderDescendingIcon color="#0052D9" v-else />
          </button>
        </div>
        <button title="切换显示模式" @click="handleSwitchTheme">
          <MoonIcon v-if="uiTheme === 'light'" />
          <SunnyIcon v-else />
        </button>
        <button
          style="display: flex"
          title="切换分组模式"
          @click="handleSwitchGroupType"
        >
          <System3Icon :color="groupType === 'domain' ? '#0052D9' : ''" />
        </button>
      </div>
    </div>
    <div class="search-area">
      <div class="input-group">
        <p class="icon">
          <SearchIcon />
        </p>
        <input
          v-model="searchData.keywords"
          type="text"
          placeholder="输入域名或页面标题搜索"
          @change="handleSearch"
        />
        <p class="icon">
          <EnterIcon />
        </p>
      </div>
    </div>
  </footer>
</template>

<script lang="ts" setup>
import { onMounted, reactive, ref, computed } from "vue";
import { themeStoreKey, groupTypeStoreKey } from "../config";
// 按需引入tdesign-icons-vue-next图标组件
import {
  SearchIcon,
  AddIcon,
  SettingIcon,
  MoonIcon,
  SunnyIcon,
  EnterIcon,
  LineHeightIcon,
  OrderAscendingIcon,
  OrderDescendingIcon,
  System3Icon,
} from "tdesign-icons-vue-next";

const emits = defineEmits(["change", "changeGroupType", "change-sort"]);

const props = defineProps({
  groupType: String,
  sortType: String as () => "default" | "asc" | "desc",
});

const searchData = reactive({
  keywords: "",
});
const uiTheme = ref("light");

// 计算排序按钮的标题
const getSortTitle = computed(() => {
  switch (props.sortType) {
    case "default":
      return "默认排序";
    case "asc":
      return "按域名升序排序";
    case "desc":
      return "按域名降序排序";
    default:
      return "默认排序";
  }
});

const handleSearch = () => {
  emits("change", searchData);
};
async function handleNewTab() {
  await chrome.tabs.create({});
}

/**
 * 切换分组类型，域名分组/自定义分组
 */
async function handleSwitchGroupType() {
  const newGroupType = props.groupType === "domain" ? "custom" : "domain";
  chrome.storage.local.set({ [groupTypeStoreKey]: newGroupType });
  emits("changeGroupType", newGroupType);
}

/**
 * 切换排序类型：default -> asc -> desc -> default
 */
const toggleSortType = () => {
  let newSortType;
  switch (props.sortType) {
    case "default":
      newSortType = "asc";
      break;
    case "asc":
      newSortType = "desc";
      break;
    case "desc":
      newSortType = "default";
      break;
    default:
      newSortType = "default";
  }
  emits("change-sort", newSortType);
};

async function handleSwitchTheme() {
  const theme = document.querySelector("html")?.getAttribute("theme");
  const newTheme = theme === "dark" ? "light" : "dark";
  document.querySelector("html")?.setAttribute("theme", newTheme);
  uiTheme.value = newTheme;
  chrome.storage.local.set({ [themeStoreKey]: newTheme });
}

const initTheme = async () => {
  const obj = await chrome.storage.local.get(themeStoreKey);
  const th = obj[themeStoreKey];
  document.querySelector("html")?.setAttribute("theme", th || "light");
  uiTheme.value = th || "light";
};

const handleSetting = () => {
  chrome.tabs.create({
    url: "chrome://settings/appearance",
  });
};

onMounted(() => {
  initTheme();
});
</script>

<style lang="less" scoped>
footer {
  position: fixed;
  bottom: 0;
  background-color: var(--bg-color);
  border-top: 1px solid var(--border-color);
  height: var(--footer-bar-height);
  width: 100%;

  .tab-actions {
    height: 30px;
    display: flex;
    justify-content: center;
    align-items: center;

    .center {
      width: 50%;
      display: flex;
      justify-content: center;
    }

    .left,
    .right {
      width: 25%;
      text-align: right;
      display: flex;
    }

    // 排序控制样式
    .sort-controls {
      display: flex;
      gap: 4px;

      .sort-button {
        background-color: transparent;
        border: 0;
        cursor: pointer;
        color: var(--font-color);
        display: flex;
        align-items: center;
        justify-content: center;
        width: 30px;
        height: 30px;
        border-radius: 6px;
        transition: all 0.2s;

        &:hover {
          background-color: var(--tab-hover-color);
        }

        // 修改图标样式适配tdesign-icons
        svg {
          width: 16px;
          height: 16px;
        }
      }
    }

    button {
      background-color: transparent;
      border: 0;
      cursor: pointer;
      color: var(--font-color);
      display: flex;
      align-items: center;
      justify-content: center;
      width: 30px;
      height: 30px;

      &:hover {
        box-shadow: 0 0 3px var(--border-color) inset;
      }

      // 修改图标样式适配tdesign-icons
      svg {
        width: 16px;
        height: 16px;
      }
    }
  }
  .search-area {
    height: 40px;
    position: relative;

    .input-group {
      position: relative;
      border-top: 1px solid var(--border-color);
      display: flex;
      input {
        border: 0;
        width: 100%;
        height: 40px;
        text-align: center;
        font-size: 14px;
        padding: 0 10px;
        background-color: var(--bg-color);
        color: var(--font-color);
        flex-grow: 1;
        &::placeholder {
          color: var(--color-input-placeholder);
        }
        &:focus,
        &:focus-visible {
          border-color: transparent;
          outline: none;
        }
      }
      .icon {
        width: 40px;
        height: 40px;
        flex-shrink: 0;
        text-align: center;
        color: var(--font-color);
        font-weight: bold;
        font-size: 24px;
        line-height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;

        // 修改图标样式适配tdesign-icons
        svg {
          width: 20px;
          height: 20px;
        }
      }
    }
  }
}
</style>
