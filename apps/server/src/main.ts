import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { USER_PACKAGE_NAME } from 'libs/common/src';
import { join } from 'path';
import { ServerModule } from './server.module';

async function bootstrap() {
  const app = await NestFactory.create(ServerModule);

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      protoPath: join(__dirname, '../user.proto'),
      package: USER_PACKAGE_NAME,
    },
  });
  await app.startAllMicroservices();
  Logger.log('Server is listening on grpc channel.');

  const port = process.env.SERVER_PORT || 8081;
  await app.listen(port);
  Logger.log(`Server is listening on port: ${port}.`);
}

bootstrap();
