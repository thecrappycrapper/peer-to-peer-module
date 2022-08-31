FROM node:16-slim

WORKDIR /app

COPY package.json /app

RUN npm i

COPY . /app

CMD ["npm", "start"]