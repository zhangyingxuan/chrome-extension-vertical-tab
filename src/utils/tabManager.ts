import { ITabGroup, ICustomTabGroup } from "../type";

/**
 * 获取所有标签页数据（域名分组模式）
 */
export async function getAllDomainTabs(): Promise<ITabGroup[]> {
  const resp = await chrome.tabs.query({
    currentWindow: true,
  });

  const listMap: { [domain: string]: chrome.tabs.Tab[] } = {};

  resp?.forEach((tab) => {
    if (tab.url) {
      const domain = getDomainOfUrl(tab.url);
      if (listMap[domain]) {
        listMap[domain].push(tab);
      } else {
        listMap[domain] = [tab];
      }
    }
  });

  return Object.keys(listMap).map((domain) => ({
    domain,
    tabs: listMap[domain],
  }));
}

/**
 * 获取所有标签页数据（自定义分组模式）
 */
export async function getAllCustomTabs(): Promise<{
  groups: ICustomTabGroup[];
  ungroupedTabs: chrome.tabs.Tab[];
  activeGroupId: number | null;
}> {
  const respTab = await chrome.tabs.query({
    currentWindow: true,
  });

  const respTabGroup = await chrome.tabGroups.query({});

  // 处理分组数据
  const groupsMap: Map<number, ICustomTabGroup> = new Map();

  // 初始化分组，从Chrome tabGroups获取collapsed状态
  respTabGroup.forEach((group) => {
    groupsMap.set(group.id, {
      id: group.id,
      title: group.title || `分组 ${group.id}`,
      color: group.color || "grey",
      tabs: [],
      collapsed: group.collapsed || false,
    });
  });

  const ungroupedTabs: chrome.tabs.Tab[] = [];

  // 将标签页分配到对应分组
  respTab.forEach((tab) => {
    if (tab.groupId !== -1 && groupsMap.has(tab.groupId)) {
      const group = groupsMap.get(tab.groupId);
      if (group) {
        group.tabs.push(tab);
      }
    } else {
      // 未分组的标签页
      ungroupedTabs.push(tab);
    }
  });

  // 设置活动分组
  const activeTab = respTab.find((tab) => tab.active);
  const activeGroupId = activeTab && activeTab.groupId !== -1 ? activeTab.groupId : null;

  return {
    groups: Array.from(groupsMap.values()),
    ungroupedTabs,
    activeGroupId,
  };
}

/**
 * 获取当前激活的标签页
 */
export async function getActiveTab(): Promise<chrome.tabs.Tab> {
  const [currTab] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });
  return currTab;
}

/**
 * 从URL中提取域名
 */
export function getDomainOfUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace("www.", "");
  } catch (error) {
    return url;
  }
}

/**
 * 切换分组折叠状态
 */
export async function toggleGroupCollapse(groupId: number, groups: ICustomTabGroup[]): Promise<void> {
  const group = groups.find((g) => g.id === groupId);
  if (group) {
    const newCollapsedState = !group.collapsed;
    group.collapsed = newCollapsedState;

    try {
      await chrome.tabGroups.update(groupId, {
        collapsed: newCollapsedState,
      });
    } catch (error) {
      console.error("更新分组折叠状态失败:", error);
      // 如果更新失败，恢复本地状态
      group.collapsed = !newCollapsedState;
      throw error;
    }
  }
}

/**
 * 处理拖拽放置操作
 */
export async function handleDropOperation(
  dragData: { tab: chrome.tabs.Tab; sourceGroup: ICustomTabGroup | null },
  targetGroup: ICustomTabGroup | null
): Promise<void> {
  if (!dragData || !dragData.tab.id) {
    return;
  }

  const { tab, sourceGroup } = dragData;
  const targetGroupId = targetGroup ? targetGroup.id : -1;

  // 如果源分组和目标分组相同，不执行操作
  if (sourceGroup?.id === targetGroupId) {
    return;
  }

  // 使用 Chrome API 将标签页移动到目标分组
  if (targetGroupId === -1) {
    // 移动到未分组
    if (tab.id) {
      await chrome.tabs.ungroup(tab.id);
    }
  } else {
    // 移动到目标分组
    if (tab.id) {
      await chrome.tabs.group({
        tabIds: tab.id,
        groupId: targetGroupId,
      });
    }
  }

  // 如果目标分组有自定义标题或颜色，同步更新Chrome分组
  if (
    targetGroup &&
    (targetGroup.title !== `分组 ${targetGroupId}` ||
      targetGroup.color !== "grey")
  ) {
    await chrome.tabGroups.update(targetGroupId, {
      title: targetGroup.title,
      color: targetGroup.color as chrome.tabGroups.Color,
    });
  }
}

