import { Controller, Get } from '@nestjs/common';
import { VisaRequirementsService } from './services/visa-requirements.service';

@Controller()
export class AppController {
  constructor(private readonly appService: VisaRequirementsService) {}

  @Get()
  getCountries() {
    return this.appService.updateCountriesData();
  }
}
