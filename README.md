<div align="center">
  <img width="160" height="50" src="logo.svg" alt="bucket.js" />
  <blockquote>移动端LocalStorage缓存资源方案</blockquote>
</div>

## 安装
```javascript
bucket.timeout = 10000; // 请求超时10s
bucket.prefix = 'bucket-'; // localStorage前缀
bucket.expire = 24 * 7; // 7天的缓存时间
bucket.require([
  {
    url: 'https://www.xxx.xxx/static/styles.123.css',
    key: 'styles',
    unique: '123',
    cache: true
  },
  {
    url: 'https://www.xxx.xxx/static/vendors.456.js',
    key: 'vendors',
    unique: '456',
    cache: true
  },
  {
    url: 'https://www.xxx.xxx/static/app.789.js',
    key: 'app',
    unique: '789',
    cache: true
  }
], function (resources) {
  // 所有资源均已加载并按顺序插入到了head中
});

// 获取本地缓存资源
bucket.get('app');
// {
//   content: string   // 资源内容
//   type: string      // 资源类型
//   stamp: number     // 什么时候缓存的
//   unique: string    // hash值
//   expire: number    // 多久之后过期
// }

// 删除本地缓存资源
bucket.remove('vendors')

// 清空本地所有缓存资源
bucket.clear()
```