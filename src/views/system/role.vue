<template>
  <div class="role-management">
    <!-- 搜索和筛选区域 -->
    <div class="filter-container">
      <el-input
        v-model="searchQuery"
        placeholder="搜索用户名或手机号"
        style="width: 300px"
        clearable
        @clear="handleSearchClear"
        @keyup.enter="handleSearch"
      />
      <el-button type="primary" @click="handleSearch" style="margin-left: 10px">
        搜索
      </el-button>
      <el-select
        v-model="roleFilter"
        placeholder="按角色筛选"
        clearable
        style="margin-left: 10px"
        @change="fetchUsers"
      >
        <el-option label="全部" value="" />
        <el-option label="管理员" value="admin" />
        <el-option label="家属" value="family" />
        <el-option label="护工" value="caregiver" />
        <el-option label="老人" value="elderly" />
      </el-select>
    </div>

    <!-- 用户表格 -->
    <el-table
      :data="filteredUsers"
      style="width: 100%"
      stripe
      border
      @selection-change="handleSelectionChange"
      v-loading="loading"
    >
      <el-table-column type="selection" width="55" />
      <el-table-column prop="user_id" label="用户ID" width="180" />
      <el-table-column prop="username" label="用户名" width="150" />
      <el-table-column prop="phone" label="手机号" width="150" />
      <el-table-column prop="role" label="角色" width="120">
        <template #default="{ row }">
          <el-tag :type="roleTagType(row.role)">
            {{ roleMap[row.role] || row.role }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="elderly_id" label="关联老人ID" width="180">
        <template #default="{ row }">
          {{ row.elderly_id || '无' }}
        </template>
      </el-table-column>
      <el-table-column prop="active" label="状态" width="100">
        <template #default="{ row }">
          <el-switch
            v-model="row.active"
            active-text="启用"
            inactive-text="禁用"
            @change="() => toggleUserStatus(row)"
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
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div class="pagination-container">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :total="totalUsers"
        layout="total, sizes, prev, pager, next, jumper"
        :page-sizes="[10, 20, 50, 100]"
        @size-change="fetchUsers"
        @current-change="fetchUsers"
      />
    </div>

    <!-- 操作按钮组 -->
    <div style="margin-top: 20px">
      <el-button type="primary" @click="showAddDialog">新增用户</el-button>
      <el-button
        type="danger"
        @click="batchDelete"
        :disabled="selectedUsers.length === 0"
      >
        批量删除({{ selectedUsers.length }})
      </el-button>
      <el-button
        type="success"
        @click="exportToExcel"
        :loading="exportLoading"
      >
        导出Excel
      </el-button>
    </div>

    <!-- 新增用户对话框 -->
    <el-dialog v-model="addDialogVisible" title="新增用户" width="500px">
      <el-form :model="addForm" label-width="100px" :rules="rules" ref="addFormRef">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="addForm.username" />
        </el-form-item>
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="addForm.phone" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input v-model="addForm.password" type="password" />
        </el-form-item>
        <el-form-item label="角色" prop="role">
          <el-select v-model="addForm.role" placeholder="请选择角色" @change="handleRoleChange">
            <el-option label="管理员" value="admin" />
            <el-option label="家属" value="family" />
            <el-option label="护工" value="caregiver" />
            <el-option label="老人" value="elderly" />
          </el-select>
        </el-form-item>
        <el-form-item label="关联老人ID" prop="elderly_id" v-if="showElderlyIdField">
          <el-select
            v-model="addForm.elderly_id"
            placeholder="请选择关联老人"
            filterable
            clearable
            :loading="elderlyLoading"
          >
            <el-option
              v-for="elderly in elderlyList"
              :key="elderly.elderly_id"
              :label="`${elderly.name} (${elderly.elderly_id})`"
              :value="elderly.elderly_id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="紧急联系人" prop="emergency_contact">
          <el-input v-model="addForm.emergency_contact" />
        </el-form-item>
        <el-form-item label="账号状态" prop="active">
          <el-switch v-model="addForm.active" active-text="启用" inactive-text="禁用" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="addDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="addUser">确认</el-button>
      </template>
    </el-dialog>

    <!-- 编辑用户对话框 -->
    <el-dialog v-model="editDialogVisible" title="编辑用户" width="500px">
      <el-form :model="editForm" label-width="100px" :rules="rules" ref="editFormRef">
        <el-form-item label="用户ID">
          <el-input v-model="editForm.user_id" disabled />
        </el-form-item>
        <el-form-item label="用户名" prop="username">
          <el-input v-model="editForm.username" />
        </el-form-item>
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="editForm.phone" />
        </el-form-item>
        <el-form-item label="角色" prop="role">
          <el-select v-model="editForm.role" placeholder="请选择角色" @change="handleRoleChange">
            <el-option label="管理员" value="admin" />
            <el-option label="家属" value="family" />
            <el-option label="护工" value="caregiver" />
            <el-option label="老人" value="elderly" />
          </el-select>
        </el-form-item>
        <el-form-item label="关联老人ID" prop="elderly_id" v-if="showElderlyIdField">
          <el-select
            v-model="editForm.elderly_id"
            placeholder="请选择关联老人"
            filterable
            clearable
            :loading="elderlyLoading"
          >
            <el-option
              v-for="elderly in elderlyList"
              :key="elderly.elderly_id"
              :label="`${elderly.name} (${elderly.elderly_id})`"
              :value="elderly.elderly_id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="紧急联系人" prop="emergency_contact">
          <el-input v-model="editForm.emergency_contact" />
        </el-form-item>
        <el-form-item label="账号状态" prop="active">
          <el-switch v-model="editForm.active" active-text="启用" inactive-text="禁用" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="updateUser">确认</el-button>
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
const users = ref([])
const filteredUsers = ref([])
const loading = ref(false)
const selectedUsers = ref([])
const addDialogVisible = ref(false)
const editDialogVisible = ref(false)
const exportLoading = ref(false)
const elderlyLoading = ref(false)
const elderlyList = ref([])

// 分页数据
const currentPage = ref(1)
const pageSize = ref(10)
const totalUsers = ref(0)

// 搜索和筛选
const searchQuery = ref('')
const roleFilter = ref('')

// 表单数据
const addForm = ref({
  user_id: '',
  username: '',
  phone: '',
  password: '123456', // 默认密码
  role: 'family',
  elderly_id: null,
  emergency_contact: '',
  active: true
})

const editForm = ref({
  user_id: '',
  username: '',
  phone: '',
  role: 'family',
  elderly_id: null,
  emergency_contact: '',
  active: true
})

// 表单验证规则
const rules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 2, max: 20, message: '长度在2到20个字符', trigger: 'blur' }
  ],
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 20, message: '长度在6到20个字符', trigger: 'blur' }
  ],
  role: [
    { required: true, message: '请选择角色', trigger: 'change' }
  ],
  emergency_contact: [
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号', trigger: 'blur' }
  ]
}

