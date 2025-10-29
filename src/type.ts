export interface ITabGroup {
  domain: string;
  tabs: chrome.tabs.Tab[];
}

export interface ISearchData {
  keywords: string;
}

// 自定义分组配置
export interface ICustomGroup {
  id: string;
  name: string;
  color: string;
  tabs: chrome.tabs.Tab[];
  createdAt: number;
  updatedAt: number;
}

// 分组类型
export type GroupType = 'domain' | 'custom';

// 颜色选项
export const COLOR_OPTIONS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
  '#F8C471', '#82E0AA', '#F1948A', '#85C1E9', '#D7BDE2'
];

// 存储键名
export const CUSTOM_GROUPS_STORE_KEY = 'aitab-custom-groups';
export const ACTIVE_CUSTOM_GROUP_STORE_KEY = 'aitab-active-custom-group';
