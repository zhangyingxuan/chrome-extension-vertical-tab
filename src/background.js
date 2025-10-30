// // 后台服务工作者，处理扩展生命周期和side panel激活
// chrome.runtime.onInstalled.addListener(() => {
//   console.log("Vertical Tab Extension installed");
// });

// // 监听扩展图标点击，打开side panel
// chrome.action.onClicked.addListener((tab) => {
//   chrome.sidePanel.open({ windowId: tab.windowId });
// });

// // 设置side panel在所有网站上可用
// chrome.runtime.onStartup.addListener(() => {
//   chrome.sidePanel.setOptions({
//     path: "index.html",
//     enabled: true,
//   });
// });

// // 监听标签页更新，确保side panel可用
// chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
//   if (changeInfo.status === "complete" && tab.url) {
//     chrome.sidePanel.setOptions({
//       path: "index.html",
//       enabled: true,
//     });
//   }
// });
