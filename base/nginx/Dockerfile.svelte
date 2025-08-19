FROM nginx:alpine

WORKDIR /app
COPY ./conf/default.svelte.conf /etc/nginx/conf.d/default.conf

CMD ["nginx", "-g", "daemon off;"]

EXPOSE 80
