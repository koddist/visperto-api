import { Injectable, NotFoundException } from '@nestjs/common';
import { CountryNamesFix } from '../../enum/country-names-fix';
import { VisaCountriesEnum } from '../../enum/visa-countries.enum';
import { map, forkJoin, lastValueFrom } from 'rxjs';
import { Islands } from '../../enum/islands-list';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import {
  VisaCountry,
  VisaCountryDocument,
} from '../../schemas/visa_country.schema';
import { Connection, Model, Promise } from 'mongoose';
import { HttpService } from '@nestjs/axios';
import { Country, CountryDocument } from '../../schemas/country.schema';
import { LogtailService } from '../logtail/logtail.service';
import { Cron } from '@nestjs/schedule';
import { CountryListItemInterface } from '../../interfaces/country-list-item.interface';

@Injectable()
export class CountriesService {
  constructor(
    @InjectModel(VisaCountry.name)
    private readonly visaCountryModel: Model<VisaCountryDocument>,
    @InjectModel(Country.name)
    private readonly countryModel: Model<CountryDocument>,
    @InjectConnection() private connection: Connection,
    private readonly httpService: HttpService,
    private readonly logtailService: LogtailService,
  ) {}

  @Cron('00 03 2 * *', {
    name: 'update_countries',
    timeZone: 'Europe/Paris',
  })
  private async getCountries(): Promise<any> {
    const fixCountryName = (countryName: string): string => {
      const correctedName = CountryNamesFix.filter((country) =>
        country.alternatives.includes(countryName),
      );

      return correctedName.length > 0 ? correctedName[0].standard : countryName;
    };

    const countryNames: string[] = await this.visaCountryModel
      .distinct('name')
      .then((countries) => {
        return countries.map((country) => fixCountryName(country));
      });

    const fixCountryNames = (countriesData) => {
      return countriesData.data.map((countryData) => {
        return {
          ...countryData,
          name: {
            common: fixCountryName(countryData.name.common),
            official: countryData.name.official,
          },
        };
      });
    };

    return this.httpService.get(VisaCountriesEnum.REST_COUNTRIES_API_URL).pipe(
      map(async (res) => {
        const fixedNames = fixCountryNames(res);

        const countriesData = await fixedNames.filter((countryData) => {
          return [countryData.name.common, countryData.name.official].some(
            (country) =>
              countryNames.includes(country) &&
              !Islands.includes(countryData.name.common),
          );
        });

        return await this.connection.db.dropCollection('countries').then(() => {
          this.countryModel.insertMany(countriesData, (error) => {
            if (error) {
              return this.logtailService.logError(
                'General countries data are not updated',
                'countries',
                error.message,
              );
            } else {
              return this.logtailService.logInfo(
                'General countries data has been successfully updated.',
              );
            }
          });
        });
      }),
    );
  }

  public async getListOfCountriesWithDetails(): Promise<Country[]> {
    return this.countryModel.find().exec();
  }

  public async getListOfCountries(): Promise<CountryListItemInterface[]> {
    return this.countryModel
      .aggregate([
        {
          $lookup: {
            from: 'visaRequirements',
            localField: 'name.common',
            foreignField: 'name',
            as: 'visaRequirements',
          },
        },
        {
          $lookup: {
            from: 'travelRestrictions',
            localField: 'cca2',
            foreignField: 'area.code',
            as: 'travelRestrictions',
          },
        },
        {
          $addFields: {
            visaRequirementsId: { $arrayElemAt: ['$visaRequirements._id', 0] },
            travelRestrictionsId: {
              $arrayElemAt: ['$travelRestrictions._id', 0],
            },
            name: '$name.common',
          },
        },
        {
          $project: {
            _id: 1,
            name: 1,
            visaRequirementsId: 1,
            travelRestrictionsId: 1,
          },
        },
      ])
      .then((countries: CountryListItemInterface[]) => countries);
  }

  @Cron('00 03 2 * *', {
    name: 'update_countries',
    timeZone: 'Europe/Paris',
  })
  public async updateCountriesTimezone() {
    const countries = await this.countryModel.find().exec();
    const updateObservables = [];

    for (const capital of countries) {
      const { id } = capital;
      const { latlng } = capital.capitalInfo;
      const countryDocument = await this.countryModel.findOne({ _id: id });

      if (countryDocument) {
        const updateObservable = this.httpService
          .get(
            `https://api.ipgeolocation.io/timezone?apiKey=${process.env.IPGOOLOCATION_API_KEY}&lat=${latlng[0]}&long=${latlng[1]}`,
          )
          .pipe(
            map(async (res) => {
              const isUpdated =
                (await this.countryModel.findByIdAndUpdate(
                  { _id: id },
                  { $set: { timezone: res.data } },
                  { new: true },
                )) !== null;

              if (!isUpdated) {
                return this.logtailService.logError(
                  'Timezone information is not updated',
                  'countries',
                  `Failed to update the timezone information of country document with ID ${id}.`,
                );
              }
            }),
          );

        updateObservables.push(updateObservable);
      } else {
        return this.logtailService.logError(
          'Timezone information is not updated',
          'countries',
          `Failed to find the document with ID ${id}.`,
        );
      }
    }
    await lastValueFrom(forkJoin(updateObservables));
  }

  public async getCountryById(countryId: string): Promise<Country> {
    const country = await this.countryModel.findById(countryId);

    if (!country) {
      throw new NotFoundException('Country not found');
    }

    return country;
  }
}
