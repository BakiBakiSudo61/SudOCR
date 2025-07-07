from fastapi import FastAPI, UploadFile, File
from paddleocr import PaddleOCR
import numpy as np
import cv2

# FastAPIアプリケーションの初期化
app = FastAPI()

# PaddleOCRの初期化 (日本語モデル、CPUを使用)
ocr = PaddleOCR(use_angle_cls=True, lang='ch_sim+ja')

@app.get("/")
def read_root():
    return {"message": "PaddleOCR API is running"}

@app.post("/ocr")
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