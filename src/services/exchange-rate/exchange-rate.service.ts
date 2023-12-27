import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { catchError, map, Observable, throwError } from 'rxjs';
import { LogtailService } from '../logtail/logtail.service';

@Injectable()
export class ExchangeRateService {
  constructor(
    private readonly httpService: HttpService,
    private readonly logtailService: LogtailService,
  ) {}

  public getExchangeRate(
    baseCurrency: string,
    quoteCurrency: string,
  ): Observable<any> {
    return this.httpService
      .get(
        `https://api.fxratesapi.com/latest?base=${baseCurrency}&currencies=${quoteCurrency}&resolution=1m&amount=1&places=6&format=json`,
      )
      .pipe(
        map((res) => {
          if (res.data && res.data.rates && baseCurrency !== quoteCurrency) {
            return {
              [quoteCurrency]: res.data.rates[`${quoteCurrency}`],
            };
          } else if (baseCurrency === quoteCurrency) {
            return { [quoteCurrency]: 1 };
          }
        }),
        catchError((e) => {
          this.logtailService.logError(
            'getting exchange rates are failed',
            'exchangeRates',
            e,
          );
          return throwError(e);
        }),
      );
  }
}
