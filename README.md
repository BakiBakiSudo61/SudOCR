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
