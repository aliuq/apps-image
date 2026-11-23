FROM aliuq/nginx:vue

ENV TZ=Asia/Shanghai

WORKDIR /app

COPY ./app/dist /app

CMD ["nginx", "-g", "daemon off;"]
EXPOSE 80
