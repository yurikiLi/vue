<template>
  <div class="alert-management">
    <!-- 搜索和筛选区域 -->
    <div class="filter-container">
      <el-date-picker
        v-model="dateRange"
        type="daterange"
        range-separator="至"
        start-placeholder="开始日期"
        end-placeholder="结束日期"
        @change="handleDateChange"
      />
      <el-select
        v-model="statusFilter"
        placeholder="报警状态"
        clearable
        style="margin-left: 10px"
        @change="fetchAlertData"
      >
        <el-option label="全部" value="" />
        <el-option label="成功" value="成功" />
        <el-option label="失败" value="失败" />
      </el-select>
      <el-select
        v-model="methodFilter"
        placeholder="通知方式"
        clearable
        style="margin-left: 10px"
        @change="fetchAlertData"
      >
        <el-option label="全部" value="" />
        <el-option label="短信" value="短信" />
        <el-option label="电话" value="电话" />
        <el-option label="APP推送" value="APP推送" />
      </el-select>
    </div>

    <!-- 报警记录表格 -->
    <el-table
      :data="alertData"
      style="width: 100%"
      stripe
      border
      v-loading="loading"
    >
      <el-table-column prop="alert_id" label="报警ID" width="120" />
      <el-table-column prop="event_id" label="关联事件ID" width="150">
        <template #default="{ row }">
          <el-tag type="info">{{ row.event_id }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="alert_method" label="通知方式" width="100">
        <template #default="{ row }">
          <el-tag :type="getMethodTagType(row.alert_method)">
            {{ row.alert_method }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="receiver_phone" label="接收电话" width="150" />
      <el-table-column prop="sent_time" label="发送时间" width="180">
        <template #default="{ row }">
          {{ formatTime(row.sent_time) }}
        </template>
      </el-table-column>
      <el-table-column prop="status" label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="row.status === '成功' ? 'success' : 'danger'">
            {{ row.status }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="120">
        <template #default="{ row }">
          <el-button
            type="danger"
            size="small"
            @click="() => handleDelete(row)"
          >
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div class="pagination-container">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :total="totalAlerts"
        layout="total, sizes, prev, pager, next, jumper"
        :page-sizes="[10, 20, 50, 100]"
        @size-change="fetchAlertData"
        @current-change="fetchAlertData"
      />
    </div>

    <!-- 导出按钮 -->
    <div style="margin-top: 20px">
      <el-button
        type="primary"
        @click="exportToExcel"
        :loading="exportLoading"
      >
        导出Excel
      </el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import cloudbase from '@cloudbase/js-sdk'
import * as XLSX from 'xlsx'
import dayjs from 'dayjs'

// 初始化云开发
const app = cloudbase.init({
  env: "cloud1-2g3c7o3eb237ac14"
})
const auth = app.auth({
  persistence: "local"
})
const db = app.database()

// 数据状态
const alertData = ref([])
const loading = ref(false)
const exportLoading = ref(false)

// 分页数据
const currentPage = ref(1)
const pageSize = ref(10)
const totalAlerts = ref(0)

// 筛选条件
const dateRange = ref([])
const statusFilter = ref('')
const methodFilter = ref('')

// 时间格式化
const formatTime = (time) => {
  return dayjs(time).format('YYYY-MM-DD HH:mm:ss')
}

// 通知方式标签样式
const getMethodTagType = (method) => {
  switch (method) {
    case '短信': return ''
    case '电话': return 'success'
    case 'APP推送': return 'warning'
    default: return 'info'
  }
}

// 获取报警数据
const fetchAlertData = async () => {
  try {
    loading.value = true
    await auth.signInAnonymously()

    let query = db.collection('alerts')

    // 添加时间筛选
    if (dateRange.value && dateRange.value.length === 2) {
      query = query.where({
        sent_time: db.command.and([
          db.command.gte(dateRange.value[0]),
          db.command.lte(dateRange.value[1])
        ])
      })
    }

    // 添加状态筛选
    if (statusFilter.value) {
      query = query.where({
        status: statusFilter.value
      })
    }

    // 添加通知方式筛选
    if (methodFilter.value) {
      query = query.where({
        alert_method: methodFilter.value
      })
    }

    // 获取总数
    const countRes = await query.count()
    totalAlerts.value = countRes.total

    // 获取分页数据
    const res = await query
      .orderBy('sent_time', 'desc')
      .skip((currentPage.value - 1) * pageSize.value)
      .limit(pageSize.value)
      .get()

    alertData.value = res.data
  } catch (err) {
    ElMessage.error(`获取报警记录失败: ${err.message}`)
  } finally {
    loading.value = false
  }
}

// 删除报警记录
const handleDelete = async (alert) => {
  try {
    await ElMessageBox.confirm('确定删除该报警记录?', '警告', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    await db.collection('alerts')
      .where({ alert_id: alert.alert_id })
      .remove()

    ElMessage.success('删除成功')
    await fetchAlertData()
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error(`删除失败: ${err.message}`)
    }
  }
}

// 日期范围变更处理
const handleDateChange = () => {
  currentPage.value = 1
  fetchAlertData()
}

// 导出Excel
const exportToExcel = () => {
  exportLoading.value = true
  try {
    const data = alertData.value.map(item => ({
      报警ID: item.alert_id,
      关联事件ID: item.event_id,
      通知方式: item.alert_method,
      接收电话: item.receiver_phone,
      发送时间: formatTime(item.sent_time),
      状态: item.status
    }))

    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.json_to_sheet(data)
    XLSX.utils.book_append_sheet(workbook, worksheet, '报警记录')
    XLSX.writeFile(workbook, `报警记录_${dayjs().format('YYYYMMDD')}.xlsx`)

    ElMessage.success('导出成功')
  } catch (err) {
    ElMessage.error(`导出失败: ${err.message}`)
  } finally {
    exportLoading.value = false
  }
}

// 初始化加载数据
onMounted(() => {
  fetchAlertData()
})
</script>

<style scoped>
.alert-management {
  padding: 20px;
}

.filter-container {
  margin-bottom: 20px;
}

.pagination-container {
  margin-top: 20px;
  text-align: right;
}
</style>