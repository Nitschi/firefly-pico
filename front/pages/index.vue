<template>
  <component :is="startingPage" />
</template>

<script setup>
import TransactionCreate from './transactions/[[id]].vue'
import TransactionList from './transactions/list.vue'
import Dashboard from './dashboard.vue'
import Page from '~/models/Page.js'

const profileStore = useProfileStore()

// femto: always open on the Add Expense form (ignore profileStore.startingPage)
const startingPage = computed(() => markRaw(TransactionCreate))
</script>
