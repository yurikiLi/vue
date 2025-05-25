<template>
  <div class="user-management">
    <!-- 用户表格 -->
    <el-table
      :data="users"
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
      <el-table-column prop="role" label="角色">
        <template #default="{ row }">
          <el-tag :type="roleTagType(row.role)">
            {{ row.role }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column fixed="right" label="操作" width="180">
        <template #default="{ row }">
          <el-button type="primary" size="small" @click="handleEdit(row)">编辑</el-button>
          <el-button type="danger" size="small" @click="() => handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 操作按钮组 -->
    <div style="margin-top: 20px">
      <el-button type="primary" @click="showAddDialog">新增用户</el-button>
      <el-button
        type="danger"
        @click="batchDelete"
        :disabled="selectedUsers.length === 0"
      >
        批量删除
      </el-button>
    </div>

    <!-- 新增用户对话框 -->
    <el-dialog v-model="addDialogVisible" title="新增用户" width="30%">
      <el-form :model="addForm" label-width="80px">
        <el-form-item label="用户名" required>
          <el-input v-model="addForm.username" />
        </el-form-item>
        <el-form-item label="手机号" required>
          <el-input v-model="addForm.phone" />
        </el-form-item>
        <el-form-item label="角色" required>
          <el-select v-model="addForm.role" placeholder="请选择">
            <el-option label="管理员" value="admin" />
            <el-option label="普通用户" value="user" />
            <el-option label="访客" value="guest" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="addDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="addUser">确认</el-button>
      </template>
    </el-dialog>

    <!-- 编辑用户对话框 -->
    <el-dialog v-model="editDialogVisible" title="编辑用户" width="30%">
      <el-form :model="editForm" label-width="80px">
        <el-form-item label="用户ID">
          <el-input v-model="editForm.user_id" disabled />
        </el-form-item>
        <el-form-item label="用户名" required>
          <el-input v-model="editForm.username" />
        </el-form-item>
        <el-form-item label="手机号" required>
          <el-input v-model="editForm.phone" />
        </el-form-item>
        <el-form-item label="角色" required>
          <el-select v-model="editForm.role" placeholder="请选择">
            <el-option label="管理员" value="admin" />
            <el-option label="普通用户" value="user" />
            <el-option label="访客" value="guest" />
          </el-select>
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
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import cloudbase from '@cloudbase/js-sdk'

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
const loading = ref(false)
const selectedUsers = ref([])
const addDialogVisible = ref(false)
const editDialogVisible = ref(false)

// 表单数据
const addForm = ref({
  user_id: '',
  username: '',
  phone: '',
  role: 'user'
})

const editForm = ref({
  user_id: '',
  username: '',
  phone: '',
  role: 'user'
})

// 角色标签样式
const roleTagType = (role) => {
  switch (role) {
    case 'admin': return 'success'
    case 'user': return ''
    default: return 'info'
  }
}

// 获取用户列表
const fetchUsers = async () => {
  try {
    loading.value = true
    await auth.signInAnonymously()
    const res = await db.collection('user').get()
    users.value = res.data
  } catch (err) {
    ElMessage.error(`获取用户失败: ${err.message}`)
  } finally {
    loading.value = false
  }
}

// 生成用户ID
const generateUserId = () => {
  return 'U' + Date.now().toString().slice(-6) + Math.floor(Math.random() * 90 + 10)
}

// 显示新增对话框
const showAddDialog = () => {
  addForm.value = {
    user_id: generateUserId(),
    username: '',
    phone: '',
    role: 'user'
  }
  addDialogVisible.value = true
}

// 处理编辑
const handleEdit = (user) => {
  editForm.value = JSON.parse(JSON.stringify(user)) // 深拷贝用户数据
  editDialogVisible.value = true
}

// 添加用户
const addUser = async () => {
  try {
    await db.collection('user').add(addForm.value)
    ElMessage.success('添加成功')
    addDialogVisible.value = false
    await fetchUsers()
  } catch (err) {
    ElMessage.error(`添加失败: ${err.message}`)
  }
}

// 更新用户 - 完全修复版本
const updateUser = async () => {
  try {
    // 1. 首先验证表单
    if (!editForm.value.username) {
      ElMessage.error('用户名不能为空')
      return
    }

    // 2. 使用正确的更新语法
    const result = await db.collection('user')
      .where({ user_id: editForm.value.user_id }) // 使用where条件查询
      .update({
        username: editForm.value.username,
        phone: editForm.value.phone,
        role: editForm.value.role,
      })

    // 3. 检查更新结果
    if (result.updated > 0) {
      ElMessage.success('更新成功')
      editDialogVisible.value = false
      await fetchUsers() // 刷新列表
    } else {
      ElMessage.warning('未找到匹配的用户记录')
    }
  } catch (err) {
    console.error('更新错误详情:', err)
    ElMessage.error(`更新失败: ${err.message}`)

    // 4. 特殊处理常见错误
    if (err.message.includes('permission')) {
      ElMessage.error('没有更新权限，请检查数据库权限设置')
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

    // 使用doc()方法删除
    await db.collection('user')
      .doc(user.user_id)
      .remove()

    ElMessage.success('删除成功')
    await fetchUsers()
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error(`删除失败: ${err.message}`)
    }
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
    await db.collection('user').where({
      user_id: db.command.in(ids)
    }).remove()

    ElMessage.success(`已删除 ${ids.length} 个用户`)
    selectedUsers.value = []
    await fetchUsers()
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error(`批量删除失败: ${err.message}`)
    }
  }
}

// 初始化加载数据
onMounted(() => {
  fetchUsers()
})
</script>

<style scoped>
.user-management {
  padding: 20px;
}
</style>