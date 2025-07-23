from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from paddleocr import PaddleOCR
import numpy as np
import cv2
import logging
from typing import Dict, Any

# ログ設定
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# FastAPIアプリケーションの初期化
app = FastAPI(
    title="SudOCR API",
    description="OCR機能を提供するAPI",
    version="1.0.0"
)

# 通信を許可するオリジン（フロントエンドのURL）のリスト
origins = [
    "https://sudocr.bakix2.jp",
    "http://localhost:3000",  # 開発環境用
    "http://127.0.0.1:3000",  # 開発環境用
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST"],  # 必要なメソッドのみ許可
    allow_headers=["*"],
)

# PaddleOCRの初期化（エラーハンドリング付き）
try:
    ocr = PaddleOCR(use_angle_cls=True, lang='japan', ocr_version='PP-OCRv5')
    logger.info("PaddleOCR初期化成功")
except Exception as e:
    logger.error(f"PaddleOCR初期化エラー: {e}")
    ocr = None

@app.get("/")
def read_root() -> Dict[str, str]:
    """ヘルスチェック用のエンドポイント"""
    return {"message": "PaddleOCR API is running", "status": "healthy"}

@app.get("/health")
def health_check() -> Dict[str, Any]:
    """詳細なヘルスチェック"""
    return {
        "status": "healthy" if ocr is not None else "unhealthy",
        "ocr_available": ocr is not None
    }

@app.post("/api/ocr")
async def perform_ocr(image: UploadFile = File(...)) -> Dict[str, str]:
    """画像からテキストを抽出するOCRエンドポイント"""
    
    # OCRが利用できない場合のエラーハンドリング
    if ocr is None:
        raise HTTPException(
            status_code=503, 
            detail="OCRサービスが利用できません"
        )
    
    # ファイル形式の検証
    if not image.content_type or not image.content_type.startswith('image/'):
        raise HTTPException(
            status_code=400, 
            detail="有効な画像ファイルをアップロードしてください"
        )
    
    # ファイルサイズの制限（10MB）
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
    contents = await image.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413, 
            detail="ファイルサイズが大きすぎます（10MB以下にしてください）"
        )
    
    try:
        # 画像データをOpenCVが扱える形式に変換
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        # 画像の読み込みに失敗した場合
        if img is None:
            raise HTTPException(
                status_code=400,
                detail="画像ファイルの読み込みに失敗しました"
            )

        # PaddleOCRでテキスト認識を実行
        result = ocr.ocr(img, cls=True)

        # 認識結果からテキスト部分だけを抽出
        texts = []
        if result and result[0] is not None:
            for line in result[0]:
                if len(line) >= 2 and len(line[1]) >= 1:
                    texts.append(line[1][0])
                
        # 抽出したテキストを改行で連結して返す
        extracted_text = "\n".join(texts) if texts else "テキストが見つかりませんでした"
        
        logger.info(f"OCR処理完了。抽出文字数: {len(extracted_text)}")
        return {"text": extracted_text}
        
    except Exception as e:
        logger.error(f"OCR処理エラー: {e}")
        raise HTTPException(
            status_code=500,
            detail="OCR処理中にエラーが発生しました"
        )