// 角色映射
const roleMap = {
  admin: '管理员',
  family: '家属',
  caregiver: '护工',
  elderly: '老人'
}

// 计算属性
const showElderlyIdField = computed(() => {
  return ['family', 'elderly'].includes(addForm.value.role) ||
         ['family', 'elderly'].includes(editForm.value.role)
})

// 角色标签样式
const roleTagType = (role) => {
  switch (role) {
    case 'admin': return 'success'
    case 'family': return 'primary'
    case 'caregiver': return 'warning'
    case 'elderly': return 'danger'
    default: return 'info'
  }
}

// 获取用户列表
const fetchUsers = async () => {
  try {
    loading.value = true
    await auth.signInAnonymously()

    let query = db.collection('user')

    // 添加角色筛选条件
    if (roleFilter.value) {
      query = query.where({
        role: roleFilter.value
      })
    }

    // 添加搜索条件
    if (searchQuery.value) {
      query = query.where(
        db.command.or([
          { username: db.command.regex(searchQuery.value) },
          { phone: db.command.regex(searchQuery.value) }
        ])
      )
    }

    // 获取总数
    const countRes = await query.count()
    totalUsers.value = countRes.total

    // 获取分页数据
    const res = await query
      .skip((currentPage.value - 1) * pageSize.value)
      .limit(pageSize.value)
      .get()

    users.value = res.data
    filteredUsers.value = res.data
  } catch (err) {
    ElMessage.error(`获取用户失败: ${err.message}`)
  } finally {
    loading.value = false
  }
}

// 获取老人列表
const fetchElderlyList = async () => {
  try {
    elderlyLoading.value = true
    const res = await db.collection('elderly_info')
      .where({ active: true })
      .get()
    elderlyList.value = res.data
  } catch (err) {
    ElMessage.error(`获取老人列表失败: ${err.message}`)
  } finally {
    elderlyLoading.value = false
  }
}

// 生成用户ID
const generateUserId = () => {
  return 'U' + Date.now().toString().slice(-6) + Math.floor(Math.random() * 90 + 10)
}

