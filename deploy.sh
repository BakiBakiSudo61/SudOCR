#!/bin/bash

# SudOCR デプロイスクリプト
# 使用方法: ./deploy.sh [production|development]

set -e

# 色付きログ出力
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 環境の設定
ENVIRONMENT=${1:-production}
APP_DIR="/opt/sudocr"
BACKUP_DIR="/opt/sudocr-backup"

log_info "SudOCR デプロイ開始 (環境: $ENVIRONMENT)"

# 現在のディレクトリがプロジェクトルートかチェック
if [ ! -f "docker-compose.prod.yml" ]; then
    log_error "docker-compose.prod.yml が見つかりません。プロジェクトルートで実行してください。"
    exit 1
fi

# バックアップの作成
if [ -d "$APP_DIR" ]; then
    log_info "既存のアプリケーションをバックアップ中..."
    sudo mkdir -p "$BACKUP_DIR"
    sudo cp -r "$APP_DIR" "$BACKUP_DIR/sudocr-$(date +%Y%m%d_%H%M%S)"
fi

# 最新コードの取得
log_info "最新のコードを取得中..."
git pull origin main

# 環境設定ファイルの確認
if [ ! -f "backend/.env" ]; then
    log_warn ".envファイルが見つかりません。.env.exampleからコピーして設定してください。"
    cp backend/.env.example backend/.env
    log_info "backend/.envファイルを編集してから再実行してください。"
    exit 1
fi

# ログディレクトリの作成
sudo mkdir -p /opt/sudocr/backend/logs
sudo mkdir -p /opt/sudocr/nginx/logs
sudo chown -R $USER:$USER /opt/sudocr

# Docker環境の確認
if ! command -v docker &> /dev/null; then
    log_error "Dockerがインストールされていません。"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    log_error "Docker Composeがインストールされていません。"
    exit 1
fi

# 既存のコンテナを停止
log_info "既存のコンテナを停止中..."
docker-compose -f docker-compose.prod.yml down --remove-orphans || true

# イメージのビルド
log_info "Dockerイメージをビルド中..."
docker-compose -f docker-compose.prod.yml build --no-cache

# コンテナの起動
log_info "コンテナを起動中..."
docker-compose -f docker-compose.prod.yml up -d

# ヘルスチェック
log_info "サービスのヘルスチェック中..."
sleep 30

# バックエンドのヘルスチェック
for i in {1..10}; do
    if curl -f http://localhost:8000/health > /dev/null 2>&1; then
        log_info "バックエンドサービスが正常に起動しました"
        break
    fi
    
    if [ $i -eq 10 ]; then
        log_error "バックエンドサービスの起動に失敗しました"
        docker-compose -f docker-compose.prod.yml logs backend
        exit 1
    fi
    
    log_warn "バックエンドサービスの起動を待機中... ($i/10)"
    sleep 10
done

# Nginxのヘルスチェック
if curl -f http://localhost > /dev/null 2>&1; then
    log_info "フロントエンドサービスが正常に起動しました"
else
    log_error "フロントエンドサービスの起動に失敗しました"
    docker-compose -f docker-compose.prod.yml logs nginx
    exit 1
fi

# 不要なDockerイメージの削除
log_info "不要なDockerイメージを削除中..."
docker image prune -f

log_info "デプロイが完了しました！"
log_info "アクセスURL: https://sudocr.bakix2.jp"
log_info "ヘルスチェック: https://sudocr.bakix2.jp/health"

# ログの表示
log_info "サービスのログを表示します (Ctrl+Cで終了):"
docker-compose -f docker-compose.prod.yml logs -f