/**
 * 分组内拖拽排序
 */
export async function handleGroupInternalSort(
  event: DragEvent,
  draggedTab: chrome.tabs.Tab,
  group: ICustomTabGroup
): Promise<void> {
  if (!draggedTab.id) return;

  // 获取拖拽目标位置的元素
  const targetElement = event.target as HTMLElement;
  const tabListElement = targetElement.closest(".tab-list");

  if (!tabListElement) return;

  // 获取所有标签页元素
  const tabElements = Array.from(tabListElement.querySelectorAll("li"));

  // 找到拖拽的标签页元素
  const draggedElement = tabElements.find((el) => {
    const tabIdElement = el.querySelector("[data-tab-id]") as HTMLElement;
    return (
      tabIdElement &&
      parseInt(tabIdElement.dataset.tabId || "0") === draggedTab.id
    );
  });

  if (!draggedElement) return;

  // 计算拖拽的目标位置
  const mouseY = event.clientY;
  let targetIndex = -1;
  let insertPosition: "before" | "after" = "before";

  // 遍历所有标签页元素，找到插入位置
  for (let i = 0; i < tabElements.length; i++) {
    const element = tabElements[i];
    if (element === draggedElement) continue;

    const rect = element.getBoundingClientRect();
    const elementCenterY = rect.top + rect.height / 2;

    // 如果鼠标在元素的上半部分，插入到该元素之前
    if (mouseY < elementCenterY) {
      targetIndex = i;
      insertPosition = "before";
      break;
    }
    // 如果鼠标在元素的下半部分，检查是否是最后一个元素
    else if (i === tabElements.length - 1) {
      targetIndex = i;
      insertPosition = "after";
    }
  }

  // 如果找不到合适的位置，插入到最后
  if (targetIndex === -1) {
    targetIndex = tabElements.length;
    insertPosition = "after";
  }

  // 获取当前分组中的所有标签页（按当前显示顺序）
  const currentTabIds = group.tabs
    .map((tab) => tab.id)
    .filter(Boolean) as number[];

  // 从数组中移除拖拽的标签页
  const draggedTabIndex = currentTabIds.indexOf(draggedTab.id);
  if (draggedTabIndex === -1) return;

  currentTabIds.splice(draggedTabIndex, 1);

  // 调整目标索引（考虑移除拖拽标签页后的数组变化）
  let adjustedTargetIndex = targetIndex;
  if (targetIndex > draggedTabIndex) {
    adjustedTargetIndex--;
  }

  // 根据插入位置确定最终索引
  const finalIndex =
    insertPosition === "after"
      ? adjustedTargetIndex + 1
      : adjustedTargetIndex;

  // 插入到目标位置
  currentTabIds.splice(finalIndex, 0, draggedTab.id);

  // 使用Chrome API重新排序标签页
  // 首先获取窗口中的所有标签页
  const allTabs = await chrome.tabs.query({ currentWindow: true });

  // 找到分组中第一个标签页的索引作为基准
  const groupTabs = allTabs.filter((tab) => tab.groupId === group.id);
  if (groupTabs.length === 0) return;

  const firstGroupTabIndex = groupTabs[0].index;

  // 重新排列分组内的标签页顺序
  for (let i = 0; i < currentTabIds.length; i++) {
    await chrome.tabs.move(currentTabIds[i], {
      index: firstGroupTabIndex + i,
    });
  }
}

/**
 * 处理未分组标签页的拖拽排序
 */
