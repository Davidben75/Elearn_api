FROM node:latest
WORKDIR /usr/src/app
COPY ./prisma /usr/src/app/prisma
COPY package*.json ./
RUN npm install
RUN npx prisma generate
COPY . .
EXPOSE 3000
CMD [ "npm", "run", "start:dev" ]