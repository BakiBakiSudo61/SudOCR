# Dockerfile

# --- ステージ1: Nginxのベースイメージを使用 ---
FROM nginx:1.27-alpine-slim

# --- ステージ2: 作成したアプリのファイルをコピー ---
# ローカルのファイルをNginxの公開ディレクトリにコピーする
COPY ./index.html /usr/share/nginx/html/index.html
COPY ./login.html /usr/share/nginx/html/login.html
COPY ./css /usr/share/nginx/html/css
COPY ./js /usr/share/nginx/html/js

# --- ステージ3: Nginxの設定（オプションだが推奨） ---
# SPA（シングルページアプリケーション）のように、どのパスに来ても
# まずlogin.htmlを探すように設定しておくと、後の拡張で役立つ
# COPY ./nginx.conf /etc/nginx/conf.d/default.conf

# コンテナがリッスンするポートを80番に指定
EXPOSE 80

# Nginxを起動
CMD ["nginx", "-g", "daemon off;"]