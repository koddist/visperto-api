import { ForbiddenException, Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectModel } from '@nestjs/mongoose';
import { Country, CountryDocument } from '../../schemas/country.schema';
import { Model } from 'mongoose';
import * as process from 'process';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class SelectedCountriesService {
  constructor(
    private readonly httpService: HttpService,
    @InjectModel(Country.name)
    private readonly countryModel: Model<CountryDocument>,
  ) {}

  private async getImageUrl(countryName: string): Promise<any> {
    const headersRequest = {
      Authorization: `Client-ID ${process.env.UNSPLASH_API_KEY}`,
    };

    return await firstValueFrom(
      this.httpService.get(
        `https://api.unsplash.com/photos/random?query=${countryName}&orientation=landscape`,
        { headers: headersRequest },
      ),
    )
      .then((response) => {
        const imageUrl = response.data.urls.small;
        const authorProfile = response.data.user.links.html;
        const author = response.data.user.name;
        const location = response.data.location.country;

        return { countryName, imageUrl, authorProfile, author, location };
      })
      .catch((e) => {
        throw new ForbiddenException(e.response.data);
      });
  }

  private shuffleCountries = (countries: string[]) => {
    for (let i = countries.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [countries[i], countries[j]] = [countries[j], countries[i]];
    }
    return countries;
  };

  public async getSelectedCountriesImages(): Promise<any[]> {
    const countries: string[] = await this.countryModel.distinct('name.common');
    const shuffledCountries = this.shuffleCountries(countries);
    const randomCountries = shuffledCountries.slice(0, 4);

    const countryImages: any[] = [];
    for (const country of randomCountries) {
      const countryImage = await this.getImageUrl(country);
      countryImages.push(countryImage);
    }

    return countryImages;
  }
}
