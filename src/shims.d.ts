// src/shims.d.ts
declare module 'weixin-js-sdk' {
  const wx: {
    cloud: {
      init: (config: { env: string }) => void
      database: () => any
      // 添加其他需要的方法
    }
  }
  export default wx
}