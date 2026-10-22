FROM nginx:1.31.8-alpine3.24

WORKDIR /app
COPY ./conf/default.conf /etc/nginx/conf.d/default.conf

CMD ["nginx", "-g", "daemon off;"]

EXPOSE 80
