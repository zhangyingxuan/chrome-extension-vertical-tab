export interface ITabGroup {
  domain: string;
  tabs: chrome.tabs.Tab[];
}

export interface ISearchData {
  keywords: string;
}

// 扩展TabGroup接口，支持自定义分组
export interface ICustomTabGroup {
  id: number;
  title: string;
  color: string;
  tabs: chrome.tabs.Tab[];
  collapsed: boolean;
}

// 右键菜单配置
export interface IContextMenuConfig {
  groupId?: number;
  tabId?: number;
  type: 'group' | 'tab';
}

// 分组颜色选项
export const GROUP_COLORS = [
  { value: 'grey', label: '灰色' },
  { value: 'blue', label: '蓝色' },
  { value: 'red', label: '红色' },
  { value: 'yellow', label: '黄色' },
  { value: 'green', label: '绿色' },
  { value: 'pink', label: '粉色' },
  { value: 'purple', label: '紫色' },
  { value: 'cyan', label: '青色' },
] as const;
