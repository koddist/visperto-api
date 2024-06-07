import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { Callback, Context, Handler } from 'aws-lambda';
import serverlessExpress from '@codegenie/serverless-express';
import { LogtailService } from './services/logtail/logtail.service';
import { CountriesService } from './services/countries/countries.service';

let server: Handler;

const logtail = new LogtailService();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const corsOptions: CorsOptions = {
    origin: [
      'https://visperto.com',
      'https://www.visperto.com',
      'http://localhost:4321',
    ],
    credentials: true,
  };
  app.enableCors(corsOptions);
  app.useGlobalPipes(new ValidationPipe());
  await app.init();

  const expressApp = app.getHttpAdapter().getInstance();
  return serverlessExpress({ app: expressApp });
}

export const updateCountries: Handler = async () => {
  const app = await NestFactory.createApplicationContext(AppModule);
  const countriesService = app.get(CountriesService);
  await countriesService.updateCountriesData().then(() => {
    logtail.logInfo('Countries data updated successfully');
  });
};

export const updateCountriesTimezone: Handler = async () => {
  const app = await NestFactory.createApplicationContext(AppModule);
  const countriesService = app.get(CountriesService);
  await countriesService.updateCountriesTimezone().then(() => {
    logtail.logInfo('Countries timezone updated successfully');
  });
};

export const handler: Handler = async (
  event: any,
  context: Context,
  callback: Callback,
) => {
  server = server ?? (await bootstrap());
  return server(event, context, callback);
};
