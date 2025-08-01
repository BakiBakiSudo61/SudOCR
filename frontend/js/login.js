(function() {
    'use strict';

    // 既にログイン済みの場合はメインページにリダイレクト
    if (sessionStorage.getItem('isUserVerified') === 'true') {
        window.location.replace('index.html');
        return;
    }

    // DOM要素の取得
    const elements = {
        robotCheckbox: document.getElementById('robot-checkbox'),
        loginButton: document.getElementById('loginButton'),
        body: document.body
    };

    // 状態管理
    let isSubmitting = false;

    /**
     * ログイン処理
     */
    function handleLogin() {
        if (isSubmitting) return;

        if (!elements.robotCheckbox.checked) {
            alert('ロボットではないことを確認してください。');
            elements.robotCheckbox.focus();
            return;
        }

        isSubmitting = true;
        elements.loginButton.disabled = true;
        elements.loginButton.textContent = 'ログイン中...';

        try {
            // セッションストレージに認証情報を保存
            sessionStorage.setItem('isUserVerified', 'true');
            
            // ログイン成功をログに記録
            console.log('ログイン成功:', new Date().toISOString());

            // フェードアウトアニメーション
            elements.body.classList.add('fade-out');

            // アニメーション完了後にページ遷移
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 500);

        } catch (error) {
            console.error('ログイン処理エラー:', error);
            alert('ログイン処理中にエラーが発生しました。');
            
            // エラー時の状態復元
            isSubmitting = false;
            elements.loginButton.disabled = false;
            elements.loginButton.textContent = 'ログイン';
        }
    }

    /**
     * ボタンの状態更新
     */
    function updateButtonState() {
        elements.loginButton.disabled = !elements.robotCheckbox.checked || isSubmitting;
    }

    // イベントリスナーの設定
    elements.robotCheckbox.addEventListener('change', updateButtonState);
    elements.loginButton.addEventListener('click', handleLogin);

    // キーボードイベント
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && !elements.loginButton.disabled) {
            event.preventDefault();
            handleLogin();
        } else if (event.key === ' ' && document.activeElement === elements.robotCheckbox) {
            // スペースキーでチェックボックスをトグル
            event.preventDefault();
            elements.robotCheckbox.checked = !elements.robotCheckbox.checked;
            updateButtonState();
        }
    });

    // フォーカス管理
    elements.robotCheckbox.focus();

    // 初期状態の設定
    updateButtonState();

})();