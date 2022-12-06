import * as puppeteer from 'puppeteer';
import { map } from 'rxjs';
import { Cron } from '@nestjs/schedule';
import { Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { Country, CountryDocument } from '../schemas/country.schema';
import {
  VisaCountry,
  VisaCountryDocument,
} from '../schemas/visa_country.schema';
import { VisaCountryDto } from '../dto/visa_country.dto';
import { HttpService } from '@nestjs/axios';
import { VisaCountriesEnum } from '../enum/visa-countries.enum';
import { CountryNamesFix } from '../enum/country-names-fix';
import { Islands } from '../enum/islands-list';

@Injectable()
export class VisaRequirementsService {
  constructor(
    @InjectModel(VisaCountry.name)
    private readonly visaCountryModel: Model<VisaCountryDocument>,
    @InjectModel(Country.name)
    private readonly countryModel: Model<CountryDocument>,
    @InjectConnection() private connection: Connection,
    private readonly httpService: HttpService,
  ) {}

  public async getUrls(): Promise<string[]> {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    await page.goto('https://www.passportindex.org', {
      waitUntil: 'networkidle2',
    });

    return await page
      .evaluate(() => {
        const passportsList = Array.from(
          document.querySelector('#passports').children,
        );
        const passportDashboardButton = document.querySelector(
          '.psprt-view-dashboard',
        );
        const links = [];

        passportsList.forEach((pass) => {
          (pass.childNodes[0] as HTMLAnchorElement).click();
          if (passportDashboardButton) {
            links.push((passportDashboardButton as HTMLAnchorElement).href);
          }
        });

        return links;
      })
      .finally(() => {
        browser.close();
      });
  }

  private validateCountryData(
    countries: VisaCountryDto[],
    countryName: string,
    travelToCountry: string,
    visaStatus: 'not admitted' | 'visa required',
  ) {
    return countries
      .filter((country) => country.name === countryName)[0]
      .visaRequirements.filter(
        (travel) => travel.country === travelToCountry,
      )[0]
      .visa.includes(visaStatus);
  }

  private fixCountryName(countryName: string): string {
    const correctedName = CountryNamesFix.filter((country) =>
      country.alternatives.includes(countryName),
    );

    return correctedName.length > 0 ? correctedName[0].standard : countryName;
  }

  public async getVisaReqByUrl(url: string) {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    await page.goto(url, { waitUntil: 'networkidle2' });

    return await page
      .evaluate(() => {
        const countryName = document.querySelector('.psprt-dashboard-title')
          .childNodes[1].childNodes[2].textContent;
        const visaReqsTable = document.querySelector(
          '.psprt-dashboard-table tbody',
        ).children;

        const visaCountry = {
          name: countryName,
          visaRequirements: [],
        };

        Array.from(visaReqsTable).forEach((country) => {
          const visaReqs = {
            country: (country.childNodes[0] as HTMLElement).children[1]
              .textContent,
            visa: country.childNodes[1].textContent
              .split(/""|\/|days|day/)
              .map((i) => i.trim())
              .filter((c) => c !== '')
              .filter((i) => isNaN(Number(i))),
            days: Number(
              country.childNodes[1].textContent
                .split(/""|\/|days|day/)
                .map((i) => i.trim())
                .filter((c) => c !== '')
                .filter((i) => !isNaN(Number(i)))[0],
            ),
          };
          visaCountry.visaRequirements.push(visaReqs);
        });

        return visaCountry;
      })
      .finally(() => {
        browser.close();
      });
  }

  public async getAllVisaReqs() {
    const urls = await this.getUrls();
    const countries: VisaCountryDto[] = [];

    return new Promise(async (resolve) => {
      for (const url of urls) {
        await this.getVisaReqByUrl(url).then((visaReq) => {
          countries.push(visaReq);
          if (urls.length === countries.length) {
            resolve(true);
          }
        });
      }
    }).then(() => {
      return countries;
    });
  }

  // Every year at 03:00 on day-of-month 1 in July and January.
  @Cron('00 03 1 1,4,7,10 *', {
    name: 'update_visa_requirements',
    timeZone: 'Europe/Paris',
  })
  public async updateCountriesData(): Promise<any> {
    return await this.getAllVisaReqs()
      .then((countries) => {
        const isCountriesLengthEqual =
          countries.length === VisaCountriesEnum.LENGTH_OF_COUNTRIES;
        const isVisaStatusExist = this.validateCountryData(
          countries,
          VisaCountriesEnum.TEST_COUNTRY,
          VisaCountriesEnum.TEST_TRAVEL_TO_COUNTRY,
          VisaCountriesEnum.TEST_VISA_STATUS,
        );

        if (isCountriesLengthEqual && isVisaStatusExist) {
          return this.connection.db
            .dropCollection(process.env.MONGODB_COLLECTION)
            .then(() => {
              return countries.forEach(async (country: VisaCountryDto) => {
                const countryData = new this.visaCountryModel(country);
                return await countryData.save();
              });
            })
            .then(() =>
              console.log('Countries data has been successfully updated.'),
            );
        }
      })
      .catch((e) => {
        console.log(e);
      });
  }

  public async getCountries(): Promise<any> {
    const countryNames: string[] = await this.visaCountryModel
      .distinct('name')
      .then((countries) => {
        return countries.map((country) => this.fixCountryName(country));
      });

    const fixCountryName = (countriesData) => {
      return countriesData.data.map((countryData) => {
        return {
          ...countryData,
          name: {
            common: this.fixCountryName(countryData.name.common),
          },
        };
      });
    };

    return this.httpService.get(VisaCountriesEnum.REST_COUNTRIES_API_URL).pipe(
      map(async (res) => {
        const fixedNames = fixCountryName(res);

        const countriesData = await fixedNames.filter((countryData) => {
          return [countryData.name.common, countryData.name.official].some(
            (country) =>
              countryNames.includes(country) &&
              !Islands.includes(countryData.name.common),
          );
        });

        await this.countryModel.insertMany(countriesData, (error, result) => {
          if (error) {
            return error;
          } else {
            return result;
          }
        });
      }),
    );
  }
}
