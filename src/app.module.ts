import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { VisaCountry, VisaCountrySchema } from './schemas/visa_country.schema';
import { MongooseModuleOptions } from '@nestjs/mongoose/dist/interfaces/mongoose-options.interface';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { Country, CountrySchema } from './schemas/country.schema';
import { WeatherService } from './services/weather/weather.service';
import { CountriesService } from './services/countries/countries.service';
import { VisaRequirementsService } from './services/visa-requirements/visa-requirements.service';
import { ExchangeRateService } from './services/exchange-rate/exchange-rate.service';
import { LogtailService } from './services/logtail/logtail.service';
import { SelectedCountriesService } from './services/selected-countries/selected-countries.service';
import { CountryNameService } from './services/country-name/country-name.service';

@Module({
  imports: [
    MongooseModule.forRoot(
      `mongodb+srv://${process.env.MONGODB_CLOUD_USER}:${process.env.MONGODB_CLOUD_PASSWORD}@private.sbcgrty.mongodb.net/?retryWrites=true&w=majority`,
      {
        dbName: process.env.MONGODB_DB,
      } as MongooseModuleOptions,
    ),
    MongooseModule.forFeature([
      { name: VisaCountry.name, schema: VisaCountrySchema },
    ]),
    MongooseModule.forFeature([{ name: Country.name, schema: CountrySchema }]),
    ConfigModule.forRoot(),
    HttpModule,
  ],
  controllers: [AppController],
  providers: [
    VisaRequirementsService,
    WeatherService,
    CountriesService,
    ExchangeRateService,
    LogtailService,
    SelectedCountriesService,
    CountryNameService,
  ],
})
export class AppModule {}
