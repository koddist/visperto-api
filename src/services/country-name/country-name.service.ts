import { Injectable } from '@nestjs/common';
import { AlternativeCountryNames } from '../../enum/alternative-country-names';

@Injectable()
export class CountryNameService {
  public checkAlternativeCountryName(countryName: string): Promise<string> {
    return new Promise((resolve) => {
      for (const country of AlternativeCountryNames) {
        const foundAlternative = country.alternatives.find(
          (altName) => altName === countryName,
        );
        if (foundAlternative) {
          resolve(country.standard);
        }
      }
      resolve(countryName);
    });
  }
}
