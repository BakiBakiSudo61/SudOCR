# SudOCR Project

## 概要
モバイル端末向けの安全なOCR（光学文字認識）アプリケーション

## 構成
- **Backend**: FastAPI + PaddleOCR
- **Frontend**: HTML5 + JavaScript + CSS3
- **Deployment**: Docker

## 機能
- カメラを使用したリアルタイム画像キャプチャ
- PaddleOCRによる日本語テキスト認識
- レスポンシブWebデザイン
- 簡易認証システム

## セットアップ

### バックエンド
```bash
cd backend
pip install -r requirements.txt
uvicorn api:app --host 0.0.0.0 --port 8000
```

### Dockerを使用する場合
```bash
cd backend
docker build -t sudocr-backend .
docker run -p 8000:8000 sudocr-backend
```

### フロントエンド
HTTPSサーバーまたはローカル開発サーバーで配信してください。
カメラアクセスにはHTTPS接続が必要です。

## API仕様

### POST /api/ocr
画像ファイルをアップロードしてOCR処理を実行

**リクエスト:**
- Content-Type: multipart/form-data
- Body: image ファイル

**レスポンス:**
```json
{
  "text": "認識されたテキスト"
}
```

### GET /health
サービスの健康状態をチェック

## セキュリティ考慮事項
- ファイルサイズ制限（10MB）
- 画像ファイル形式の検証
- CORS設定
- 適切なエラーハンドリング

## 開発者向け情報
- Python 3.11+
- PaddleOCR v2.7.3
- FastAPI v0.104.1

## Ubuntu Serverでのデプロイ

### 1. 前提条件
```bash
# システムアップデート
sudo apt update && sudo apt upgrade -y

# 必要なパッケージのインストール
sudo apt install -y git curl wget software-properties-common
```

### 2. Docker環境のセットアップ
```bash
# Dockerのインストール
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Docker Composeのインストール
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 再ログインまたは以下を実行
newgrp docker
```

### 3. リポジトリのクローン
```bash
# アプリケーション用ディレクトリの作成
sudo mkdir -p /opt/sudocr
sudo chown $USER:$USER /opt/sudocr
cd /opt/sudocr

# GitHubからクローン
git clone https://github.com/YOUR_USERNAME/SudOCR.git .
```

### 4. 環境設定
```bash
# バックエンド用環境変数ファイルの作成
cd backend
cp .env.example .env

# 環境変数の編集
nano .env
```

### 5. SSL証明書の設定（本番環境）
```bash
# Certbotのインストール
sudo apt install -y certbot

# SSL証明書の取得
sudo certbot certonly --standalone -d your-domain.com

# 証明書ファイルの配置
sudo mkdir -p /opt/sudocr/ssl
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem /opt/sudocr/ssl/
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem /opt/sudocr/ssl/
sudo chown -R $USER:$USER /opt/sudocr/ssl
```

### 6. Dockerでのデプロイ
```bash
# プロダクション用Docker Composeでデプロイ
docker-compose -f docker-compose.prod.yml up -d

# ログの確認
docker-compose logs -f
```

### 7. システムサービス化（オプション）
```bash
# systemdサービスファイルの作成
sudo nano /etc/systemd/system/sudocr.service

# サービスの有効化
sudo systemctl enable sudocr
sudo systemctl start sudocr
sudo systemctl status sudocr
```

### 8. ファイアウォール設定
```bash
# UFWファイアウォールの設定
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP
sudo ufw allow 443/tcp     # HTTPS
sudo ufw --force enable
```

## トラブルシューティング

### Dockerコンテナのログ確認
```bash
docker-compose logs backend
docker-compose logs nginx
```

### コンテナの再起動
```bash
docker-compose restart
```

### システムリソースの確認
```bash
# メモリ使用量
free -h

# ディスク使用量
df -h

# CPU使用率
top
```

## メンテナンス

### アプリケーションの更新
```bash
cd /opt/sudocr
git pull origin main
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### SSL証明書の更新
```bash
sudo certbot renew
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem /opt/sudocr/ssl/
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem /opt/sudocr/ssl/
docker-compose restart nginx
```
