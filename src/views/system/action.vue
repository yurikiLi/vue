<template>
  <div class="action-management">
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
        v-model="abnormalFilter"
        placeholder="异常状态"
        clearable
         style="margin-left: 100px;width: 300px;margin-top: 5px"
        @change="fetchActionData"
      >
        <el-option label="全部" value="" />
        <el-option label="正常" value="false" />
        <el-option label="异常" value="true" />
      </el-select>
      <el-select
        v-model="elderlyFilter"
        placeholder="按老人筛选"
        clearable
        filterable
       style="margin-left: 100px;width: 300px;margin-top: 5px"
        :loading="elderlyLoading"
        @change="fetchActionData"
      >
        <el-option
          v-for="elderly in elderlyList"
          :key="elderly.elderly_id"
          :label="`${elderly.name} (${elderly.elderly_id})`"
          :value="elderly.elderly_id"
        />
      </el-select>
    </div>

    <!-- 行为数据表格 -->
    <el-table
      :data="actionData"
      style="width: 100%"
      stripe
      border
      v-loading="loading"
    >
      <el-table-column prop="data_id" label="行为ID" width="300" />
      <el-table-column prop="elderly_id" label="老人ID" width="120">
        <template #default="{ row }">
          <el-tag>{{ row.elderly_id }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="timestamp" label="发生时间" width="180">
        <template #default="{ row }">
          {{ formatTime(row.timestamp) }}
        </template>
      </el-table-column>
      <el-table-column prop="location" label="发生区域" width="200" />
      <el-table-column prop="is_abnormal" label="异常状态" width="200">
        <template #default="{ row }">
          <el-tag :type="row.is_abnormal ? 'danger' : 'success'">
            {{ row.is_abnormal ? '异常' : '正常' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="190">
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
        :total="totalActions"
        layout="total, sizes, prev, pager, next, jumper"
        :page-sizes="[10, 20, 50, 100]"
        @size-change="fetchActionData"
        @current-change="fetchActionData"
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
const actionData = ref([])
const loading = ref(false)
const exportLoading = ref(false)
const elderlyLoading = ref(false)
const elderlyList = ref([])

// 分页数据
const currentPage = ref(1)
const pageSize = ref(10)
const totalActions = ref(0)

// 筛选条件
const dateRange = ref([])
const abnormalFilter = ref('')
const elderlyFilter = ref('')

// 时间格式化
const formatTime = (time) => {
  return dayjs(time).format('YYYY-MM-DD HH:mm:ss')
}

// 获取行为数据
const fetchActionData = async () => {
  try {
    loading.value = true
    await auth.signInAnonymously()

    let query = db.collection('action')

    // 添加时间筛选
    if (dateRange.value && dateRange.value.length === 2) {
      query = query.where({
        timestamp: db.command.and([
          db.command.gte(dateRange.value[0]),
          db.command.lte(dateRange.value[1])
        ])
      })
    }

    // 添加异常状态筛选
    if (abnormalFilter.value !== '') {
      query = query.where({
        is_abnormal: abnormalFilter.value === 'true'
      })
    }

    // 添加老人筛选
    if (elderlyFilter.value) {
      query = query.where({
        elderly_id: elderlyFilter.value
      })
    }

    // 获取总数
    const countRes = await query.count()
    totalActions.value = countRes.total

    // 获取分页数据
    const res = await query
      .orderBy('timestamp', 'desc')
      .skip((currentPage.value - 1) * pageSize.value)
      .limit(pageSize.value)
      .get()

    actionData.value = res.data
  } catch (err) {
    ElMessage.error(`获取行为数据失败: ${err.message}`)
  } finally {
    loading.value = false
  }
}

// 获取老人列表
const fetchElderlyList = async () => {
  try {
    elderlyLoading.value = true
    const res = await db.collection('elder_info').get()
    elderlyList.value = res.data
  } catch (err) {
    ElMessage.error(`获取老人列表失败: ${err.message}`)
  } finally {
    elderlyLoading.value = false
  }
}

// 删除行为记录
const handleDelete = async (action) => {
  try {
    await ElMessageBox.confirm('确定删除该行为记录?', '警告', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    await db.collection('action')
      .where({ data_id: action.data_id })
      .remove()

    ElMessage.success('删除成功')
    await fetchActionData()
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error(`删除失败: ${err.message}`)
    }
  }
}

// 日期范围变更处理
const handleDateChange = () => {
  currentPage.value = 1
  fetchActionData()
}

// 导出Excel
const exportToExcel = () => {
  exportLoading.value = true
  try {
    const data = actionData.value.map(item => ({
      行为ID: item.data_id,
      老人ID: item.elderly_id,
      发生时间: formatTime(item.timestamp),
      发生区域: item.location,
      异常状态: item.is_abnormal ? '异常' : '正常'
    }))

    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.json_to_sheet(data)
    XLSX.utils.book_append_sheet(workbook, worksheet, '行为数据')
    XLSX.writeFile(workbook, `行为数据_${dayjs().format('YYYYMMDD')}.xlsx`)

    ElMessage.success('导出成功')
  } catch (err) {
    ElMessage.error(`导出失败: ${err.message}`)
  } finally {
    exportLoading.value = false
  }
}

// 初始化加载数据
onMounted(() => {
  fetchElderlyList()
  fetchActionData()
})
</script>

<style scoped>
.action-management {
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