import * as puppeteer from 'puppeteer';
import { Cron } from '@nestjs/schedule';
import { Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { Country, CountryDocument } from '../../schemas/country.schema';
import {
  VisaCountry,
  VisaCountryDocument,
} from '../../schemas/visa_country.schema';
import { VisaCountryDto } from '../../dto/visa_country.dto';
import { VisaCountriesEnum } from '../../enum/visa-countries.enum';
import { Logtail } from '@logtail/node';

@Injectable()
export class VisaRequirementsService {
  constructor(
    @InjectModel(VisaCountry.name)
    private readonly visaCountryModel: Model<VisaCountryDocument>,
    @InjectModel(Country.name)
    private readonly countryModel: Model<CountryDocument>,
    @InjectConnection() private connection: Connection,
  ) {}

  private readonly logtail = new Logtail(process.env.LOGTAIL_TOKEN);

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

  // Every year at 03:00 on day-of-month 1 in January, April, July, and October
  @Cron('00 03 1 1,4,7,10 *', {
    name: 'update_visa_reqs',
    timeZone: 'Europe/Paris',
  })
  public async updateVisaReqsData(): Promise<any> {
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
            .dropCollection('visaRequirements')
            .then(() => {
              return countries.forEach(async (country: VisaCountryDto) => {
                const countryData = new this.visaCountryModel(country);
                return await countryData.save();
              });
            })
            .then(() =>
              this.logtail.info(
                'Countries visa requirements data has been successfully updated.',
              ),
            );
        }
      })
      .catch((e) => {
        this.logtail.error(
          'visa requirements data of countries are not updated',
          {
            details: {
              type: 'visaRequirements',
              message: e,
            },
          },
        );
      });
  }
}
