// ページ読み込み時に、ユーザーが認証済みかチェック
(function() {
    const isVerified = sessionStorage.getItem('isUserVerified');
    if (isVerified !== 'true') {
        // 認証されていなければ、ログインページに強制的にリダイレクト
        alert('ログインが必要です。');
        window.location.href = 'login.html';
    }
})();

// DOM要素を定数として取得
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const scanButton = document.getElementById('scanButton');
const resultText = document.getElementById('resultText');

/**
 * 自作のOCRモデルを呼び出すためのプレースホルダー（仮の置き場所）関数
 * @param {HTMLCanvasElement} canvasElement - 映像フレームが描画されたCanvas
 * @returns {Promise<string>} - OCR結果のテキスト
 */
async function runCustomOCR(canvasElement) {
    // =======================================================================
    // == ▼ ここに、自作したクライアントサイドモデルの処理を記述 ▼ ==
    // =======================================================================

    // ▼ 以下はAIモデルが組み込まれるまでのダミー処理 ▼
    console.log("OCR処理をシミュレート中...");
    await new Promise(resolve => setTimeout(resolve, 1500)); // 1.5秒待機
    const dummyResult = `スキャン成功！\n日時: ${new Date().toLocaleTimeString()}`;
    console.log("シミュレーション完了。");
    return dummyResult;
    // ▲ ダミー処理 ▲
}

// カメラをセットアップする非同期関数
async function setupCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' }, // 背面カメラを優先
            audio: false
        });
        video.srcObject = stream;
        video.addEventListener('loadedmetadata', () => {
            video.play();
        });
    } catch (err) {
        console.error("カメラへのアクセスエラー:", err);
        resultText.textContent = "カメラにアクセスできませんでした。ブラウザの設定でカメラの使用を許可してください。";
        scanButton.disabled = true;
    }
}

// スキャンボタンがクリックされたときの処理
scanButton.addEventListener('click', async () => {
    if (!video.srcObject || !video.srcObject.active) {
        resultText.textContent = "カメラが有効ではありません。";
        return;
    }

    // 処理中はボタンを無効化
    scanButton.disabled = true;
    scanButton.textContent = "処理中...";

    try {
        // ビデオの現在のフレームをCanvasに描画
        const context = canvas.getContext('2d');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        // 自作OCR関数を呼び出し
        const ocrResult = await runCustomOCR(canvas);
        
        resultText.textContent = ocrResult;

    } catch (error) {
        console.error("OCR処理中にエラーが発生しました:", error);
        resultText.textContent = "エラーが発生しました。コンソールを確認してください。";
    } finally {
        // 処理が終わったらボタンを有効化
        scanButton.disabled = false;
        scanButton.textContent = "📷 スキャン";
    }
});

// ページの読み込みが完了したらカメラをセットアップ
window.addEventListener('load', setupCamera);