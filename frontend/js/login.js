// DOM要素を取得
const robotCheckbox = document.getElementById('robot-checkbox');
const loginButton = document.getElementById('loginButton');

// チェックボックスの状態変更イベント
robotCheckbox.addEventListener('change', () => {
    loginButton.disabled = !robotCheckbox.checked;
});

// ログインボタンがクリックされたときの処理
loginButton.addEventListener('click', () => {
    if (!robotCheckbox.checked) {
        alert('チェックボックスにチェックを入れてください。');
        return;
    }

    // ログインが成功したという証をセッションストレージに保存
    sessionStorage.setItem('isUserVerified', 'true');

    // bodyにフェードアウト用のクラスを追加
    document.body.classList.add('fade-out');

    // アニメーションが終わるのを待ってからページを遷移
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 500); // CSSのtransitionの時間（0.5s）と合わせる
});

// Enterキーでもログインできるようにする
document.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !loginButton.disabled) {
        loginButton.click();
    }
});