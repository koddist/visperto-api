import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import {
  TravelRestrictions,
  TravelRestrictionsDocument,
} from '../../schemas/travel-restrictions.schema';
import { Connection, Model, Promise } from 'mongoose';
import { HttpService } from '@nestjs/axios';
import { Country, CountryDocument } from '../../schemas/country.schema';
import { catchError, lastValueFrom, map, Observable } from 'rxjs';
import { Cron } from '@nestjs/schedule';
import { AmadeusAuthTokenInterface } from '../../interfaces/amadeus-auth-token.interface';
import { LogtailService } from '../logtail/logtail.service';

@Injectable()
export class TravelRestrictionsService {
  private readonly amadeus = {
    baseUrl: 'https://api.amadeus.com',
    apiKeys: {
      grant_type: 'client_credentials',
      client_id: process.env.AMADEUS_CLIENT_ID,
      client_secret: process.env.AMADEUS_CLIENT_SECRET,
    },
  };

  constructor(
    @InjectConnection() private connection: Connection,
    private readonly httpService: HttpService,
    @InjectModel(TravelRestrictions.name)
    private readonly travelRestrictionsModel: Model<TravelRestrictionsDocument>,
    @InjectModel(Country.name)
    private readonly countryModel: Model<CountryDocument>,
    private readonly logtailService: LogtailService,
  ) {}

  private getAuthorizationToken(): Observable<AmadeusAuthTokenInterface> {
    return this.httpService
      .post(
        `${this.amadeus.baseUrl}/v1/security/oauth2/token`,
        this.amadeus.apiKeys,
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
      )
      .pipe(
        map((res) => res.data),
        catchError((err) => {
          return this.logtailService
            .logError(
              'Amadeus authorization token API call failed',
              'travelRestrictions',
              err.response.data,
            )
            .then(() => {
              throw err.response.data;
            });
        }),
      );
  }

  // At 05:00 on day-of-month 1
  @Cron('00 03 3 * *', {
    name: 'update_travel_restrictions',
    timeZone: 'Europe/Paris',
  })
  private async getTravelRestrictions() {
    const token = await lastValueFrom(this.getAuthorizationToken()).then(
      (auth) => auth.access_token,
    );

    const noDataInAmadeus = ['XK', 'VA']; // Kosovo, Vatican

    const countryCodes: string[] = await this.countryModel
      .distinct('cca2')
      .then((codes) => codes.filter((code) => !noDataInAmadeus.includes(code)));

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
            return this.logtailService
              .logError(
                'Travel restrictions API call failed',
                'travelRestrictions',
                err.response.data.errors,
              )
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
      await apiCallInterval(2000);
    }

    return Promise.all(promises).then(() => {
      return this.connection.db
        .dropCollection('travelRestrictions')
        .then(() => {
          return this.travelRestrictionsModel.insertMany(
            travelRestrictions,
            (error) => {
              if (error) {
                return this.logtailService.logError(
                  'Travel restrictions data are not updated',
                  'travelRestrictions',
                  error.message,
                );
              } else {
                return this.logtailService.logInfo(
                  'Travel restrictions data has been successfully updated.',
                );
              }
            },
          );
        });
    });
  }

  public async getTravelRestrictionById(countryId: string) {
    const travelRestriction = await this.travelRestrictionsModel.findById(
      countryId,
    );

    if (!travelRestriction) {
      throw new NotFoundException('Travel restriction not found');
    }

    return travelRestriction;
  }
}
