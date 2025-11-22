<template>
  <footer>
    <div class="tab-actions">
      <div class="left">
        <!-- 域名分组排序控制 -->
        <div v-if="groupType === 'domain'" class="sort-controls">
          <div class="sort-switch" @click="toggleSortType" :title="sortType === 'default' ? '切换到按域名排序' : '切换到默认排序'">
            <span class="switch-label">{{ sortType === 'default' ? '默认' : '域名' }}</span>
            <div class="switch-track" :class="{ active: sortType !== 'default' }">
              <div class="switch-thumb"></div>
            </div>
          </div>
        </div>
      </div>
      <div class="center">
        <button title="创建新标签页" @click="handleNewTab">
          <AddIcon />
        </button>
      </div>
      <div class="right">
        <button title="设置" @click="handleSetting">
          <SettingIcon />
        </button>
        <button title="切换显示模式" @click="handleSwitchTheme">
          <MoonIcon v-if="uiTheme === 'light'" />
          <SunnyIcon v-else />
        </button>
        <button style="display: flex;" title="切换分组模式" @click="handleSwitchGroupType">
          <img class="toggle-img" :src="groupType === 'domain' ? toggle_default : toggle_active"></img>
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
import { onMounted, reactive, ref } from "vue";
import { themeStoreKey, groupTypeStoreKey } from "../config";
// 按需引入tdesign-icons-vue-next图标组件
import { SearchIcon, AddIcon, SettingIcon, MoonIcon, SunnyIcon, EnterIcon } from 'tdesign-icons-vue-next';

const emits = defineEmits(["change", "changeGroupType", "change-sort"]);

const props = defineProps({
  groupType: String,
  sortType: String
})

const toggle_default = chrome.runtime.getURL('/sources/toggle_default.svg');
const toggle_active = chrome.runtime.getURL('/sources/toggle_active.svg');

const searchData = reactive({
  keywords: "",
});
const uiTheme = ref("light");

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
 * 切换排序类型
 */
const toggleSortType = () => {
  const newSortType = props.sortType === 'default' ? 'domain' : 'default';
  emits('change-sort', newSortType);
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

  .toggle-img {
    width: 20px;
    height: 20px;
  }

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
      justify-content: right;
    }
    
    // 新增：排序控制样式
    .sort-controls {
      display: flex;
      gap: 4px;
      
      .sort-switch {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 4px 8px;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s;
        user-select: none;
        
        &:hover {
          background-color: var(--tab-hover-color);
        }
        
        .switch-label {
          font-size: 12px;
          color: var(--font-color);
          font-weight: 500;
        }
        
        .switch-track {
          position: relative;
          width: 36px;
          height: 18px;
          background-color: var(--border-color);
          border-radius: 9px;
          transition: all 0.3s;
          
          &.active {
            background-color: var(--primary-color);
          }
          
          .switch-thumb {
            position: absolute;
            top: 2px;
            left: 2px;
            width: 14px;
            height: 14px;
            background-color: white;
            border-radius: 50%;
            transition: all 0.3s;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
          }
          
          &.active .switch-thumb {
            left: 20px;
          }
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