export async function handleUngroupedSort(
  event: DragEvent,
  draggedTab: chrome.tabs.Tab,
  ungroupedTabs: chrome.tabs.Tab[]
): Promise<void> {
  if (!draggedTab.id) return;

  // 获取拖拽目标位置的元素
  const targetElement = event.target as HTMLElement;
  const tabListElement = targetElement.closest(".tab-list");

  if (!tabListElement) return;

  // 获取所有标签页元素
  const tabElements = Array.from(tabListElement.querySelectorAll("li"));

  // 找到拖拽的标签页元素
  const draggedElement = tabElements.find((el) => {
    const tabIdElement = el.querySelector("[data-tab-id]") as HTMLElement;
    return (
      tabIdElement &&
      parseInt(tabIdElement.dataset.tabId || "0") === draggedTab.id
    );
  });

  if (!draggedElement) return;

  // 计算拖拽的目标位置
  const mouseY = event.clientY;
  let targetIndex = -1;
  let insertPosition: "before" | "after" = "before";

  // 遍历所有标签页元素，找到插入位置
  for (let i = 0; i < tabElements.length; i++) {
    const element = tabElements[i];
    if (element === draggedElement) continue;

    const rect = element.getBoundingClientRect();
    const elementCenterY = rect.top + rect.height / 2;

    // 如果鼠标在元素的上半部分，插入到该元素之前
    if (mouseY < elementCenterY) {
      targetIndex = i;
      insertPosition = "before";
      break;
    }
    // 如果鼠标在元素的下半部分，检查是否是最后一个元素
    else if (i === tabElements.length - 1) {
      targetIndex = i;
      insertPosition = "after";
    }
  }

  // 如果找不到合适的位置，插入到最后
  if (targetIndex === -1) {
    targetIndex = tabElements.length;
    insertPosition = "after";
  }

  // 获取当前未分组标签页的ID列表（按当前显示顺序）
  const currentTabIds = ungroupedTabs
    .map((tab) => tab.id)
    .filter(Boolean) as number[];

  // 从数组中移除拖拽的标签页
  const draggedTabIndex = currentTabIds.indexOf(draggedTab.id);
  if (draggedTabIndex === -1) return;

  currentTabIds.splice(draggedTabIndex, 1);

  // 调整目标索引（考虑移除拖拽标签页后的数组变化）
  let adjustedTargetIndex = targetIndex;
  if (targetIndex > draggedTabIndex) {
    adjustedTargetIndex--;
  }

  // 根据插入位置确定最终索引
  const finalIndex =
    insertPosition === "after"
      ? adjustedTargetIndex + 1
      : adjustedTargetIndex;

  // 插入到目标位置
  currentTabIds.splice(finalIndex, 0, draggedTab.id);

  // 使用Chrome API重新排序标签页
  // 首先获取窗口中的所有标签页
  const allTabs = await chrome.tabs.query({ currentWindow: true });

  // 找到未分组标签页的第一个索引作为基准
  const ungroupedTabIds = allTabs
    .filter((tab) => tab.groupId === -1)
    .map((tab) => tab.id)
    .filter(Boolean) as number[];

  if (ungroupedTabIds.length === 0) return;

  // 找到未分组标签页在窗口中的最小索引
  const ungroupedTabIndices = allTabs
    .filter((tab) => tab.groupId === -1)
    .map((tab) => tab.index);

  if (ungroupedTabIndices.length === 0) return;

  const minUngroupedIndex = Math.min(...ungroupedTabIndices);

  // 重新排列未分组标签页的顺序
  for (let i = 0; i < currentTabIds.length; i++) {
    await chrome.tabs.move(currentTabIds[i], {
      index: minUngroupedIndex + i,
    });
  }
}

/**
 * 显示拖拽成功反馈
 */
export function showDragSuccessFeedback(targetGroupId: number): void {
  const targetElement =
    targetGroupId === -1
      ? document.querySelector(".ungrouped-panel")
      : document.querySelector(`[data-group-id="${targetGroupId}"]`);

  if (targetElement) {
    targetElement.classList.add("drag-success");
    setTimeout(() => {
      targetElement.classList.remove("drag-success");
    }, 500);
  }
}

/**
 * 显示拖拽错误反馈
 */
export function showDragErrorFeedback(): void {
  const errorElement = document.querySelector(".tabs-tree");
  if (errorElement) {
    errorElement.classList.add("drag-error");
    setTimeout(() => {
      errorElement.classList.remove("drag-error");
    }, 1000);
  }
}

/**
 * 显示排序成功反馈
 */
export function showSortSuccessFeedback(groupId: number): void {
  const groupElement = document.querySelector(`[data-group-id="${groupId}"]`);
  if (groupElement) {
    groupElement.classList.add("sort-success");
    setTimeout(() => {
      groupElement.classList.remove("sort-success");
    }, 500);
  }
}

/**
 * 显示排序错误反馈
 */
export function showSortErrorFeedback(): void {
  const errorElement = document.querySelector(".tabs-tree");
  if (errorElement) {
    errorElement.classList.add("sort-error");
    setTimeout(() => {
      errorElement.classList.remove("sort-error");
    }, 500);
  }
}

/**
 * 等待函数
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 改变活动标签页
 */
export function changeActiveTab(activeInfo: { tabId: number; windowId: number }): void {
  // 这个函数在App.vue中由事件监听器调用，这里只做占位导出
  console.log('changeActiveTab called:', activeInfo);
}

/**
 * 打开域名折叠
 */
export function openDomainFold(): void {
  // 这个函数在App.vue中由事件监听器调用，这里只做占位导出
  console.log('openDomainFold called');
}