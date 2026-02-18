**Overview**
This folder contains deployment docs and templates for Planner App Phase1. The default flow uses Docker Compose for the API and PostgreSQL, plus Nginx on the host for static web and reverse proxy.

**Architecture**
Client -> Nginx (HTTPS)
Nginx serves `/` from the web build and proxies `/api` to the FastAPI service
FastAPI -> PostgreSQL

**Prereqs**
1. Ubuntu 22.04+ (or equivalent)
2. Ports open: 22, 8080, 8443 (avoid 80/8000)
3. Docker and Docker Compose installed (Option A), or Python 3.11 + Node 18 + Nginx (Option B)

**Config**
1. Create `deploy/.env.prod` based on `deploy/.env.prod.example` and set real secrets.
2. If you prefer SQLite, replace `SQLALCHEMY_DATABASE_URL` and remove the `db` service from `deploy/docker-compose.yml`.

**Option A: Docker Compose (Recommended)**
1. From repo root, run the API and database (API exposed only on 127.0.0.1:18000):
```bash
docker compose -f deploy/docker-compose.yml up -d --build
```
2. Verify API:
```bash
curl http://127.0.0.1:18000/docs
```
3. The database port is not exposed by default. If you need remote access, add a `ports` mapping for `db`.

**Option B: Systemd (No Docker)**
1. Create a virtualenv and install backend deps:
```bash
cd backend
python3.11 -m venv venv
./venv/bin/pip install -r requirements.txt
```
2. Update `deploy/systemd/planner-api.service` paths and user, then enable:
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now planner-api
```
3. Verify API:
```bash
curl http://127.0.0.1:8000/docs
```

**Web Frontend (React)**
1. Build:
```bash
cd frontend/web
npm install
npm run build
```
2. Upload `frontend/web/dist` to `/var/www/planner-web`.
3. Configure Nginx using `deploy/nginx.conf` and update `server_name` and `root` if needed.
4. Reload Nginx:
```bash
sudo nginx -t && sudo systemctl reload nginx
```

**Mobile H5 (uni-app)**
1. Build:
```bash
cd frontend/mobile
npm install
npm run build:h5
```
2. Upload `frontend/mobile/dist/build/h5` to your static host or CDN.
3. Update the production API base URL in `frontend/mobile/src/services/api.js` or set it at runtime using the `planner_api_base` storage key.

**Security Checklist**
- Change `SECRET_KEY` in `deploy/.env.prod`.
- Disable the default admin user in `backend/app/main.py` before production.
- Use HTTPS with Certbot or your cloud provider.
- Restrict database ports to private networks only.

**Backups**
- PostgreSQL: `pg_dump -U planner -h 127.0.0.1 planner > backup.sql`
- SQLite: backup the database file referenced by `SQLALCHEMY_DATABASE_URL`.

**Troubleshooting**
- API logs: `docker compose -f deploy/docker-compose.yml logs -f api`
- Nginx logs: `/var/log/nginx/error.log`
- 502 from Nginx usually means the API is down or `proxy_pass` is incorrect.

**Aliyun Notes (avoid 80/8000)**
- Security Group: allow `8080` and `8443` from the public internet, keep `18000` private.
- Nginx: listens on `8080`/`8443` and proxies `/api` to `127.0.0.1:18000`.
- HTTPS without port 80: use Aliyun certificate service or DNS challenge.

**Aliyun Certificate Service (Option 3)**
1. In Aliyun console,申请免费证书（或上传已有证书）。如暂不绑定域名，可先跳过本节，使用 `http://IP:8080` 访问。
2. 下载 Nginx 证书包，解压后得到 `fullchain.pem` 和 `privkey.pem`。
3. 上传到服务器：
```bash
sudo mkdir -p /etc/letsencrypt/live/myai.yun
sudo cp /path/to/fullchain.pem /etc/letsencrypt/live/myai.yun/fullchain.pem
sudo cp /path/to/privkey.pem /etc/letsencrypt/live/myai.yun/privkey.pem
sudo chmod 600 /etc/letsencrypt/live/myai.yun/privkey.pem
```
4. 确认 `deploy/nginx.conf` 里的证书路径与域名一致，端口为 `8443`。
5. 重新加载 Nginx：
```bash
sudo nginx -t && sudo systemctl reload nginx
```

**Aliyun 从零到上线清单（Docker Compose + Nginx）**
1. 创建 ECS 与安全组
   - 系统：Ubuntu 22.04+
   - 安全组入方向放行：`22`、`8080`、`8443`
   - 不开放：`18000`、`5432`
2. 服务器初始化
```bash
sudo apt update
sudo apt install -y docker.io docker-compose nginx
sudo systemctl enable --now docker nginx
```
3. 上传代码到服务器
   - 推荐目录：`/home/admin/planner-app`
4. 配置生产环境变量
```bash
cd /home/admin/planner-app
cp deploy/.env.prod.example deploy/.env.prod
```
   - 编辑 `deploy/.env.prod`，设置 `SECRET_KEY` 与数据库密码。
5. 构建并启动后端与数据库
```bash
docker compose -f deploy/docker-compose.yml up -d --build
```
6. 校验 API 是否启动
```bash
curl http://127.0.0.1:18000/docs
```
7. 构建 Web 前端并部署静态文件
```bash
cd /home/admin/planner-app/frontend/web
npm install
npm run build
```
   - 将 `frontend/web/dist` 部署到 `/var/www/planner-web`：
```bash
sudo rm -rf /var/www/planner-web
sudo cp -r /home/admin/planner-app/frontend/web/dist /var/www/planner-web
```
8. （可选）申请并下载阿里云证书
   - 按上文“Aliyun Certificate Service (Option 3)”操作。
9. 配置 Nginx
```bash
sudo cp /home/admin/planner-app/deploy/nginx.conf /etc/nginx/conf.d/planner.conf
sudo nginx -t && sudo systemctl reload nginx
```
10. 上线验证
   - HTTP：`http://SERVER_IP:8080`
   - HTTPS：`https://SERVER_IP:8443`（仅当已配置证书）
   - API：`http://SERVER_IP:8080/api/docs`
11. 常用排查
   - API 日志：`docker compose -f deploy/docker-compose.yml logs -f api`
   - Nginx 日志：`/var/log/nginx/error.log`

**自动化更新流程（本地上传 + Compose 重启）**
以下是一个最小可用的更新流程，你可以按需选 Git 或文件上传两种方式。

**方式 A：Git 拉取（推荐）**
1. 在服务器上拉取最新代码：
```bash
cd /home/admin/planner-app
git pull
```
2. 重新构建并重启服务：
```bash
docker compose -f deploy/docker-compose.yml up -d --build
```
3. 如有 Web 前端更新，重新构建并覆盖静态目录：
```bash
cd /home/admin/planner-app/frontend/web
npm install
npm run build
sudo rm -rf /var/www/planner-web
sudo cp -r /home/admin/planner-app/frontend/web/dist /var/www/planner-web
sudo systemctl reload nginx
```

**方式 B：本地上传（不依赖 Git）**
1. 本地打包并上传到服务器（示例用 rsync）：
```bash
rsync -avz --delete ./ admin@SERVER_IP:/home/admin/planner-app
```
2. 服务器上重启服务：
```bash
cd /home/admin/planner-app
docker compose -f deploy/docker-compose.yml up -d --build
```
3. 如有 Web 前端更新，重新构建并发布（同方式 A 第 3 步）。

**可选优化**
- 如果只改了后端代码，Web 构建可以跳过。
- 若只改了前端静态文件，后端容器可不重启。
