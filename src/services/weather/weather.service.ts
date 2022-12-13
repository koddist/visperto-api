import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { map, Observable } from 'rxjs';
import { WeatherInterface } from '../../interfaces/weather.interface';

@Injectable()
export class WeatherService {
  constructor(private readonly httpService: HttpService) {}

  public getWeather(
    latitude: number,
    longitude: number,
  ): Observable<WeatherInterface> {
    return this.httpService
      .get(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`,
      )
      .pipe(map((res) => res.data.current_weather));
  }
}
