# 🍽️ 扫码点餐系统

轻量级餐厅扫码点餐系统，手机扫码即可点菜下单，商家后台管理菜品和订单。

## 快速启动

```bash
cd ~/restaurant-ordering
./start.sh
```

## 访问地址

| 页面 | 地址 |
|------|------|
| 顾客点菜 | http://localhost:3001/?table=1 |
| 商家后台 | http://localhost:3001/admin |

`?table=1` 中的数字就是桌号，每桌生成不同二维码即可。

## 功能

### 顾客端
- 分类浏览菜单
- 加减购物车
- 备注（少辣、不要香菜等）
- 一键提交订单

### 商家端
- 实时订单接收（10秒自动刷新）
- 订单状态流转：待确认 → 已确认 → 制作中 → 可出餐 → 已完成
- 菜品管理：新增、编辑、上下架、删除
- 分类管理
- 今日营收统计
- 菜品图片上传

## 技术栈

- **后端**：Express + sql.js（纯 JS SQLite，无需编译）
- **前端**：原生 HTML/CSS/JS，零依赖，无需构建
- **数据库**：SQLite（数据文件：`server/restaurant.db`）

## API

```
GET    /api/categories          # 获取分类
POST   /api/categories          # 创建分类
PUT    /api/categories/:id      # 更新分类
DELETE /api/categories/:id      # 删除分类

GET    /api/dishes              # 获取所有菜品
GET    /api/dishes/by-category  # 按分类获取菜品（含菜品详情）
POST   /api/dishes              # 创建菜品（支持图片上传）
PUT    /api/dishes/:id          # 更新菜品
DELETE /api/dishes/:id          # 删除菜品

POST   /api/orders              # 创建订单
GET    /api/orders              # 获取订单列表（?status=pending&limit=50）
GET    /api/orders/:id          # 获取订单详情
PUT    /api/orders/:id/status   # 更新订单状态

GET    /api/stats/today         # 今日统计
```

## 局域网使用

同一 WiFi 下，手机扫码访问 `http://<你的电脑IP>:3001/?table=桌号`。

查看你的 IP：
```bash
hostname -I
```
