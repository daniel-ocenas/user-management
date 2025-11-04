import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ClientModule } from './client.module';

async function bootstrap() {
  const app = await NestFactory.create(ClientModule);

  const port = process.env.CLIENT_PORT || 8091;
  await app.listen(port);
  Logger.log(`Client service is listening on port: ${port}.`);
}

bootstrap();
