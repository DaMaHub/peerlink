FROM node:14
## WORKDIR specifies the directory our
## application's code will live within
WORKDIR /usr/src/app
## We copy our package.json file to our
## app directory
COPY package*.json ./
## We then run npm install to install
## express for our application
RUN npm install
## We then copy the rest of our application
## to the app direcoty
COPY . .
EXPOSE 9888
EXPOSE 443
## We start our application by calling
## npm start.
CMD ["npm", "start"]
