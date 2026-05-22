<template>
  <div class="px-3 pb-3 pt-1">
    <div class="flex-center-vertical font-400 text-size-14">
      <app-icon :icon="TablerIconConstants.attachment" :size="20" />
      {{ $t('attachments') }}
    </div>

    <div class="flex-center-vertical flex-wrap gap-1 mt-2">
      <van-loading v-if="isLoading" />

      <transaction-attachment v-for="item in list" :key="item.id" :value="item" @result="fetchAttachments" @isLoading="onLoadingChange" />

      <transaction-attachment-pending v-for="(file, idx) in pendingFiles" :key="`pending-${idx}`" :file="file" @remove="removePending(idx)" />

      <div v-if="!isLoading" class="add-attachment flex-center">
        <icon-plus :size="30" :stroke="0.8" />
        <input type="file" @change="onUpload" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { IconPlus } from '@tabler/icons-vue'
import TransactionAttachment from '~/components/transaction/transaction-attachements/transaction-attachment.vue'
import TransactionAttachmentPending from '~/components/transaction/transaction-attachements/transaction-attachment-pending.vue'
import AttachmentRepository from '~/repository/AttachmentRepository.js'
import { get, head } from 'lodash'
import { ref } from 'vue'
import AttachmentTransformer from '~/transformers/AttachmentTransformer.js'
import TablerIconConstants from '~/constants/TablerIconConstants.js'

const isLoading = ref(false)
const list = ref([])
const pendingFiles = ref([])

const props = defineProps({
  transaction: {},
})

const { t } = useI18n()

const transactionId = computed(() => props.transaction?.id)
const journalId = computed(() => get(props.transaction, 'attributes.transactions.0.transaction_journal_id'))

const fetchAttachments = async () => {
  if (!transactionId.value) return
  isLoading.value = true
  let response = await new AttachmentRepository().getForTransaction(transactionId.value)
  if (ResponseUtils.isSuccess(response)) {
    list.value = AttachmentTransformer.transformFromApiList(response.data?.data ?? [])
  }
  isLoading.value = false
}

watch(transactionId, (newValue) => {
  fetchAttachments()
})

const onUpload = async (e) => {
  const file = head(e.target.files ?? [])
  e.target.value = ''
  if (!file) return

  if (journalId.value) {
    onLoadingChange(true)
    const ok = await new AttachmentRepository().uploadForTransaction(journalId.value, file)
    onLoadingChange(false)
    if (ok) {
      UIUtils.showToastSuccess(t('success'))
      await fetchAttachments()
    } else {
      UIUtils.showToastError(`Failed to upload ${file.name}`)
    }
  } else {
    pendingFiles.value.push(file)
  }
}

const removePending = (idx) => {
  pendingFiles.value.splice(idx, 1)
}

const uploadPendingFiles = async (journalIdFromSave) => {
  if (!journalIdFromSave || pendingFiles.value.length === 0) return
  const filesToUpload = pendingFiles.value
  pendingFiles.value = []
  onLoadingChange(true)
  try {
    for (let i = 0; i < filesToUpload.length; i++) {
      const file = filesToUpload[i]
      const ok = await new AttachmentRepository().uploadForTransaction(journalIdFromSave, file)
      if (!ok) {
        pendingFiles.value = filesToUpload.slice(i)
        UIUtils.showToastError(`Failed to upload ${file.name}`)
        return
      }
    }
    UIUtils.showToastSuccess(t('success'))
  } finally {
    onLoadingChange(false)
  }
}

defineExpose({ uploadPendingFiles })

const onLoadingChange = (value) => {
  value ? UIUtils.showToastLoading(t('loading')) : UIUtils.stopToastLoading()
}
</script>
