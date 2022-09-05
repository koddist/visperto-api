import { Injectable } from '@nestjs/common';
import * as puppeteer from 'puppeteer';

@Injectable()
export class AppService {

    public async getUrls(): Promise<string[]> {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.goto('https://www.passportindex.org', {waitUntil: 'networkidle2'});

        return await page.evaluate(() => {
            const passports = Array.from(document.querySelector('#passports').children);
            const links = [];

            passports.forEach(pass => {
                (pass.childNodes[0] as HTMLAnchorElement).click();
                if (document.querySelector('.psprt-view-dashboard')) {
                    links.push((document.querySelector('.psprt-view-dashboard') as HTMLAnchorElement).href);
                }
            })

            return links;
        }).finally(() => {
            browser.close();
        });
    }

    public async getAllVisaReqs() {
        const urls = await this.getUrls();
        const countries = [];

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

    public async getVisaReqByUrl(url) {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.goto(url, {waitUntil: 'networkidle2'});

        return await page.evaluate(() => {
            const visaCountry = {
                name: document.querySelector('.psprt-dashboard-title').childNodes[1].childNodes[2].textContent,
                visa_requirements: []
            }

            Array
                .from(document.querySelector('.psprt-dashboard-table tbody').children)
                .forEach(country => {
                    const visaReqs = {
                        country: (country.childNodes[0] as HTMLElement).children[1].textContent,
                        visa: country.childNodes[1].textContent.split(/""|\/|days|day/).map(i => i.trim()).filter(c => c !== '').filter(i => isNaN(Number(i))),
                        days: Number(country.childNodes[1].textContent.split(/""|\/|days|day/).map(i => i.trim()).filter(c => c !== '').filter(i => !isNaN(Number(i)))[0])
                    }
                    visaCountry.visa_requirements.push(visaReqs);
                })

            return visaCountry;
        }).finally(() => {
            browser.close();
        })
    }
}
