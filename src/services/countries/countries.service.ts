import { Injectable, NotFoundException } from '@nestjs/common';
import { CountryNamesFix } from '../../enum/country-names-fix';
import { VisaCountriesEnum } from '../../enum/visa-countries.enum';
import { map } from 'rxjs';
import { Islands } from '../../enum/islands-list';
import { Logtail } from '@logtail/node';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import {
  VisaCountry,
  VisaCountryDocument,
} from '../../schemas/visa_country.schema';
import { Connection, Model } from 'mongoose';
import { HttpService } from '@nestjs/axios';
import { Country, CountryDocument } from '../../schemas/country.schema';

@Injectable()
export class CountriesService {
  constructor(
    @InjectModel(VisaCountry.name)
    private readonly visaCountryModel: Model<VisaCountryDocument>,
    @InjectModel(Country.name)
    private readonly countryModel: Model<CountryDocument>,
    @InjectConnection() private connection: Connection,
    private readonly httpService: HttpService,
  ) {}

  private readonly logtail = new Logtail(process.env.LOGTAIL_TOKEN);

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
              return this.logtail.error(
                'General countries data are not updated',
                {
                  details: {
                    type: 'countries',
                    message: error.message,
                  },
                },
              );
            } else {
              return this.logtail.info(
                'General countries data has been successfully updated.',
              );
            }
          });
        });
      }),
    );
  }

  public async getListOfCountries() {
    return this.countryModel
      .aggregate([
        {
          $lookup:
            {
              from: 'visaRequirements',
              localField: 'name.common',
              foreignField: 'name',
              as: 'visaRequirements'
            }
        },
        {
          $addFields: {
            visaRequirementsID: { $arrayElemAt: ['$visaRequirements._id', 0] },
            name: '$name.common'
          }
        },
        {
          $project: { _id: 1, 'name': 1, visaRequirementsID: 1 }
        }
      ])
      .then((countries) => countries);
  }

  public async getCountryById(countryId: string) {
    const country = await this.countryModel.findById(countryId);

    if (!country) {
      throw new NotFoundException('Country not found');
    }

    return country;
  }
}
