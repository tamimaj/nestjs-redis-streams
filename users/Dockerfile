FROM node:14-alpine As development

# Create app directory, this is in our container/in our image
WORKDIR /usr/src/app

# copy packages.json & package-lock.json
COPY package*.json ./

# Important to copy migrations too, so I can deploy them.
COPY schema ./schema/

# Install Dev dependencies.
RUN npm install --only=development

# Bundle app source
COPY . .

# Generate prisma typescript types & build.
RUN npx prisma generate
RUN npm run build

# Production phase
FROM node:14-alpine As production

# set Node_ENV
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

# Set wokring directory
WORKDIR /usr/src/app

# Copy package.json & package-lock.json.
COPY package*.json ./

# Install production dependencies.
RUN npm install --only=production

# Bundle source app.
COPY . .

# Copy dist folder from development stage.
COPY --from=development /usr/src/app/dist ./dist


# CMD [  "npm", "run", "start:migrate" ]
CMD [  "node", "dist/main" ]

EXPOSE 50051