import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { VisaRequirementsService } from './services/visa-requirements.service';
import { MongooseModule } from '@nestjs/mongoose';
import { VisaCountry, VisaCountrySchema } from './schemas/visa_country.schema';
import { MongooseModuleOptions } from '@nestjs/mongoose/dist/interfaces/mongoose-options.interface';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { Country, CountrySchema } from './schemas/country.schema';

@Module({
  imports: [
    MongooseModule.forRoot(
      `mongodb://${process.env.MONGODB_USER}:${process.env.MONGODB_PASSWORD}@hafenhost.com:27017`,
      { dbName: process.env.MONGODB_DB } as MongooseModuleOptions,
    ),
    MongooseModule.forFeature([
      { name: VisaCountry.name, schema: VisaCountrySchema },
    ]),
    MongooseModule.forFeature([{ name: Country.name, schema: CountrySchema }]),
    ScheduleModule.forRoot(),
    ConfigModule.forRoot(),
    HttpModule,
  ],
  controllers: [AppController],
  providers: [VisaRequirementsService],
})
export class AppModule {}
