// ▼ このブロックをファイルの先頭に追加 ▼
(function() {
    // セッションストレージから認証情報を取得
    const isVerified = sessionStorage.getItem('isUserVerified');
    
    // 認証情報が 'true' でなければ、ログインページに強制的に移動
    if (isVerified !== 'true') {
        // .replace()を使うと、ブラウザの「戻る」ボタンで戻れなくなる
        window.location.replace('login.html');
    }
})();

// DOM要素を定数として取得
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const scanButton = document.getElementById('scanButton');
const resultText = document.getElementById('resultText');
const resultsContainer = document.getElementById('resultsContainer');
const closeButton = document.getElementById('closeButton');

/**
 * 自作のOCRモデルを呼び出すための関数
 * @param {HTMLCanvasElement} canvasElement - 映像フレームが描画されたCanvas
 * @returns {Promise<string>} - OCR結果のテキスト
 */
async function runCustomOCR(canvasElement) {
    console.log("バックエンドAPIに画像を送信します。");

    try {
        // Canvasから画像データをBlobとして取得（品質を0.8に設定）
        const blob = await new Promise(resolve => 
            canvasElement.toBlob(resolve, 'image/png', 0.8)
        );

        // FormDataオブジェクトを作成して画像を追加
        const formData = new FormData();
        formData.append('image', blob, 'scan.png');

        // バックエンドの/api/ocrエンドポイントにPOSTリクエストを送信
        const response = await fetch('/api/ocr', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            const errorMessage = errorData?.detail || `APIエラー: ${response.status} ${response.statusText}`;
            throw new Error(errorMessage);
        }

        const result = await response.json();
        return result.text || "テキストが見つかりませんでした。";

    } catch (error) {
        console.error("APIへのリクエスト中にエラーが発生:", error);
        
        if (error.message.includes('Failed to fetch')) {
            return "OCR処理中にエラーが発生しました。\nサーバーに接続できませんでした。\nネットワーク接続を確認してください。";
        }
        
        return `OCR処理中にエラーが発生しました。\n${error.message}`;
    }
}

// カメラをセットアップする非同期関数
async function setupCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' },
            audio: false
        });
        video.srcObject = stream;
        video.addEventListener('loadedmetadata', () => {
            video.play();
        });
    } catch (err) {
        console.error("カメラへのアクセスエラー:", err);
        resultText.textContent = "カメラにアクセスできませんでした。ブラウザの設定でカメラの使用を許可してください。";
        // エラー時もウィンドウを表示
        resultsContainer.classList.add('is-visible');
        scanButton.style.display = 'none'; // ボタンを隠す
    }
}

// スキャンボタンがクリックされたときの処理
scanButton.addEventListener('click', async () => {
    if (!video.srcObject || !video.srcObject.active) {
        resultText.textContent = "カメラが有効ではありません。";
        resultsContainer.classList.add('is-visible');
        scanButton.style.display = 'none'; // ボタンを隠す
        return;
    }

    // ボタンを隠し、ウィンドウを表示する
    scanButton.style.display = 'none';
    resultsContainer.classList.add('is-visible');
    resultText.textContent = "処理中...";

    try {
        const context = canvas.getContext('2d');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        const ocrResult = await runCustomOCR(canvas);
        resultText.textContent = ocrResult;

    } catch (error) {
        console.error("OCR処理中にエラーが発生しました:", error);
        resultText.textContent = "エラーが発生しました。コンソールを確認してください。";
    }
});

// 閉じるボタンがクリックされたときの処理
closeButton.addEventListener('click', () => {
    // ウィンドウを隠し、ボタンを再表示する
    resultsContainer.classList.remove('is-visible');
    scanButton.style.display = 'block';
});

// ページ読み込み時にカメラをセットアップ
window.addEventListener('load', setupCamera);