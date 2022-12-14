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
import { catchError, lastValueFrom, map, Observable } from 'rxjs';
import { Cron } from '@nestjs/schedule';
import { AmadeusAuthTokenInterface } from '../../interfaces/amadeus-auth-token.interface';

@Injectable()
export class TravelRestrictionsService {
  private readonly logtail = new Logtail(process.env.LOGTAIL_TOKEN);
  private readonly amadeus = {
    baseUrl: 'https://api.amadeus.com',
    apiKeys: {
      grant_type: 'client_credentials',
      client_id: 'X57OUw9bKclPdCh1aUMLX3kFmxzVV7yc',
      client_secret: 'mcb0PfM6xgCPG8XQ',
    },
  };

  constructor(
    @InjectConnection() private connection: Connection,
    private readonly httpService: HttpService,
    @InjectModel(TravelRestrictions.name)
    private readonly travelRestrictionsModel: Model<TravelRestrictionsDocument>,
    @InjectModel(Country.name)
    private readonly countryModel: Model<CountryDocument>,
  ) {}

  public getAuthorizationToken(): Observable<AmadeusAuthTokenInterface> {
    return this.httpService
      .post(
        'https://api.amadeus.com/v1/security/oauth2/token',
        this.amadeus.apiKeys,
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
      )
      .pipe(
        map((res) => res.data),
        catchError((err) => {
          return this.logtail
            .error('Amadeus authorization token API call failed', {
              details: {
                type: 'travelRestrictions',
                message: err.response.data,
              },
            })
            .then(() => {
              throw err.response.data;
            });
        }),
      );
  }

  @Cron('00 05 1 * *', {
    name: 'update_travel_restrictions',
    timeZone: 'Europe/Paris',
  })
  public async getTravelRestrictions() {
    const token = await lastValueFrom(this.getAuthorizationToken()).then(
      (auth) => auth.access_token,
    );

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
          `${this.amadeus.baseUrl}/v2/duty-of-care/diseases/covid19-area-report?countryCode=${countryCode}&language=EN`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        )
        .pipe(
          map((response) => {
            return response.data.data;
          }),
          catchError((err) => {
            return this.logtail
              .error('Travel restrictions API call failed', {
                details: {
                  type: 'travelRestrictions',
                  message: err.response.data.errors,
                },
              })
              .then(() => {
                throw err.response.data.errors[0].detail;
              });
          }),
        );
    };

    for (const countryCode of countryCodes) {
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
                    details: {
                      type: 'travelRestrictions',
                      message: error.message,
                    },
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
