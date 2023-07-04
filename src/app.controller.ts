import { Controller, Get, Param, Query } from '@nestjs/common';
import { VisaRequirementsService } from './services/visa-requirements/visa-requirements.service';
import { CountriesService } from './services/countries/countries.service';
import { WeatherService } from './services/weather/weather.service';
import { TravelRestrictionsService } from './services/travel-restrictions/travel-restrictions.service';
import { ExchangeRateService } from './services/exchange-rate/exchange-rate.service';
import { Country } from './schemas/country.schema';
import { CountryListItemInterface } from './interfaces/country-list-item.interface';

@Controller()
export class AppController {
  constructor(
    private readonly visaRequirementsService: VisaRequirementsService,
    private readonly countriesService: CountriesService,
    private readonly weatherService: WeatherService,
    private readonly travelRestrictionsService: TravelRestrictionsService,
    private readonly exchangeRateService: ExchangeRateService,
  ) {}

  @Get('')
  welcome() {
    return { message: 'Hi 👋🏻' };
  }

  @Get('countries')
  getListOfCountries(): Promise<CountryListItemInterface[]> {
    return this.countriesService.getListOfCountries();
  }

  @Get('countries_with_details')
  getListOfCountriesWithDetails(): Promise<Country[]> {
    return this.countriesService.getListOfCountriesWithDetails();
  }

  @Get('country/:id')
  getCountryById(@Param('id') id: string): Promise<Country> {
    return this.countriesService.getCountryById(id);
  }

  @Get('restriction/:id')
  getTravelRestrictionById(@Param('id') id: string) {
    return this.travelRestrictionsService.getTravelRestrictionById(id);
  }

  @Get('visa_req?')
  getVisaReq(
    @Query('travelCountry') travelCountryName: string,
    @Query('passCountryId') passCountryId: string,
  ) {
    return this.visaRequirementsService.getVisaReqByCountry(
      travelCountryName,
      passCountryId,
    );
  }

  @Get('weather?')
  getWeather(@Query('lat') lat: number, @Query('long') long: number) {
    return this.weatherService.getWeather(lat, long);
  }

  @Get('exchange?')
  getExchangeRate(@Query('base') base: string, @Query('quote') quote: string) {
    return this.exchangeRateService.getExchangeRate(base, quote);
  }

  @Get('time?')
  getTime(@Query('utc') timezoneOffset: string) {
    const offsetRegex = /([-+])(\d{2}):(\d{2})/;
    const [, sign, hoursStr, minutesStr] = timezoneOffset.match(offsetRegex);
    const hours = Number(hoursStr);
    const minutes = Number(minutesStr);

    const currentDate = new Date();
    const targetOffset = hours * 60 + minutes;
    const currentDateMinutes = currentDate.getMinutes();
    const currentTimeZoneOffset = currentDate.getTimezoneOffset();
    const date = currentDate.setMinutes(
      currentDateMinutes +
        (sign === '+' ? targetOffset : -targetOffset) +
        currentTimeZoneOffset,
    );

    return { time: date };
  }
}
