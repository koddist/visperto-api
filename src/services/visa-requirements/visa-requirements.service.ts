import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { Country, CountryDocument } from '../../schemas/country.schema';
import {
  VisaCountry,
  VisaCountryDocument,
} from '../../schemas/visa_country.schema';
import { VisaCountryDto } from '../../dto/visa_country.dto';
import { VisaCountriesEnum } from '../../enum/visa-countries.enum';
import { LogtailService } from '../logtail/logtail.service';
import { CountryNameService } from '../country-name/country-name.service';

@Injectable()
export class VisaRequirementsService {
  constructor(
    @InjectModel(VisaCountry.name)
    private readonly visaCountryModel: Model<VisaCountryDocument>,
    @InjectModel(Country.name)
    private readonly countryModel: Model<CountryDocument>,
    @InjectConnection() private connection: Connection,
    private readonly logtailService: LogtailService,
    private readonly countryNameService: CountryNameService,
  ) {}

  private async getUrls(): Promise<string[]> {
    const browser = await puppeteer
      .use(StealthPlugin())
      .launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();

    await page
      .goto('https://www.passportindex.org', {
        waitUntil: 'networkidle2',
      })
      .catch((e) =>
        this.logtailService.logError(
          'getting urls from passports list is failed',
          'visaRequirements',
          e,
        ),
      );

    await page.waitForSelector('#passports');

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

  private async getVisaReqByUrl(url: string) {
    const browser = await puppeteer
      .use(StealthPlugin())
      .launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();

    // Find alternative country names and replace them with the common ones
    await page.exposeFunction(
      'checkAlternativeName',
      async (countryName: string) => {
        return this.countryNameService.checkAlternativeCountryName(countryName);
      },
    );

    await page
      .goto(url, { waitUntil: 'networkidle2' })
      .catch((e) =>
        this.logtailService.logError(
          `getting visa requirements from ${url} is failed`,
          'visaRequirements',
          e,
        ),
      );

    return await page
      .evaluate(async () => {
        const countryName = await (window as any).checkAlternativeName(
          document.querySelector('.psprt-dashboard-title').childNodes[1]
            .childNodes[2].textContent,
        );
        const visaReqsTable = document.querySelector(
          '.psprt-dashboard-table tbody',
        ).children;

        const visaCountry = {
          name: countryName,
          visaRequirements: [],
        };

        for (const country of Array.from(visaReqsTable)) {
          const visaReqs = {
            country: await (window as any).checkAlternativeName(
              (country.childNodes[1] as HTMLElement).outerText,
            ),
            visa: country.childNodes[3].textContent
              .split(/""|\/|days|day/)
              .map((i) => i.trim())
              .filter((c) => c !== '')
              .filter((i) => isNaN(Number(i))),
            days: Number(
              country.childNodes[3].textContent
                .split(/""|\/|days|day/)
                .map((i) => i.trim())
                .filter((c) => c !== '')
                .filter((i) => !isNaN(Number(i)))[0],
            ),
          };
          visaCountry.visaRequirements.push(visaReqs);
        }
        return visaCountry;
      })
      .finally(() => {
        browser.close();
      });
  }

  private async getAllVisaReqs() {
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
  public async updateVisaReqsData(): Promise<void> {
    try {
      const countries = await this.getAllVisaReqs();

      const isCountriesLengthEqual =
        countries.length === VisaCountriesEnum.LENGTH_OF_COUNTRIES;
      const isVisaStatusExist = this.validateCountryData(
        countries,
        VisaCountriesEnum.TEST_COUNTRY,
        VisaCountriesEnum.TEST_TRAVEL_TO_COUNTRY,
        VisaCountriesEnum.TEST_VISA_STATUS,
      );

      if (isCountriesLengthEqual && isVisaStatusExist) {
        await this.connection.db.dropCollection('visaRequirements');

        for (const country of countries) {
          const countryData = new this.visaCountryModel(country);
          await countryData.save();
        }

        await this.logtailService.logInfo(
          'Countries visa requirements data has been successfully updated.',
        );
      }
    } catch (error) {
      await this.logtailService.logError(
        'Visa requirements data of countries are not updated',
        'visaRequirements',
        error,
      );
    }
  }

  public async getVisaReqByCountry(
    travelCountryName: string,
    passCountryId: string,
  ) {
    const visaCountry: VisaCountryDto = await this.visaCountryModel.findById(
      passCountryId,
    );

    if (!visaCountry) {
      throw new NotFoundException('Visa country not found');
    }

    const visaReq = visaCountry.visaRequirements.find(
      (visaReq) => visaReq.country === travelCountryName,
    );
    if (!visaReq) {
      throw new NotFoundException('Visa requirement not found');
    }

    return visaReq;
  }
}
