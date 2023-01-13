import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { VisaCountry, VisaCountrySchema } from './schemas/visa_country.schema';
import { MongooseModuleOptions } from '@nestjs/mongoose/dist/interfaces/mongoose-options.interface';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { Country, CountrySchema } from './schemas/country.schema';
import { WeatherService } from './services/weather/weather.service';
import { CountriesService } from './services/countries/countries.service';
import { VisaRequirementsService } from './services/visa-requirements/visa-requirements.service';
import { TravelRestrictionsService } from './services/travel-restrictions/travel-restrictions.service';
import {
  TravelRestrictions,
  TravelRestrictionsSchema,
} from './schemas/travel-restrictions.schema';
import { ExchangeRateService } from './services/exchange-rate/exchange-rate.service';

@Module({
  imports: [
    MongooseModule.forRoot(
      `mongodb+srv://${process.env.MONGODB_CLOUD_USER}:${process.env.MONGODB_CLOUD_PASSWORD}@private.sbcgrty.mongodb.net/?retryWrites=true&w=majoritynot`,
      { dbName: process.env.MONGODB_DB } as MongooseModuleOptions,
    ),
    MongooseModule.forFeature([
      { name: VisaCountry.name, schema: VisaCountrySchema },
    ]),
    MongooseModule.forFeature([{ name: Country.name, schema: CountrySchema }]),
    MongooseModule.forFeature([
      { name: TravelRestrictions.name, schema: TravelRestrictionsSchema },
    ]),
    ScheduleModule.forRoot(),
    ConfigModule.forRoot(),
    HttpModule,
  ],
  controllers: [AppController],
  providers: [
    VisaRequirementsService,
    WeatherService,
    CountriesService,
    TravelRestrictionsService,
    ExchangeRateService,
  ],
})
export class AppModule {}
