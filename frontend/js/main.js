// 認証チェック - IIFE（即座実行関数式）でカプセル化
(function() {
    'use strict';
    
    const isVerified = sessionStorage.getItem('isUserVerified');
    
    if (isVerified !== 'true') {
        window.location.replace('login.html');
        return;
    }
})();

// 定数とDOM要素
const CONFIG = {
    MAX_RETRY_COUNT: 3,
    RETRY_DELAY: 1000,
    IMAGE_QUALITY: 0.85,
    SUPPORTED_FORMATS: ['image/png', 'image/jpeg', 'image/webp']
};

const elements = {
    video: document.getElementById('video'),
    canvas: document.getElementById('canvas'),
    scanButton: document.getElementById('scanButton'),
    resultText: document.getElementById('resultText'),
    resultsContainer: document.getElementById('resultsContainer'),
    closeButton: document.getElementById('closeButton')
};

// 状態管理
let isProcessing = false;
let cameraStream = null;

/**
 * OCR処理のリトライ機能付きAPI呼び出し
 * @param {HTMLCanvasElement} canvasElement - 画像が描画されたCanvas
 * @param {number} retryCount - リトライ回数
 * @returns {Promise<string>} OCR結果のテキスト
 */
async function runOCRWithRetry(canvasElement, retryCount = 0) {
    try {
        console.log(`OCR処理開始 (試行: ${retryCount + 1}/${CONFIG.MAX_RETRY_COUNT + 1})`);

        // Canvasから高品質な画像データをBlobとして取得
        const blob = await new Promise((resolve, reject) => {
            canvasElement.toBlob(
                (blob) => blob ? resolve(blob) : reject(new Error('画像の生成に失敗しました')),
                'image/png',
                CONFIG.IMAGE_QUALITY
            );
        });

        // ファイルサイズをチェック
        if (blob.size > 10 * 1024 * 1024) { // 10MB
            throw new Error('画像サイズが大きすぎます');
        }

        const formData = new FormData();
        formData.append('image', blob, 'scan.png');

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒タイムアウト

        const response = await fetch('/api/ocr', {
            method: 'POST',
            body: formData,
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.detail || `サーバーエラー: ${response.status}`);
        }

        const result = await response.json();
        return result.text || "テキストが見つかりませんでした";

    } catch (error) {
        console.error(`OCRエラー (試行: ${retryCount + 1}):`, error);

        // リトライ可能なエラーかチェック
        const isRetryableError = 
            error.name === 'AbortError' ||
            error.message.includes('Failed to fetch') ||
            error.message.includes('NetworkError');

        if (isRetryableError && retryCount < CONFIG.MAX_RETRY_COUNT) {
            console.log(`${CONFIG.RETRY_DELAY}ms後にリトライします...`);
            await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY_DELAY));
            return runOCRWithRetry(canvasElement, retryCount + 1);
        }

        // エラーメッセージを分類
        if (error.name === 'AbortError') {
            return "処理がタイムアウトしました。\nネットワーク接続を確認して再試行してください。";
        } else if (error.message.includes('Failed to fetch')) {
            return "サーバーに接続できませんでした。\nネットワーク接続を確認してください。";
        } else {
            return `OCR処理中にエラーが発生しました。\n${error.message}`;
        }
    }
}

/**
 * カメラのセットアップ（改善版）
 */
async function setupCamera() {
    try {
        // 既存のストリームがあれば停止
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
        }

        const constraints = {
            video: {
                facingMode: 'environment',
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            },
            audio: false
        };

        cameraStream = await navigator.mediaDevices.getUserMedia(constraints);
        elements.video.srcObject = cameraStream;
        
        await new Promise((resolve, reject) => {
            elements.video.onloadedmetadata = resolve;
            elements.video.onerror = reject;
        });

        await elements.video.play();
        console.log('カメラ初期化完了');

    } catch (error) {
        console.error("カメラアクセスエラー:", error);
        
        let errorMessage = "カメラにアクセスできませんでした。";
        
        if (error.name === 'NotAllowedError') {
            errorMessage += "\nブラウザの設定でカメラの使用を許可してください。";
        } else if (error.name === 'NotFoundError') {
            errorMessage += "\nカメラが見つかりませんでした。";
        } else if (error.name === 'NotReadableError') {
            errorMessage += "\nカメラが他のアプリケーションで使用中の可能性があります。";
        }

        showResult(errorMessage);
        elements.scanButton.style.display = 'none';
    }
}

/**
 * 結果表示の共通関数
 */
function showResult(text) {
    elements.resultText.textContent = text;
    elements.resultsContainer.classList.add('is-visible');
    elements.scanButton.style.display = 'none';
}

/**
 * 結果ウィンドウを閉じる
 */
function closeResult() {
    elements.resultsContainer.classList.remove('is-visible');
    elements.scanButton.style.display = 'block';
    isProcessing = false;
}

/**
 * カメラの状態をチェック
 */
function isCameraActive() {
    return cameraStream && 
           cameraStream.active && 
           cameraStream.getVideoTracks().length > 0 &&
           cameraStream.getVideoTracks()[0].readyState === 'live';
}

// イベントリスナーの設定
elements.scanButton.addEventListener('click', async () => {
    if (isProcessing) return;

    if (!isCameraActive()) {
        showResult("カメラが有効ではありません。\nページを再読み込みして再試行してください。");
        return;
    }

    isProcessing = true;
    elements.scanButton.style.display = 'none';
    elements.resultsContainer.classList.add('is-visible');
    elements.resultText.textContent = "画像を処理中...";

    try {
        // Canvas設定とキャプチャ
        const context = elements.canvas.getContext('2d');
        elements.canvas.width = elements.video.videoWidth;
        elements.canvas.height = elements.video.videoHeight;
        
        if (elements.canvas.width === 0 || elements.canvas.height === 0) {
            throw new Error('ビデオの解像度を取得できませんでした');
        }

        context.drawImage(elements.video, 0, 0, elements.canvas.width, elements.canvas.height);

        const ocrResult = await runOCRWithRetry(elements.canvas);
        elements.resultText.textContent = ocrResult;

    } catch (error) {
        console.error("スキャン処理エラー:", error);
        elements.resultText.textContent = `エラーが発生しました。\n${error.message}`;
    }
});

elements.closeButton.addEventListener('click', closeResult);

// キーボードショートカット
document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && elements.resultsContainer.classList.contains('is-visible')) {
        closeResult();
    } else if (event.key === ' ' && !isProcessing && !elements.resultsContainer.classList.contains('is-visible')) {
        event.preventDefault();
        elements.scanButton.click();
    }
});

// ページ離脱時のクリーンアップ
window.addEventListener('beforeunload', () => {
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
    }
});

// 初期化
window.addEventListener('load', setupCamera);