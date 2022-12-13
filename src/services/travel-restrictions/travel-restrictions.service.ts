import { Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import {
  TravelRestrictions,
  TravelRestrictionsDocument,
} from '../../schemas/travel-restrictions.schema';
import { Connection, Model, Promise } from 'mongoose';
import { Logtail } from '@logtail/node';
import { HttpService } from '@nestjs/axios';
import { Country, CountryDocument } from '../../schemas/country.schema';
import { map } from 'rxjs';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class TravelRestrictionsService {
  private readonly logtail = new Logtail(process.env.LOGTAIL_TOKEN);
  private readonly token = 'BRixg3GxxCEOLFOrgk6BTAGA5oIr';

  constructor(
    @InjectConnection() private connection: Connection,
    private readonly httpService: HttpService,
    @InjectModel(TravelRestrictions.name)
    private readonly travelRestrictionsModel: Model<TravelRestrictionsDocument>,
    @InjectModel(Country.name)
    private readonly countryModel: Model<CountryDocument>,
  ) {}

  @Cron('00 05 10 1,3,5,7,9,11 *', {
    name: 'update_travel_restrictions',
    timeZone: 'Europe/Paris',
  })
  public async getTravelRestrictions() {
    const countryCodes: string[] = await this.countryModel
      .distinct('cca2')
      .then((codes) => codes);

    const apiCallInterval = (ms) => {
      return new Promise((resolve) => setTimeout(resolve, ms));
    };

    const promises = [];
    const travelRestrictions = [];

    const getTravelRestriction = (countryCode: string) => {
      return this.httpService
        .get(
          `https://test.api.amadeus.com/v2/duty-of-care/diseases/covid19-area-report?countryCode=${countryCode}&language=EN`,
          { headers: { Authorization: `Bearer ${this.token}` } },
        )
        .pipe(
          map((response) => {
            console.log(response.data.data.area.name);
            return response.data.data;
          }),
        );
    };

    for (const countryCode of countryCodes.slice(9, 12)) {
      promises.push(
        new Promise((resolve) => {
          getTravelRestriction(countryCode).subscribe((data) => {
            resolve(travelRestrictions.push(data));
          });
        }),
      );
      await apiCallInterval(1000);
    }

    return Promise.all(promises).then(() => {
      console.log(travelRestrictions);
      return this.connection.db
        .dropCollection('travelRestrictions')
        .then(() => {
          return this.travelRestrictionsModel.insertMany(
            travelRestrictions,
            (error) => {
              if (error) {
                return this.logtail.error(
                  'Travel restrictions data are not updated',
                  {
                    type: 'travelRestrictions',
                    message: error.message,
                  },
                );
              } else {
                return this.logtail.info(
                  'Travel restrictions data has been successfully updated.',
                );
              }
            },
          );
        });
    });
  }
}
