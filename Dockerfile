FROM node:20.4-alpine3.18
MAINTAINER info@vizzuality.com

ENV NAME adapter-arcgis
ENV USER adapter-arcgis

RUN apk update && apk upgrade && \
    apk add --no-cache --update bash git openssh python3 alpine-sdk

RUN addgroup $USER && adduser -s /bin/bash -D -G $USER $USER

RUN yarn global add grunt-cli bunyan pm2

RUN mkdir -p /opt/$NAME
COPY package.json /opt/$NAME/package.json
COPY yarn.lock /opt/$NAME/yarn.lock
RUN cd /opt/$NAME && yarn

COPY entrypoint.sh /opt/$NAME/entrypoint.sh
COPY config /opt/$NAME/config

WORKDIR /opt/$NAME

COPY ./app /opt/$NAME/app
RUN chown -R $USER:$USER /opt/$NAME

# Tell Docker we are going to use this ports
EXPOSE 3055
USER $USER

ENTRYPOINT ["./entrypoint.sh"]
