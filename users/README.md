# Microservice Connection Test

## To Run it.

### With Docker

- Run docker compose (--build flag for first time or when need to rebuild).

```
docker-compose up --build
```

### Locally

- Start redis server. Microservice needs process.env.REDIS_URL or it will use the hardcoded redis url: redis://localhost:6379.

- Start Postgres server, modify env-copy file to be .env, and edit the DATABASE_URL according to your server credentials.

- We need to deploy the migrations & then start dev server. This command will take care.

```
  npm run start:migrate
```

- Open PostMan, load the proto file we have in src/proto/\*.proto, and start making requests to the microservice, over process.env.PORT or the hardcoded 50051.

## Things we need to discuss. (DONE)

- Microservice Anatomy & Folders structure.

- Naming structre & convention of the messages inside proto files.

- For interfaces generation from proto files, I am using ts-proto, has strong type checking, and an option for NestJS, which generate also decorators for the controller and the client. [Link](https://github.com/stephenh/ts-proto/blob/main/NESTJS.markdown)

- How are we going to handle protofiles? Should we have a github repo for them to be shared across all backend services, with some command line code generation? OR should we put them in a folder beside the backend microservices. I suggest we do it in a file beside the microservices in the same repo, and we set up watchers for the protofile, that run our npm protoc commands to re-generate interfaces and map them to each microservice folder. This approach is setup once and forget. Becuase, if they are in a seperate repo, we need to clone/fetch repo, modify, push, fetch from each microservice as node_module library, then run watchers or generations commands.

- Logger? What third-party logger we are going to use, because we need to extend the built in, logger class to talk with the third-party integration.

- Testing Libraries? Should we stick with JEST?

- Wrap prisma folder inside a "schema" folder.
