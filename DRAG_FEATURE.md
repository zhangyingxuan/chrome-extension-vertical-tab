# 拖拽功能实现文档

## 功能概述

已成功为 Chrome 扩展垂直标签页插件添加了拖拽功能，支持自由拖动标签页到分组中，并与 Chrome 原生分组同步更新。

## 主要功能特性

### 1. 拖拽操作支持

- ✅ **标签页拖拽**：支持在自定义分组模式下拖拽标签页
- ✅ **分组间拖拽**：支持将标签页从一个分组拖拽到另一个分组
- ✅ **未分组拖拽**：支持将标签页拖拽到未分组区域
- ✅ **分组内排序**：支持在同一个分组内拖拽标签页调整顺序
- ✅ **拖拽视觉反馈**：拖拽过程中提供清晰的视觉提示

### 2. 分组展开收起同步

- ✅ **状态同步**：分组展开收起状态与 Chrome 原生分组完全同步
- ✅ **双向同步**：本地操作同步到 Chrome，Chrome 操作同步到本地
- ✅ **实时更新**：通过事件监听器确保状态实时同步

### 3. 拖拽交互体验

- **拖拽开始**：标签页变为半透明，显示拖拽状态
- **拖拽悬停**：分组区域高亮显示，自动展开折叠的分组
- **拖拽放置**：标签页移动到目标分组，显示成功反馈
- **拖拽取消**：拖拽取消时恢复原始状态

### 4. Chrome 同步功能

- ✅ **实时同步**：拖拽操作实时同步到 Chrome 原生分组
- ✅ **分组属性同步**：保持分组标题和颜色的同步更新
- ✅ **折叠状态同步**：分组展开收起状态与 Chrome 完全同步
- ✅ **错误处理**：拖拽失败时提供错误反馈和恢复机制

## 技术实现

### 核心功能

#### 拖拽事件处理

- `handleDragStart`：拖拽开始，设置拖拽数据和样式
- `handleDragEnd`：拖拽结束，清理状态和样式
- `handleDragEnter`：拖拽进入分组区域，自动展开分组
- `handleDragLeave`：拖拽离开分组区域，清理悬停状态
- `handleDragOver`：拖拽在分组区域上移动，保持悬停状态
- `handleDrop`：拖拽放置，执行分组移动操作

#### 分组展开收起同步

```typescript
// 切换分组折叠状态并同步到Chrome
const toggleGroupCollapse = async (groupId: number) => {
  const group = customTabGroups.value.find((g) => g.id === groupId);
  if (group) {
    const newCollapsedState = !group.collapsed;
    group.collapsed = newCollapsedState;

    // 同步更新Chrome tabGroups的collapsed状态
    await chrome.tabGroups.update(groupId, {
      collapsed: newCollapsedState,
    });
  }
};

// 监听Chrome分组状态变化
chrome.tabGroups.onUpdated.addListener((group) => {
  // 同步更新本地分组的collapsed状态
  const localGroup = customTabGroups.value.find((g) => g.id === group.id);
  if (localGroup && localGroup.collapsed !== group.collapsed) {
    localGroup.collapsed = group.collapsed;
  }
});
```

#### Chrome API 集成

```typescript
// 移动到分组
await chrome.tabs.group({
  tabIds: tab.id,
  groupId: targetGroupId,
});

// 移动到未分组
await chrome.tabs.ungroup(tab.id);

// 同步分组属性
await chrome.tabGroups.update(targetGroupId, {
  title: targetGroup.title,
  color: targetGroup.color,
});

// 同步分组折叠状态
await chrome.tabGroups.update(groupId, {
  collapsed: newCollapsedState,
});
```

### 视觉反馈系统

#### 样式类名

- `.dragging`：拖拽中的标签页样式
- `.drag-over`：拖拽悬停的分组样式
- `.drag-success`：拖拽成功反馈样式
- `.drag-error`：拖拽错误反馈样式
- `.sort-success`：排序成功反馈样式
- `.sort-error`：排序错误反馈样式

#### 动画效果

- 拖拽成功：轻微缩放动画
- 拖拽错误：红色闪烁提示
- 排序成功：绿色闪烁提示
- 排序错误：红色闪烁提示
- 悬停效果：平滑的颜色过渡

## 使用说明

### 基本操作

1. **启用自定义分组模式**：通过底部工具栏切换到自定义分组模式
2. **开始拖拽**：点击并按住标签页开始拖拽
3. **选择目标**：将标签页拖拽到目标分组区域
4. **完成放置**：释放鼠标完成拖拽操作
5. **调整顺序**：在分组内拖拽标签页调整显示顺序
6. **展开收起**：点击分组标题展开或收起分组

### 操作限制

- 不能将标签页拖拽到源分组（相同分组）
- 拖拽到未分组区域会取消分组
- 折叠的分组在拖拽悬停时会自动展开
- 分组展开收起状态与 Chrome 原生分组完全同步

## 兼容性说明

- 支持 Chrome 89+ 版本的 Tab Groups API
- 兼容明暗主题模式
- 支持触摸设备（通过鼠标模拟）

## 性能优化

- 使用 CSS `will-change` 属性优化动画性能
- 拖拽操作使用异步处理避免阻塞
- 合理的事件委托和状态管理
- 双向状态同步避免不必要的重渲染

## 错误处理

- 网络错误：显示错误提示并恢复状态
- API 调用失败：提供用户友好的错误反馈
- 数据同步：确保本地状态与 Chrome 状态一致
- 状态回滚：操作失败时自动回滚到之前的状态
