<template>
  <footer>
    <div class="tab-actions">
      <div class="left"></div>
      <div class="center">
        <button title="创建新标签页" @click="handleNewTab">
          <i style="font-weight: 700" class="iconfont icon-plus"></i>
        </button>
      </div>
      <div class="right">
        <button title="设置" @click="handleSetting">
          <i class="iconfont icon-setting"></i>
        </button>
        <button title="切换显示模式" @click="handleSwitchTheme">
          <i :class="uiTheme === 'light' ? 'iconfont icon-moon':'iconfont icon-sun' "></i>
        </button>
        <button style="display: flex;" title="切换分组模式" @click="handleSwitchGroupType">
          <img class="toggle-img" :src="groupType === 'domain' ? toggle_default : toggle_active"></img>
        </button>
      </div>
    </div>
    <div class="search-area">
      <div class="input-group">
        <p class="icon">
          <i class="iconfont icon-search"></i>
        </p>
        <input
          v-model="searchData.keywords"
          type="text"
          placeholder="输入域名或页面标题搜索"
          @change="handleSearch"
        />
        <p class="icon">
          <i class="iconfont icon-enter-key"></i>
        </p>
      </div>
    </div>
  </footer>
</template>

<script lang="ts" setup>
import { onMounted, reactive, ref } from "vue";
import { themeStoreKey, groupTypeStoreKey } from "../config";
const emits = defineEmits(["change", "changeGroupType"]);

const props = defineProps({
  groupType: String
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
      text-align: center;
    }
    .left,
    .right {
      width: 25%;
      text-align: right;
      display: flex;
    }
    button {
      background-color: transparent;
      border: 0;
      cursor: pointer;
      color: var(--font-color);
      &:hover {
        box-shadow: 0 0 3px var(--border-color) inset;
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
      }
    }
  }
}
</style>
