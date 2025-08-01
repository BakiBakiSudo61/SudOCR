from fastapi import FastAPI, UploadFile, File, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from paddleocr import PaddleOCR
import numpy as np
import cv2
import logging
import os
import time
from typing import Dict, Any, List
from contextlib import asynccontextmanager

# ログ設定
log_level = os.getenv('LOG_LEVEL', 'INFO')
logging.basicConfig(
    level=getattr(logging, log_level),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# 設定値
MAX_FILE_SIZE = int(os.getenv('MAX_FILE_SIZE_MB', '10')) * 1024 * 1024
ALLOWED_IMAGE_TYPES = {'image/jpeg', 'image/jpg', 'image/png', 'image/webp'}
ALLOWED_ORIGINS = os.getenv('ALLOWED_ORIGINS', 'http://localhost:3000').split(',')

# PaddleOCR グローバル変数
ocr = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 起動時の処理
    global ocr
    try:
        logger.info("PaddleOCR初期化開始...")
        ocr = PaddleOCR(
            use_angle_cls=True, 
            lang='japan', 
            ocr_version='PP-OCRv5',
            show_log=False  # PaddleOCRのログを抑制
        )
        logger.info("PaddleOCR初期化成功")
    except Exception as e:
        logger.error(f"PaddleOCR初期化エラー: {e}")
        ocr = None
    
    yield
    
    # 終了時の処理
    logger.info("アプリケーション終了")

# FastAPIアプリケーションの初期化
app = FastAPI(
    title="SudOCR API",
    description="OCR機能を提供するAPI",
    version="1.0.0",
    lifespan=lifespan
)

# セキュリティミドルウェア
app.add_middleware(
    TrustedHostMiddleware, 
    allowed_hosts=["*"]  # 本番環境では具体的なホストを指定
)

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in ALLOWED_ORIGINS],
    allow_credentials=False,  # 認証情報は不要
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

def validate_image_file(file: UploadFile, max_size: int) -> None:
    """画像ファイルのバリデーション"""
    # ファイル形式の検証
    if not file.content_type or file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"サポートされていないファイル形式です。対応形式: {', '.join(ALLOWED_IMAGE_TYPES)}"
        )
    
    # ファイルサイズの検証（ヘッダーから取得可能な場合）
    if hasattr(file, 'size') and file.size and file.size > max_size:
        raise HTTPException(
            status_code=413,
            detail=f"ファイルサイズが大きすぎます（{max_size // (1024*1024)}MB以下にしてください）"
        )

async def process_image_data(contents: bytes) -> np.ndarray:
    """画像データの処理"""
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"ファイルサイズが大きすぎます（{MAX_FILE_SIZE // (1024*1024)}MB以下にしてください）"
        )
    
    try:
        # 画像データをOpenCVが扱える形式に変換
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            raise HTTPException(
                status_code=400,
                detail="無効な画像ファイルです。ファイルが破損している可能性があります。"
            )
        
        return img
        
    except Exception as e:
        logger.error(f"画像処理エラー: {e}")
        raise HTTPException(
            status_code=400,
            detail="画像ファイルの処理中にエラーが発生しました"
        )

def extract_text_from_ocr_result(result: List) -> str:
    """OCR結果からテキストを抽出"""
    texts = []
    try:
        if result and result[0] is not None:
            for line in result[0]:
                if len(line) >= 2 and len(line[1]) >= 1:
                    text = line[1][0].strip()
                    if text:  # 空文字列でない場合のみ追加
                        texts.append(text)
    except (IndexError, TypeError) as e:
        logger.warning(f"OCR結果の解析中に警告: {e}")
    
    return "\n".join(texts) if texts else "テキストが見つかりませんでした"

@app.get("/", tags=["Health"])
def read_root() -> Dict[str, str]:
    """ヘルスチェック用のエンドポイント"""
    return {"message": "SudOCR API is running", "status": "healthy"}

@app.get("/health", tags=["Health"])
def health_check() -> Dict[str, Any]:
    """詳細なヘルスチェック"""
    return {
        "status": "healthy" if ocr is not None else "unhealthy",
        "ocr_available": ocr is not None,
        "version": "1.0.0",
        "timestamp": time.time()
    }

@app.post("/api/ocr", tags=["OCR"])
async def perform_ocr(request: Request, image: UploadFile = File(...)) -> Dict[str, str]:
    """画像からテキストを抽出するOCRエンドポイント"""
    
    # リクエスト情報をログ出力
    client_ip = getattr(request.client, 'host', 'unknown') if request.client else 'unknown'
    logger.info(f"OCRリクエスト開始 - IP: {client_ip}, ファイル: {image.filename}")
    
    # OCRが利用できない場合のエラーハンドリング
    if ocr is None:
        logger.error("OCRサービスが利用できません")
        raise HTTPException(
            status_code=503,
            detail="OCRサービスが初期化されていません。しばらく待ってから再試行してください。"
        )
    
    # ファイルのバリデーション
    validate_image_file(image, MAX_FILE_SIZE)
    
    start_time = time.time()
    
    try:
        # 画像データの読み込みと処理
        contents = await image.read()
        img = await process_image_data(contents)
        
        # PaddleOCRでテキスト認識を実行
        logger.info("OCR処理開始")
        result = ocr.ocr(img, cls=True)
        
        # 認識結果からテキスト部分だけを抽出
        extracted_text = extract_text_from_ocr_result(result)
        
        processing_time = time.time() - start_time
        logger.info(f"OCR処理完了 - 処理時間: {processing_time:.2f}秒, 抽出文字数: {len(extracted_text)}")
        
        return {"text": extracted_text}
        
    except HTTPException:
        # HTTPExceptionはそのまま再発生
        raise
    except Exception as e:
        processing_time = time.time() - start_time
        logger.error(f"OCR処理エラー - 処理時間: {processing_time:.2f}秒, エラー: {e}")
        raise HTTPException(
            status_code=500,
            detail="OCR処理中に予期しないエラーが発生しました"
        )