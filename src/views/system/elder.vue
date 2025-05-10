<template>
  <div class="elderly-management">
    <!-- 搜索和筛选区域 -->
    <div class="filter-container">
      <el-input
        v-model="searchQuery"
        placeholder="搜索老人姓名或ID"
        style="width: 300px"
        clearable
        @clear="handleSearchClear"
        @keyup.enter="handleSearch"
      />
      <el-button type="primary" @click="handleSearch" style="margin-left: 10px">
        搜索
      </el-button>
      <el-select
        v-model="statusFilter"
        placeholder="按状态筛选"
        clearable
        style="margin-left: 10px"
        @change="fetchElderlyData"
      >
        <el-option label="全部" value="" />
        <el-option label="启用" value="true" />
        <el-option label="禁用" value="false" />
      </el-select>
    </div>

    <!-- 老人数据表格 -->
    <el-table
      :data="filteredElderly"
      style="width: 100%"
      stripe
      border
      @selection-change="handleSelectionChange"
      v-loading="loading"
    >
      <el-table-column type="selection" width="55" />
      <el-table-column prop="elderly_id" label="老人ID" width="180" />
      <el-table-column prop="name" label="姓名" width="120" />
      <el-table-column prop="gender" label="性别" width="80">
        <template #default="{ row }">
          <el-tag :type="row.gender === '男' ? 'primary' : 'danger'">
            {{ row.gender }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="age" label="年龄" width="80" />
      <el-table-column prop="habit_pattern" label="日常习惯" width="150" />
      <el-table-column prop="user_id" label="关联家属ID" width="180">
        <template #default="{ row }">
          {{ row.user_id || '无' }}
        </template>
      </el-table-column>
      <el-table-column prop="active" label="状态" width="100">
        <template #default="{ row }">
          <el-switch
            v-model="row.active"
            active-text="启用"
            inactive-text="禁用"
            @change="() => toggleElderlyStatus(row)"
          />
        </template>
      </el-table-column>
      <el-table-column fixed="right" label="操作" width="220">
        <template #default="{ row }">
          <el-button type="primary" size="small" @click="handleEdit(row)">
            编辑
          </el-button>
          <el-button
            type="danger"
            size="small"
            @click="() => handleDelete(row)"
          >
            删除
          </el-button>
          <el-button
            type="success"
            size="small"
            @click="() => showBindDialog(row)"
          >
            绑定家属
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div class="pagination-container">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :total="totalElderly"
        layout="total, sizes, prev, pager, next, jumper"
        :page-sizes="[10, 20, 50, 100]"
        @size-change="fetchElderlyData"
        @current-change="fetchElderlyData"
      />
    </div>

    <!-- 操作按钮组 -->
    <div style="margin-top: 20px">
      <el-button type="primary" @click="showAddDialog">新增老人</el-button>
      <el-button
        type="danger"
        @click="batchDelete"
        :disabled="selectedElderly.length === 0"
      >
        批量删除({{ selectedElderly.length }})
      </el-button>
      <el-button
        type="success"
        @click="exportToExcel"
        :loading="exportLoading"
      >
        导出Excel
      </el-button>
    </div>

    <!-- 新增老人对话框 -->
    <el-dialog v-model="addDialogVisible" title="新增老人" width="500px">
      <el-form :model="addForm" label-width="100px" :rules="rules" ref="addFormRef">
        <el-form-item label="老人姓名" prop="name">
          <el-input v-model="addForm.name" />
        </el-form-item>
        <el-form-item label="性别" prop="gender">
          <el-radio-group v-model="addForm.gender">
            <el-radio label="男" />
            <el-radio label="女" />
          </el-radio-group>
        </el-form-item>
        <el-form-item label="年龄" prop="age">
          <el-input-number v-model="addForm.age" :min="60" :max="120" />
        </el-form-item>
        <el-form-item label="日常习惯" prop="habit_pattern">
          <el-input
            v-model="addForm.habit_pattern"
            type="textarea"
            :rows="2"
            placeholder="请输入老人的日常习惯"
          />
        </el-form-item>
        <el-form-item label="关联家属" prop="user_id">
          <el-select
            v-model="addForm.user_id"
            placeholder="请选择关联家属"
            filterable
            clearable
            :loading="userLoading"
          >
            <el-option
              v-for="user in userList"
              :key="user.user_id"
              :label="`${user.username} (${user.phone})`"
              :value="user.user_id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="账号状态" prop="active">
          <el-switch v-model="addForm.active" active-text="启用" inactive-text="禁用" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="addDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="addElderly">确认</el-button>
      </template>
    </el-dialog>

    <!-- 编辑老人对话框 -->
    <el-dialog v-model="editDialogVisible" title="编辑老人" width="500px">
      <el-form :model="editForm" label-width="100px" :rules="rules" ref="editFormRef">
        <el-form-item label="老人ID">
          <el-input v-model="editForm.elderly_id" disabled />
        </el-form-item>
        <el-form-item label="老人姓名" prop="name">
          <el-input v-model="editForm.name" />
        </el-form-item>
        <el-form-item label="性别" prop="gender">
          <el-radio-group v-model="editForm.gender">
            <el-radio label="男" />
            <el-radio label="女" />
          </el-radio-group>
        </el-form-item>
        <el-form-item label="年龄" prop="age">
          <el-input-number v-model="editForm.age" :min="60" :max="120" />
        </el-form-item>
        <el-form-item label="日常习惯" prop="habit_pattern">
          <el-input
            v-model="editForm.habit_pattern"
            type="textarea"
            :rows="2"
            placeholder="请输入老人的日常习惯"
          />
        </el-form-item>
        <el-form-item label="关联家属" prop="user_id">
          <el-select
            v-model="editForm.user_id"
            placeholder="请选择关联家属"
            filterable
            clearable
            :loading="userLoading"
          >
            <el-option
              v-for="user in userList"
              :key="user.user_id"
              :label="`${user.username} (${user.phone})`"
              :value="user.user_id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="账号状态" prop="active">
          <el-switch v-model="editForm.active" active-text="启用" inactive-text="禁用" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="updateElderly">确认</el-button>
      </template>
    </el-dialog>

    <!-- 绑定家属对话框 -->
    <el-dialog v-model="bindDialogVisible" title="绑定家属" width="500px">
      <el-form :model="bindForm" label-width="100px" ref="bindFormRef">
        <el-form-item label="老人ID">
          <el-input v-model="bindForm.elderly_id" disabled />
        </el-form-item>
        <el-form-item label="老人姓名">
          <el-input v-model="bindForm.elderly_name" disabled />
        </el-form-item>
        <el-form-item label="选择家属" prop="user_id">
          <el-select
            v-model="bindForm.user_id"
            placeholder="请选择家属账号"
            filterable
            clearable
            :loading="userLoading"
          >
            <el-option
              v-for="user in familyList"
              :key="user.user_id"
              :label="`${user.username} (${user.phone})`"
              :value="user.user_id"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="bindDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="bindFamily">确认绑定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import cloudbase from '@cloudbase/js-sdk'
import * as XLSX from 'xlsx'

// 初始化云开发
const app = cloudbase.init({
  env: "cloud1-2g3c7o3eb237ac14"
})
const auth = app.auth({
  persistence: "local"
})
const db = app.database()

// 数据状态
const elderlyData = ref([])
const filteredElderly = ref([])
const loading = ref(false)
const selectedElderly = ref([])
const addDialogVisible = ref(false)
const editDialogVisible = ref(false)
const bindDialogVisible = ref(false)
const exportLoading = ref(false)
const userLoading = ref(false)
const userList = ref([])
const familyList = ref([])

// 分页数据
const currentPage = ref(1)
const pageSize = ref(10)
const totalElderly = ref(0)

// 搜索和筛选
const searchQuery = ref('')
const statusFilter = ref('')

// 表单数据
const addForm = ref({
  elderly_id: '',
  name: '',
  gender: '男',
  age: 70,
  habit_pattern: '',
  user_id: null,
  active: true
})

const editForm = ref({
  elderly_id: '',
  name: '',
  gender: '男',
  age: 70,
  habit_pattern: '',
  user_id: null,
  active: true
})

const bindForm = ref({
  elderly_id: '',
  elderly_name: '',
  user_id: null
})

// 表单验证规则
const rules = {
  name: [
    { required: true, message: '请输入老人姓名', trigger: 'blur' },
    { min: 2, max: 20, message: '长度在2到20个字符', trigger: 'blur' }
  ],
  gender: [
    { required: true, message: '请选择性别', trigger: 'change' }
  ],
  age: [
    { required: true, message: '请输入年龄', trigger: 'blur' }
  ],
  habit_pattern: [
    { max: 200, message: '长度不能超过200个字符', trigger: 'blur' }
  ]
}

// 获取老人数据
const fetchElderlyData = async () => {
  try {
    loading.value = true
    await auth.signInAnonymously()

    let query = db.collection('elder_info')

    // 添加状态筛选条件
    if (statusFilter.value !== '') {
      query = query.where({
        active: statusFilter.value === 'true'
      })
    }

    // 添加搜索条件
    if (searchQuery.value) {
      query = query.where(
        db.command.or([
          { name: db.command.regex(searchQuery.value) },
          { elderly_id: db.command.regex(searchQuery.value) }
        ])
      )
    }

    // 获取总数
    const countRes = await query.count()
    totalElderly.value = countRes.total

    // 获取分页数据
    const res = await query
      .skip((currentPage.value - 1) * pageSize.value)
      .limit(pageSize.value)
      .get()

    elderlyData.value = res.data
    filteredElderly.value = res.data
  } catch (err) {
    ElMessage.error(`获取老人数据失败: ${err.message}`)
  } finally {
    loading.value = false
  }
}

// 获取用户列表(用于关联家属)
const fetchUserList = async () => {
  try {
    userLoading.value = true
    const res = await db.collection('user')
      .where({ role: 'family' })
      .get()
    userList.value = res.data
    familyList.value = res.data
  } catch (err) {
    ElMessage.error(`获取家属列表失败: ${err.message}`)
  } finally {
    userLoading.value = false
  }
}

// 生成老人ID
const generateElderlyId = () => {
  return 'E' + Date.now().toString().slice(-6) + Math.floor(Math.random() * 90 + 10)
}

// 显示新增对话框
const showAddDialog = async () => {
  await fetchUserList()
  addForm.value = {
    elderly_id: generateElderlyId(),
    name: '',
    gender: '男',
    age: 70,
    habit_pattern: '',
    user_id: null,
    active: true
  }
  addDialogVisible.value = true
}

// 处理编辑
const handleEdit = async (elderly) => {
  await fetchUserList()
  editForm.value = JSON.parse(JSON.stringify(elderly))
  editDialogVisible.value = true
}

// 显示绑定家属对话框
const showBindDialog = async (elderly) => {
  await fetchUserList()
  bindForm.value = {
    elderly_id: elderly.elderly_id,
    elderly_name: elderly.name,
    user_id: elderly.user_id || null
  }
  bindDialogVisible.value = true
}

// 添加老人
const addElderly = async () => {
  try {
    // 验证表单
    await addFormRef.value.validate()

    // 添加老人
    await db.collection('elder_info').add(addForm.value)
    ElMessage.success('添加成功')
    addDialogVisible.value = false
    await fetchElderlyData()
  } catch (err) {
    ElMessage.error(`添加失败: ${err.message}`)
  }
}

// 更新老人信息
const updateElderly = async () => {
  try {
    // 验证表单
    await editFormRef.value.validate()

    // 更新老人信息
    await db.collection('elder_info')
      .where({ elderly_id: editForm.value.elderly_id })
      .update({
        name: editForm.value.name,
        gender: editForm.value.gender,
        age: editForm.value.age,
        habit_pattern: editForm.value.habit_pattern,
        user_id: editForm.value.user_id,
        active: editForm.value.active
      })

    ElMessage.success('更新成功')
    editDialogVisible.value = false
    await fetchElderlyData()
  } catch (err) {
    ElMessage.error(`更新失败: ${err.message}`)
  }
}

// 绑定家属
const bindFamily = async () => {
  try {
    // 更新老人信息
    await db.collection('elder_info')
      .where({ elderly_id: bindForm.value.elderly_id })
      .update({
        user_id: bindForm.value.user_id
      })

    ElMessage.success('绑定成功')
    bindDialogVisible.value = false
    await fetchElderlyData()
  } catch (err) {
    ElMessage.error(`绑定失败: ${err.message}`)
  }
}

// 删除老人
const handleDelete = async (elderly) => {
  try {
    await ElMessageBox.confirm('确定删除该老人记录?', '警告', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    await db.collection('elder_info')
      .where({ elderly_id: elderly.elderly_id })
      .remove()

    ElMessage.success('删除成功')
    await fetchElderlyData()
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error(`删除失败: ${err.message}`)
    }
  }
}

// 切换老人状态
const toggleElderlyStatus = async (elderly) => {
  try {
    await db.collection('elder_info')
      .where({ elderly_id: elderly.elderly_id })
      .update({ active: elderly.active })

    ElMessage.success(`老人已${elderly.active ? '启用' : '禁用'}`)
  } catch (err) {
    ElMessage.error(`操作失败: ${err.message}`)
    // 恢复原来的状态
    elderly.active = !elderly.active
  }
}

// 批量选择
const handleSelectionChange = (selection) => {
  selectedElderly.value = selection
}

// 批量删除
const batchDelete = async () => {
  try {
    await ElMessageBox.confirm(`确定删除选中的 ${selectedElderly.value.length} 个老人记录?`, '警告', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    const ids = selectedElderly.value.map(elderly => elderly.elderly_id)
    await db.collection('elder_info')
      .where({ elderly_id: db.command.in(ids) })
      .remove()

    ElMessage.success(`已删除 ${ids.length} 个老人记录`)
    selectedElderly.value = []
    await fetchElderlyData()
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error(`批量删除失败: ${err.message}`)
    }
  }
}

// 导出Excel
const exportToExcel = () => {
  exportLoading.value = true
  try {
    const data = elderlyData.value.map(elderly => ({
      老人ID: elderly.elderly_id,
      姓名: elderly.name,
      性别: elderly.gender,
      年龄: elderly.age,
      日常习惯: elderly.habit_pattern,
      关联家属ID: elderly.user_id || '无',
      状态: elderly.active ? '启用' : '禁用'
    }))

    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.json_to_sheet(data)
    XLSX.utils.book_append_sheet(workbook, worksheet, '老人数据')
    XLSX.writeFile(workbook, `老人数据_${new Date().toLocaleDateString()}.xlsx`)

    ElMessage.success('导出成功')
  } catch (err) {
    ElMessage.error(`导出失败: ${err.message}`)
  } finally {
    exportLoading.value = false
  }
}

// 搜索处理
const handleSearch = () => {
  currentPage.value = 1
  fetchElderlyData()
}

const handleSearchClear = () => {
  searchQuery.value = ''
  handleSearch()
}

// 初始化加载数据
onMounted(() => {
  fetchElderlyData()
})
</script>

<style scoped>
.elderly-management {
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