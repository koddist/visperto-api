import { Controller, Get, Param, Query } from '@nestjs/common';
import { VisaRequirementsService } from './services/visa-requirements/visa-requirements.service';
import { CountriesService } from './services/countries/countries.service';
import { WeatherService } from './services/weather/weather.service';
import { TravelRestrictionsService } from './services/travel-restrictions/travel-restrictions.service';

@Controller()
export class AppController {
  constructor(
    private readonly visaRequirementsService: VisaRequirementsService,
    private readonly countriesService: CountriesService,
    private readonly weatherService: WeatherService,
    private readonly travelRestrictionsService: TravelRestrictionsService,
  ) {}

  @Get('countries')
  getListOfCountries() {
    return this.countriesService.getListOfCountries();
  }

  @Get('weather?')
  getWeather(@Query('lat') lat: number, @Query('long') long: number) {
    return this.weatherService.getWeather(lat, long);
  }

  @Get('visa_req?')
  getVisaReq(
    @Query('passport') passportCountryName: string,
    @Query('country') travelCountryID: string,
  ) {
    return this.visaRequirementsService.getVisaReqByCountry(
      passportCountryName,
      travelCountryID,
    );
  }

  @Get('country/:id')
  getCountryById(@Param('id') id: string) {
    return this.countriesService.getCountryById(id);
  }
}
