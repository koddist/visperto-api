import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { catchError, map, Observable } from 'rxjs';

@Injectable()
export class ExchangeRateService {
  constructor(private readonly httpService: HttpService) {}

  public getExchangeRate(baseCurrency: string, quoteCurrency: string) {
    return this.httpService
      .get(`https://api.exchangerate.host/latest?base=${baseCurrency}`)
      .pipe(
        map((res) => {
          return { [quoteCurrency]: res.data.rates[quoteCurrency] };
        }),
        catchError((e) => {
          console.log(e);
          return e;
        }),
      );
  }
}
