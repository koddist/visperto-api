import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getCountries() {
    // return this.appService.getAllVisaReqs();
    return this.appService.updateCountriesData();
  }
}