// 显示新增对话框
const showAddDialog = async () => {
  await fetchElderlyList()
  addForm.value = {
    user_id: generateUserId(),
    username: '',
    phone: '',
    password: '123456',
    role: 'family',
    elderly_id: null,
    emergency_contact: '',
    active: true
  }
  addDialogVisible.value = true
}

// 处理编辑
const handleEdit = async (user) => {
  await fetchElderlyList()
  editForm.value = JSON.parse(JSON.stringify(user))
  editDialogVisible.value = true
}

// 角色变更处理
const handleRoleChange = (role) => {
  if (role !== 'family' && role !== 'elderly') {
    addForm.value.elderly_id = null
    editForm.value.elderly_id = null
  }
}

// 添加用户
const addUser = async () => {
  try {
    // 验证表单
    await addFormRef.value.validate()

    // 检查手机号是否已存在
    const checkRes = await db.collection('user')
      .where({ phone: addForm.value.phone })
      .count()

    if (checkRes.total > 0) {
      ElMessage.error('该手机号已注册')
      return
    }

    // 添加用户
    await db.collection('user').add(addForm.value)
    ElMessage.success('添加成功')
    addDialogVisible.value = false
    await fetchUsers()
  } catch (err) {
    if (err.message !== 'cancel') {
      ElMessage.error(`添加失败: ${err.message}`)
    }
  }
}

// 更新用户
const updateUser = async () => {
  try {
    // 验证表单
    await editFormRef.value.validate()

    // 检查手机号是否已被其他用户使用
    const checkRes = await db.collection('user')
      .where({
        phone: editForm.value.phone,
        user_id: db.command.neq(editForm.value.user_id)
      })
      .count()

    if (checkRes.total > 0) {
      ElMessage.error('该手机号已被其他用户使用')
      return
    }

    // 更新用户
    await db.collection('user')
      .where({ user_id: editForm.value.user_id })
      .update({
        username: editForm.value.username,
        phone: editForm.value.phone,
        role: editForm.value.role,
        elderly_id: editForm.value.elderly_id,
        emergency_contact: editForm.value.emergency_contact,
        active: editForm.value.active
      })

    ElMessage.success('更新成功')
    editDialogVisible.value = false
    await fetchUsers()
  } catch (err) {
    if (err.message !== 'cancel') {
      ElMessage.error(`更新失败: ${err.message}`)
    }
  }
}

// 删除用户
const handleDelete = async (user) => {
  try {
    await ElMessageBox.confirm('确定删除该用户?', '警告', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    await db.collection('user')
      .where({ user_id: user.user_id })
      .remove()

    ElMessage.success('删除成功')
    await fetchUsers()
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error(`删除失败: ${err.message}`)
    }
  }
}

// 切换用户状态
const toggleUserStatus = async (user) => {
  try {
    await db.collection('user')
      .where({ user_id: user.user_id })
      .update({ active: user.active })

    ElMessage.success(`用户已${user.active ? '启用' : '禁用'}`)
  } catch (err) {
    ElMessage.error(`操作失败: ${err.message}`)
    // 恢复原来的状态
    user.active = !user.active
  }
}

// 批量选择
const handleSelectionChange = (selection) => {
  selectedUsers.value = selection
}

// 批量删除
const batchDelete = async () => {
  try {
    await ElMessageBox.confirm(`确定删除选中的 ${selectedUsers.value.length} 个用户?`, '警告', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    const ids = selectedUsers.value.map(user => user.user_id)
    await db.collection('user')
      .where({ user_id: db.command.in(ids) })
      .remove()

    ElMessage.success(`已删除 ${ids.length} 个用户`)
    selectedUsers.value = []
    await fetchUsers()
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
    const data = users.value.map(user => ({
      用户ID: user.user_id,
      用户名: user.username,
      手机号: user.phone,
      角色: roleMap[user.role] || user.role,
      关联老人ID: user.elderly_id || '无',
      紧急联系人: user.emergency_contact,
      状态: user.active ? '启用' : '禁用'
    }))

    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.json_to_sheet(data)
    XLSX.utils.book_append_sheet(workbook, worksheet, '用户数据')
    XLSX.writeFile(workbook, `用户数据_${new Date().toLocaleDateString()}.xlsx`)

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
  fetchUsers()
}

const handleSearchClear = () => {
  searchQuery.value = ''
  handleSearch()
}

// 初始化加载数据
onMounted(() => {
  fetchUsers()
})
</script>

<style scoped>
.role-management {
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