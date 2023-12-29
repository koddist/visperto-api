import { Injectable } from '@nestjs/common';
import { AlternativeCountryNames } from '../../enum/alternative-country-names';

@Injectable()
export class CountryNameService {
  public checkAlternativeCountryName(countryName: string) {
    for (const alternativeName of AlternativeCountryNames) {
      const foundAlternative = alternativeName.alternatives.find((alt) =>
        alt.toLowerCase().includes(countryName.toLowerCase()),
      );
      if (foundAlternative) {
        return alternativeName.standard;
      }
    }
    return countryName;
  }
}
