// DOM要素を取得
const robotCheckbox = document.getElementById('robot-checkbox');
const loginButton = document.getElementById('loginButton');

robotCheckbox.addEventListener('change', () => {
    if (robotCheckbox.checked) {
        loginButton.disabled = false;
    } else {
        loginButton.disabled = true;
    }
});

// ログインボタンがクリックされたときの処理
loginButton.addEventListener('click', () => {
    if (robotCheckbox.checked) {
        // ログインが成功したという証をセッションストレージに保存
        sessionStorage.setItem('isUserVerified', 'true');

        // 1. bodyにフェードアウト用のクラスを追加
        document.body.classList.add('fade-out');

        // 2. アニメーションが終わるのを待ってからページを遷移
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 500); // CSSのtransitionの時間（0.5s）と合わせる
        // ▲ ここまで変更 ▲

    } else {
        alert('チェックボックスにチェックを入れてください。');
    }
});