<template>
  <div
    class="virtual-scroll-container"
    ref="containerRef"
    @scroll="handleScroll"
  >
    <div class="virtual-scroll-wrapper" :style="{ height: totalHeight + 'px' }">
      <div
        class="virtual-scroll-item"
        v-for="item in visibleItems"
        :key="item.index"
        :style="{ transform: `translateY(${item.offset}px)` }"
      >
        <slot :item="item.data" :index="item.index"></slot>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, nextTick, onMounted, ref, watch } from "vue";

interface VirtualScrollProps {
  items: any[];
  itemHeight: number;
  overscan?: number;
}

const props = withDefaults(defineProps<VirtualScrollProps>(), {
  overscan: 5,
});

const emit = defineEmits<{
  scroll: [event: Event];
}>();

const containerRef = ref<HTMLElement>();
const scrollTop = ref(0);
const containerHeight = ref(0);

// 计算可见区域
const visibleItems = computed(() => {
  if (!containerHeight.value || props.items.length === 0) {
    return [];
  }

  const startIndex = Math.max(
    0,
    Math.floor(scrollTop.value / props.itemHeight) - props.overscan
  );
  const endIndex = Math.min(
    props.items.length - 1,
    Math.ceil((scrollTop.value + containerHeight.value) / props.itemHeight) +
      props.overscan
  );

  const items = [];
  for (let i = startIndex; i <= endIndex; i++) {
    items.push({
      index: i,
      data: props.items[i],
      offset: i * props.itemHeight,
    });
  }
  return items;
});

const totalHeight = computed(() => props.items.length * props.itemHeight);

const handleScroll = (event: Event) => {
  scrollTop.value = (event.target as HTMLElement).scrollTop;
  emit("scroll", event);
};

const updateContainerHeight = () => {
  if (containerRef.value) {
    containerHeight.value = containerRef.value.clientHeight;
  }
};

onMounted(() => {
  nextTick(() => {
    updateContainerHeight();
  });
});

watch(
  () => props.items,
  () => {
    nextTick(() => {
      updateContainerHeight();
    });
  }
);

// 暴露方法给父组件
defineExpose({
  scrollToTop: () => {
    if (containerRef.value) {
      containerRef.value.scrollTop = 0;
    }
  },
  scrollToIndex: (index: number) => {
    if (containerRef.value) {
      containerRef.value.scrollTop = index * props.itemHeight;
    }
  },
});
</script>

<style lang="less" scoped>
.virtual-scroll-container {
  overflow-y: auto;
  overflow-x: hidden;
  height: 100%;
  position: relative;

  &::-webkit-scrollbar {
    width: 3px;
  }

  &::-webkit-scrollbar-thumb {
    background-color: var(--scrollbar-color, #ccc);
    border-radius: 3px;
  }
}

.virtual-scroll-wrapper {
  position: relative;
}

.virtual-scroll-item {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  width: 100%;
}
</style>
