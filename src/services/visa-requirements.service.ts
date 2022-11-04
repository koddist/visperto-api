import { Injectable, NotFoundException } from "@nestjs/common";
import * as puppeteer from 'puppeteer';
import { InjectConnection, InjectModel } from "@nestjs/mongoose";
import { VisaCountry, VisaCountryDocument } from "../schemas/visa_country.schema";
import { Connection, Model } from "mongoose";
import { VisaCountryDto } from "../dto/visa_country.dto";
import { Cron } from "@nestjs/schedule";

export enum VisaCountriesEnum {
    LENGTH_OF_COUNTRIES = 199,
    TEST_COUNTRY = 'Israel',
    TEST_TRAVEL_TO_COUNTRY = 'Iran',
    TEST_VISA_STATUS = 'not admitted'
}

@Injectable()
export class VisaRequirementsService {

    constructor(
        @InjectModel(VisaCountry.name) private readonly visaCountryModel: Model<VisaCountryDocument>,
        @InjectConnection() private connection: Connection
    ) {}

    public async getUrls(): Promise<string[]> {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();

        await page.goto(
            'https://www.passportindex.org',
            { waitUntil: 'networkidle2' });

        return await page.evaluate(() => {
            const passportsList = Array.from(document.querySelector('#passports').children)
              .slice(75, 85); // @TODO remove slice
            const passportDashboardButton = document.querySelector('.psprt-view-dashboard');
            const links = [];

            passportsList.forEach(pass => {
                (pass.childNodes[0] as HTMLAnchorElement).click();
                if (passportDashboardButton) {
                    links.push((passportDashboardButton as HTMLAnchorElement).href);
                }
            })

            return links;
        }).finally(() => {
            browser.close();
        });
    }

    private validateCountryData(
        countries: VisaCountryDto[],
        countryName: string,
        travelToCountry: string,
        visaStatus: 'not admitted' | 'visa required'
    ) {
        return countries
            .filter(country => country.name === countryName)[0].visa_requirements
            .filter(travel => travel.country === travelToCountry)[0].visa
            .includes(visaStatus);
    }

    public async getVisaReqByUrl(url) {
        const browser = await puppeteer.launch();
        const page = await browser.newPage()

        await page.goto(url, {waitUntil: 'networkidle2'});

        return await page.evaluate(() => {
            const countryName = document.querySelector('.psprt-dashboard-title').childNodes[1].childNodes[2].textContent;
            const visaReqsTable = document.querySelector('.psprt-dashboard-table tbody').children;

            const visaCountry = {
                name: countryName,
                visa_requirements: []
            }

            Array
                .from(visaReqsTable)
                .forEach(country => {
                    const visaReqs = {
                        country: (country.childNodes[0] as HTMLElement).children[1].textContent,
                        visa: country.childNodes[1].textContent
                            .split(/""|\/|days|day/)
                            .map(i => i.trim())
                            .filter(c => c !== '')
                            .filter(i => isNaN(Number(i))),
                        days: Number(country.childNodes[1].textContent
                            .split(/""|\/|days|day/)
                            .map(i => i.trim())
                            .filter(c => c !== '')
                            .filter(i => !isNaN(Number(i)))[0])
                    }
                    visaCountry.visa_requirements.push(visaReqs);
                })

            return visaCountry;
        }).finally(() => {
            browser.close();
        })
    }

    public async getAllVisaReqs() {
        const urls = await this.getUrls();
        const countries: VisaCountryDto[] = [];

        return new Promise(async resolve => {
            for (const url of urls) {
                await this.getVisaReqByUrl(url).then((visaReq) => {
                    countries.push(visaReq);
                    if (urls.length === countries.length) {
                        resolve(true);
                    }
                })
            }
        }).then(() => {
            return countries;
        })
    }

    // Every year at 03:00 on day-of-month 1 in July and January.
    @Cron('00 03 1 7,1 *', {
        name: 'update_visa_requirements',
        timeZone: 'Europe/Paris'
    })
    public async updateCountriesData() {
        await this.getAllVisaReqs()
            .then((countries) => {
                const isCountriesLengthEqual = countries.length === VisaCountriesEnum.LENGTH_OF_COUNTRIES;
                const isVisaStatusExist = this.validateCountryData(
                    countries,
                    VisaCountriesEnum.TEST_COUNTRY,
                    VisaCountriesEnum.TEST_TRAVEL_TO_COUNTRY,
                    VisaCountriesEnum.TEST_VISA_STATUS);

                if (isCountriesLengthEqual && isVisaStatusExist) {
                    this.connection.db.dropCollection(process.env.MONGODB_COLLECTION)
                        .then(() => {
                            countries.forEach(async (country: VisaCountryDto) => {
                                const countryData = new this.visaCountryModel(country);
                                return await countryData.save()
                            })
                        });
                }
            })
    }

    public async getCountries() {
        return this.visaCountryModel.distinct('name').then((countries) => {
            countries.forEach(country => {

            })
        });
    }
}
