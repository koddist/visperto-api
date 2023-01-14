import { Injectable } from '@nestjs/common';
import { Logtail } from '@logtail/node';

@Injectable()
export class LogtailService {
  private readonly logtail = new Logtail(process.env.LOGTAIL_TOKEN);

  public logError(message: string, context: string, error: string) {
    return this.logtail.error(message, {
      details: {
        type: context,
        message: error,
      },
    });
  }

  public logInfo(message: string) {
    return this.logtail.info(message);
  }
}
