<template>
  <div class="wrapper">
    <v-header />
    <v-sidebar />
    <div class="content-box" :class="{ 'content-collapse': sidebar.collapse }">
      <v-tabs></v-tabs>
      <div class="content">
        <!-- 报警信息展示区域 -->
        <div class="alert-container" v-if="alerts.length > 0">
          <div class="alert-item" v-for="(alert, index) in alerts" :key="index">
            <el-icon color="#f56c6c"><Warning /></el-icon>
            <span class="alert-message">{{ alert.message }}</span>
            <span class="alert-time">{{ alert.time }}</span>
          </div>
        </div>

        <router-view v-slot="{ Component }">
          <transition name="move" mode="out-in">
            <keep-alive :include="tabs.nameList">
              <component :is="Component"></component>
            </keep-alive>
          </transition>
        </router-view>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { Warning } from '@element-plus/icons-vue'
import { useSidebarStore } from '@/store/sidebar'
import { useTabsStore } from '@/store/tabs'
import vHeader from '@/components/header.vue'
import vSidebar from '@/components/sidebar.vue'
import vTabs from '@/components/tabs.vue'
import { io } from 'socket.io-client'

// 状态管理
const sidebar = useSidebarStore()
const tabs = useTabsStore()

// 报警数据
const alerts = ref<Array<{message: string, time: string}>>([])

// Socket.IO 连接
const socket = io('http://localhost:5000', {
  reconnectionAttempts: 3, // 重连尝试次数
  timeout: 5000 // 连接超时时间
})

// 监听报警事件
onMounted(() => {
  socket.on('connect', () => {
    console.log('已连接到报警服务器')
  })

  socket.on('alert', (data) => {
    alerts.value.unshift({
      message: data.message,
      time: new Date().toLocaleTimeString()
    })

    // 限制最多显示5条报警
    if (alerts.value.length > 5) {
      alerts.value = alerts.value.slice(0, 5)
    }
  })

  socket.on('disconnect', () => {
    console.log('已断开报警服务器连接')
  })
})

// 组件卸载时断开连接
onBeforeUnmount(() => {
  socket.disconnect()
})
</script>

<style scoped>
/* 报警容器样式 */
.alert-container {
  margin-bottom: 20px;
  background: white;
  padding: 10px;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  border-left: 4px solid #f56c6c;
}

.alert-item {
  display: flex;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #eee;
}

.alert-item:last-child {
  border-bottom: none;
}

.alert-item .el-icon {
  margin-right: 10px;
  font-size: 18px;
}

.alert-message {
  flex: 1;
  color: #f56c6c;
  font-weight: 500;
}

.alert-time {
  color: #999;
  font-size: 12px;
  margin-left: 10px;
}
</style>

<style>
/* 原有全局样式 */
.wrapper {
  height: 100vh;
  overflow: hidden;
}
.content-box {
  position: absolute;
  left: 250px;
  right: 0;
  top: 70px;
  bottom: 0;
  padding-bottom: 30px;
  -webkit-transition: left 0.3s ease-in-out;
  transition: left 0.3s ease-in-out;
  background: #eef0fc;
  overflow: hidden;
}
.content {
  width: auto;
  height: 100%;
  padding: 20px;
  overflow-y: scroll;
  box-sizing: border-box;
}
.content::-webkit-scrollbar {
  width: 0;
}
.content-collapse {
  left: 65px;
}
</style>