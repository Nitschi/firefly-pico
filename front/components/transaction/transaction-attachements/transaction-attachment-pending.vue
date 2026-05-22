<template>
  <div class="flex-center flex-column p-2 transaction-attachment pending-attachment" v-bind="tapBinding">
    <icon-photo :size="30" :stroke="1.4" />
    <div class="text-size-12">{{ displayName }}</div>
  </div>
</template>

<script setup>
import { IconPhoto } from '@tabler/icons-vue'
import { trimString } from '~/utils/StringUtils.js'
import { useTap, useTapEvent } from '~/composables/useTap.js'
import { useActionSheet } from '~/composables/useActionSheet.js'

const props = defineProps({
  file: { type: Object, required: true },
})

const emits = defineEmits(['remove'])

const displayName = computed(() => trimString(props.file?.name ?? '').toLowerCase())

const { t } = useI18n()

const tapBinding = useTap(async (event) => {
  switch (event) {
    case useTapEvent.double:
    case useTapEvent.long:
      useActionSheet().show([
        { name: t('delete'), callback: () => emits('remove') },
      ])
      break
  }
})
</script>

<style scoped>
.pending-attachment {
  opacity: 0.6;
  border: 1px dashed;
}
</style>
