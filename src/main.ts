import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const githubActionsIpPrefix = /^13\.88\./;
  const corsOptions: CorsOptions = {
    origin: [
      'https://visperto.com',
      'https://www.visperto.com',
      githubActionsIpPrefix,
    ],
    credentials: true,
  };
  app.enableCors(corsOptions);
  app.useGlobalPipes(new ValidationPipe());
  await app.listen(process.env.PORT || 3000);
}
bootstrap();
