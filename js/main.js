// DOM要素を定数として取得
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const scanButton = document.getElementById('scanButton');
const resultText = document.getElementById('resultText');
const resultsContainer = document.getElementById('resultsContainer');
const closeButton = document.getElementById('closeButton');

/**
 * 自作のOCRモデルを呼び出すためのプレースホルダー関数
 * @param {HTMLCanvasElement} canvasElement - 映像フレームが描画されたCanvas
 * @returns {Promise<string>} - OCR結果のテキスト
 */
async function runCustomOCR(canvasElement) {
    console.log("OCR処理をシミュレート中...");
    await new Promise(resolve => setTimeout(resolve, 1500));
    const dummyResult = `スキャン成功！\n日時: ${new Date().toLocaleString()}\nこのウィンドウは下からスライドして表示されます。\n閉じるボタンで再び隠れます。`;
    console.log("シミュレーション完了。");
    return dummyResult;
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