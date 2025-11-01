import { GROUP_COLORS } from "../type";

/**
 * 颜色工具类 - 统一管理分组颜色相关的功能
 */
export class ColorUtils {
  /**
   * 根据颜色名称获取对应的十六进制颜色值
   * @param color 颜色名称
   * @returns 十六进制颜色值
   */
  static getColorValue(color: string): string {
    const colorMap: Record<string, string> = {
      grey: "#9ca3af",
      blue: "#3b82f6",
      red: "#ef4444",
      yellow: "#f59e0b",
      green: "#10b981",
      pink: "#ec4899",
      purple: "#8b5cf6",
      cyan: "#06b6d4",
      orange: "#f97316",
    };
    return colorMap[color] || colorMap.grey;
  }

  /**
   * 获取所有可用的颜色选项
   * @returns 颜色选项数组
   */
  static getAvailableColors() {
    return GROUP_COLORS;
  }

  /**
   * 根据颜色值获取颜色名称
   * @param colorValue 十六进制颜色值
   * @returns 颜色名称
   */
  static getColorName(colorValue: string): string {
    const colorMap: Record<string, string> = {
      "#9ca3af": "grey",
      "#3b82f6": "blue",
      "#ef4444": "red",
      "#f59e0b": "yellow",
      "#10b981": "green",
      "#ec4899": "pink",
      "#8b5cf6": "purple",
      "#06b6d4": "cyan",
      "#f97316": "orange",
    };
    return colorMap[colorValue] || "grey";
  }

  /**
   * 验证颜色名称是否有效
   * @param color 颜色名称
   * @returns 是否有效
   */
  static isValidColor(color: string): boolean {
    const validColors = ["grey", "blue", "red", "yellow", "green", "pink", "purple", "cyan", "orange"];
    return validColors.includes(color);
  }
}