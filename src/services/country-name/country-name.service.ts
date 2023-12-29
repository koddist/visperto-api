import { Injectable } from '@nestjs/common';
import { AlternativeCountryNames } from '../../enum/alternative-country-names';

@Injectable()
export class CountryNameService {
  public checkAlternativeCountryName(countryName: string) {
    for (const country of AlternativeCountryNames) {
      const foundAlternative = country.alternatives.find(
        (altName) => altName === countryName,
      );
      if (foundAlternative) {
        return country.standard;
      }
    }
    return countryName;
  }
}
