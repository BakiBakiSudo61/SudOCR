from fastapi import FastAPI, UploadFile, File, Request
from fastapi.middleware.cors import CORSMiddleware
from paddleocr import PaddleOCR
import numpy as np
import cv2

# FastAPIアプリケーションの初期化
app = FastAPI()

# 通信を許可するオリジン（あなたのフロントエンドのURL）のリスト
origins = [
    "https://sudocr.bakix2.jp",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"], # すべてのメソッド（GET, POSTなど）を許可
    allow_headers=["*"], # すべてのヘッダーを許可
)

# PaddleOCRの初期化
ocr = PaddleOCR(use_angle_cls=True, lang='japan', ocr_version='PP-OCRv5')

@app.get("/")
def read_root():
    return {"message": "PaddleOCR API is running"}

@app.post("/api/ocr")
async def perform_ocr(image: UploadFile = File(...)):
    # アップロードされたファイルを読み込む
    contents = await image.read()
    
    # 画像データをOpenCVが扱える形式に変換
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    # PaddleOCRでテキスト認識を実行
    result = ocr.ocr(img, cls=True)

    # 認識結果からテキスト部分だけを抽出
    texts = []
    if result and result[0] is not None:
        for line in result[0]:
            texts.append(line[1][0])
            
    # 抽出したテキストを改行で連結して返す
    return {"text": "\n".join(texts)}