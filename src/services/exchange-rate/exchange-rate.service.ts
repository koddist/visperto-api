import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { catchError, map, Observable, throwError } from 'rxjs';

@Injectable()
export class ExchangeRateService {
  constructor(private readonly httpService: HttpService) {}

  public getExchangeRate(
    baseCurrency: string,
    quoteCurrency: string,
  ): Observable<any> {
    const headers = { 'Accept-Encoding': 'gzip,deflate,compress' };
    return this.httpService
      .get(`https://api.exchangerate.host/latest?base=${baseCurrency}`, {
        headers,
      })
      .pipe(
        map((res) => {
          if (res.data && res.data.rates) {
            return { [quoteCurrency]: res.data.rates[quoteCurrency] };
          } else {
            throw new Error('Invalid response from API');
          }
        }),
        catchError((e) => {
          return throwError(e);
        }),
      );
  }
}
