import { Prop, raw, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type CountryDocument = Country & Document;

@Schema({ collection: 'countries' })
export class Country extends Document {
  @Prop(
    raw({
      common: { type: String },
      official: { type: String },
    }),
  )
  name: Record<string, any>;

  @Prop(
    raw({
      timezone_offset: { type: Number },
      timezone_offset_with_dst: { type: Number },
    }),
  )
  timezone: Record<string, any>;

  @Prop([String])
  tld: string[];

  @Prop()
  cca2: string;

  @Prop()
  ccn3: string;

  @Prop()
  cca3: string;

  @Prop()
  cioc: string;

  @Prop()
  independent: boolean;

  @Prop()
  status: string;

  @Prop()
  unMember: boolean;

  @Prop({ type: MongooseSchema.Types.Mixed })
  currencies: Record<string, any>;

  @Prop(
    raw({
      root: { type: String },
      suffixes: { type: [String] },
    }),
  )
  idd: Record<string, any>;

  @Prop([String])
  capital: string[];

  @Prop({ type: MongooseSchema.Types.Mixed })
  languages: Record<string, any>;

  @Prop([String])
  timezones: string[];

  @Prop(
    raw({
      latlng: raw({
        0: { type: Number },
        1: { type: Number },
      }),
    }),
  )
  capitalInfo: Record<string, any>;

  @Prop(
    raw({
      png: { type: String },
      svg: { type: String },
    }),
  )
  flags: Record<string, any>;
}

export const CountrySchema = SchemaFactory.createForClass(Country);
