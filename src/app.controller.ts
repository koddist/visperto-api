import { Controller, Get, Param, Query } from '@nestjs/common';
import { VisaRequirementsService } from './services/visa-requirements/visa-requirements.service';
import { CountriesService } from './services/countries/countries.service';
import { WeatherService } from './services/weather/weather.service';
import { ExchangeRateService } from './services/exchange-rate/exchange-rate.service';
import { Country } from './schemas/country.schema';
import { CountryListItemInterface } from './interfaces/country-list-item.interface';
import { SelectedCountriesService } from './services/selected-countries/selected-countries.service';

@Controller()
export class AppController {
  constructor(
    private readonly visaRequirementsService: VisaRequirementsService,
    private readonly countriesService: CountriesService,
    private readonly weatherService: WeatherService,
    private readonly exchangeRateService: ExchangeRateService,
    private readonly selectedCountriesService: SelectedCountriesService,
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

  @Get('timezones')
  getTimezones() {
    return this.countriesService.updateCountriesTimezone();
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

  @Get('selected')
  getFeaturedCountries() {
    return this.selectedCountriesService.getSelectedCountriesImages();
  }

  @Get('time?')
  getTime(@Query('offset') timezoneOffset: number) {
    const offsetMinutes = Number(timezoneOffset) * 60;
    const now = new Date();
    const utcTime = new Date(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      now.getUTCHours(),
      now.getUTCMinutes(),
      now.getUTCSeconds(),
      now.getUTCMilliseconds(),
    );
    const targetTime = new Date(utcTime.getTime() + offsetMinutes * 60000);
    const formatted = targetTime.toISOString().replace('T', ' ').slice(0, -5);
    return { time: formatted };
  }

  @Get('update_countries_data')
  updateCountries() {
    return this.countriesService.updateCountries();
  }

  @Get('update_countries_visa_requirements')
  updateVisaRequirements() {
    return this.visaRequirementsService.updateVisaReqsData();
  }

  @Get('update_countries_timezone')
  updateTimezone() {
    return this.countriesService.updateCountriesTimezone();
  }
}
