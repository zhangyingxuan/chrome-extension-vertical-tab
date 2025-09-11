export const wait = (timestamp: number) => new Promise((resolve) => setTimeout(resolve, timestamp));
export const getDomainOfUrl = (url: string) => {
  const hostname = new URL(url).hostname;
  return hostname;
};
