import { Injectable } from '@nestjs/common';
import { AlternativeCountryNames } from '../../enum/alternative-country-names';

@Injectable()
export class CountryNameService {
  public checkAlternativeCountryName(countryName: string): string {
    for (const country of AlternativeCountryNames) {
      if (country.alternatives.includes(countryName)) {
        return country.standard;
      }
    }
    return countryName;
  }
}
