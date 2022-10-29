import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongooseModule } from '@nestjs/mongoose';
import { VisaCountry, VisaCountrySchema } from "./schemas/visa_country.schema";
import { MongooseModuleOptions } from "@nestjs/mongoose/dist/interfaces/mongoose-options.interface";

@Module({
  imports: [
      MongooseModule.forRoot('mongodb://dinav_dbadmin:wotde6-rAfgod-xuxkyf@hafenhost.com:27017', { dbName: 'dinav' } as MongooseModuleOptions),
      MongooseModule.forFeature([{ name: VisaCountry.name, schema: VisaCountrySchema }])
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
