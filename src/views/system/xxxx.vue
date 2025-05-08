<template>
  <div>
    <TableSearch :query="query" :options="searchOpt" :search="handleSearch" />
    <div class="container">
      <TableCustom :columns="columns" :tableData="tableData" :total="page.total"
                  :viewFunc="handleView" :delFunc="handleDelete"
                  :page-change="changePage" :editFunc="handleEdit">
        <template #toolbarBtn>
          <el-button type="warning" :icon="CirclePlusFilled" @click="visible = true">新增</el-button>
        </template>
      </TableCustom>
    </div>
    <el-dialog :title="isEdit ? '编辑' : '新增'" v-model="visible" width="700px" destroy-on-close
              :close-on-click-modal="false" @close="closeDialog">
      <TableEdit :form-data="rowData" :options="options" :edit="isEdit" :update="updateData" />
    </el-dialog>
    <el-dialog title="查看详情" v-model="visible1" width="700px" destroy-on-close>
      <TableDetail :data="viewData"></TableDetail>
    </el-dialog>
  </div>
</template>

<script setup lang="ts" name="system-user">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { CirclePlusFilled } from '@element-plus/icons-vue';
import TableCustom from '@/components/table-custom.vue';
import TableDetail from '@/components/table-detail.vue';
import TableSearch from '@/components/table-search.vue';

// 微信云初始化
const wxCloud = ref<any>(null);

onMounted(async () => {
  try {
    // 动态导入微信SDK
    const wx = await import('weixin-js-sdk');
    if (!wx.cloud) {
      throw new Error('微信云开发SDK加载失败');
    }

    // 初始化云开发
    wx.cloud.init({
      env: wx.cloud.DYNAMIC_CURRENT_ENV, // 关键修正点
      traceUser: true
    });

    // 测试云函数调用
    const testRes = await wx.cloud.callFunction({
      name: 'getUserList',
      data: { page: 1, pageSize: 5 }
    });

    console.log('云函数测试成功:', testRes);
    wxCloud.value = wx.cloud;
    await getData();

  } catch (err) {
    console.error('完整错误:', err);
    ElMessage.error(`初始化失败: ${err.message}`);
  }
});
// 获取数据
const getData = async () => {
  try {
    const res = await wxCloud.value.callFunction({
      name: 'getUserList',
      data: {
        page: page.index,
        pageSize: page.size,
        search: query.name
      }
    });

    tableData.value = res.result.data;
    page.total = res.result.total;
  } catch (err) {
    ElMessage.error('获取用户数据失败');
  }
};

// 数据操作
const updateData = async (formData: any) => {
  try {
    const action = isEdit.value ? 'updateUser' : 'addUser';
    await wxCloud.value.callFunction({
      name: action,
      data: formData
    });
    ElMessage.success('操作成功');
    await getData();
  } catch (err) {
    ElMessage.error(`操作失败: ${err.message}`);
  }
  closeDialog();
};

const handleDelete = async (row: any) => {
  try {
    await wxCloud.value.callFunction({
      name: 'deleteUser',
      data: { id: row._id }
    });
    ElMessage.success('删除成功');
    await getData();
  } catch (err) {
    ElMessage.error(`删除失败: ${err.message}`);
  }
};

// 其他代码
const query = reactive({ name: '' });
const searchOpt = ref([{ type: 'input', label: '用户名：', prop: 'name' }]);

const columns = ref([
  { prop: '_id', label: '序号', width: 120, align: 'center' },
  { prop: 'username', label: '姓名' },
  { prop: 'phone', label: '手机号' },
  { prop: 'role', label: '角色' },
]);

const page = reactive({ index: 1, size: 10, total: 0 });
const tableData = ref<any[]>([]);

const options = ref({
  labelWidth: '100px',
  span: 12,
  list: [
    { type: 'input', label: '用户名', prop: 'username', required: true },
    { type: 'input', label: '手机号', prop: 'phone', required: true },
    { type: 'input', label: '角色', prop: 'role', required: true },
  ]
});

const visible = ref(false);
const isEdit = ref(false);
const rowData = ref({});

const handleEdit = (row: any) => {
  rowData.value = { ...row };
  isEdit.value = true;
  visible.value = true;
};

const closeDialog = () => {
  visible.value = false;
  isEdit.value = false;
  rowData.value = {};
};

const changePage = (val: number) => {
  page.index = val;
  getData();
};

const visible1 = ref(false);
const viewData = ref({
  row: {},
  list: [
    { prop: '_id', label: '用户ID' },
    { prop: 'username', label: '用户名' },
    { prop: 'phone', label: '手机号' },
    { prop: 'role', label: '角色' }
  ]
});

const handleView = (row: any) => {
  viewData.value.row = { ...row };
  visible1.value = true;
};

const handleSearch = () => {
  changePage(1);
};
</script>

<style scoped></style>
<template>

</template>
<script setup lang="ts" name="system-user">
import cloudbase from '@cloudbase/js-sdk'
// 在main.js中

const app = cloudbase.init({
  env: "cloud1-2g3c7o3eb237ac14", // 替换为你的云开发环境 ID
  clientId: "cloud1-2g3c7o3eb237ac14", // 替换为你的云开发环境 ID
});
const auth = app.auth({
  persistence: "local",
});
await auth.signInAnonymously(); // 或者使用其他登录方式

const db = app.database();

db.collection('user').get().then((res) => {
  console.log('查询到的商品数据-----', res.data);
});

</script>