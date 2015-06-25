FROM ubuntu:vivid
MAINTAINER Ben Creasy <contact@bencreasy.com>

ENV DEBIAN_FRONTEND noninteractive
ENV NODE_ENV development

RUN apt-get update -y \
    && apt-get -qq -y update \
    && apt-get install -y nodejs vim curl \
    && apt-get install -y npm sqlite3 mongodb mongodb-clients \
    && npm install -g nodemon react-tools browserify grunt-cli mocha istanbul sass \
    && ln -s /usr/bin/nodejs /usr/bin/node \
    && mkdir -p /data/db \
    && mkdir /app

ADD . /app
WORKDIR /app
RUN npm install
ENV NODE_ENV production
RUN grunt process 
VOLUME /home/persistence
CMD mongod --fork --logpath /var/log/mongod.log && grunt deploy