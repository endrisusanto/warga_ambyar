FROM node:18-alpine

# Install build dependencies for native modules like bcrypt
RUN apk add --no-cache python3 py3-requests make g++

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 9878

CMD ["npm", "start"]

