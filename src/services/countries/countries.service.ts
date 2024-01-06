import { Injectable, NotFoundException } from '@nestjs/common';
import { VisaCountriesEnum } from '../../enum/visa-countries.enum';
import { forkJoin, lastValueFrom, map } from 'rxjs';
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
import { CountryListItemInterface } from '../../interfaces/country-list-item.interface';
import { CountryNameService } from '../country-name/country-name.service';

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
    private readonly countryNameService: CountryNameService,
  ) {}

  // at 3:00 AM on the 2nd day of every month
  public async updateCountries(): Promise<void> {
    try {
      const countriesData = await this.fetchCountriesData();
      const fixedCountriesData = this.fixCountryNames(countriesData);
      const filteredCountriesData = await this.filterCountries(
        fixedCountriesData,
      );
      await this.updateDatabase(filteredCountriesData);
    } catch (error) {
      console.error('Error updating countries:', error);
      this.logtailService.logError(
        'Failed to update general countries data',
        'countries',
        error.message,
      );
    }
  }

  private async fetchCountriesData(): Promise<any[]> {
    return await lastValueFrom(
      this.httpService
        .get(VisaCountriesEnum.REST_COUNTRIES_API_URL)
        .pipe(map((response) => response.data)),
    );
  }

  private fixCountryNames(countriesData: any[]): any[] {
    return countriesData.map((countryData) => ({
      ...countryData,
      name: {
        common: this.countryNameService.checkAlternativeCountryName(
          countryData.name.common,
        ),
        official: countryData.name.official,
      },
    }));
  }

  private async filterCountries(countriesData: any[]): Promise<any[]> {
    return countriesData.filter((countryData) => {
      return !Islands.includes(countryData.name.common);
    });
  }

  private async updateDatabase(countriesData: any[]): Promise<void> {
    try {
      await this.countryModel.deleteMany({});
      await this.countryModel.insertMany(countriesData);
      this.logtailService.logInfo(
        'General countries data has been successfully updated.',
      );
    } catch (error) {
      this.logtailService.logError(
        'General countries data are not updated',
        'countries',
        error.message,
      );
    }
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
          $addFields: {
            visaRequirementsId: { $arrayElemAt: ['$visaRequirements._id', 0] },
            name: '$name.common',
          },
        },
        {
          $project: {
            _id: 1,
            name: 1,
            visaRequirementsId: 1,
          },
        },
      ])
      .then((countries: CountryListItemInterface[]) => countries);
  }

  // at 3:00 AM on the 2nd day of every month
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
            `https://api.ipgeolocation.io/timezone?apiKey=${process.env.IPGEOLOCATION_API_KEY}&lat=${latlng[0]}&long=${latlng[1]}`,
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
