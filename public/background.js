// 点击浏览器工具栏的插件图标
chrome.action.onClicked.addListener((tab) => {
  console.log("点击插件工具栏按钮");
  chrome.sidePanel.open({ windowId: tab.windowId });
});
