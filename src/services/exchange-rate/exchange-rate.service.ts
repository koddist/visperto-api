import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { catchError, map, Observable, throwError } from 'rxjs';
import { LogtailService } from '../logtail/logtail.service';

@Injectable()
export class ExchangeRateService {
  private readonly apiAccessKey = 'c0e18f321af8a40b013a12468e0a1268';
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
        `http://api.exchangerate.host/live?access_key=${this.apiAccessKey}&source=${baseCurrency}`,
      )
      .pipe(
        map((res) => {
          if (res.data && res.data.quotes && baseCurrency !== quoteCurrency) {
            return {
              [quoteCurrency]:
                res.data.quotes[`${baseCurrency}${quoteCurrency}`],
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
