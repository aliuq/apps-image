FROM nginx:alpine

LABEL version="0.0.1"
LABEL maintainer="AliuQ <aliuq@bilishare.com>"
LABEL description="Nginx with custom configuration, based on alpine. The root path is /app."

WORKDIR /app
COPY ./conf/default.svelte.conf /etc/nginx/conf.d/default.conf

CMD ["nginx", "-g", "daemon off;"]

EXPOSE 80
