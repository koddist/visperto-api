import { Prop, raw, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type CountryDocument = Country & Document;

@Schema({ collection: 'countries' })
export class Country extends Document {

  @Prop(raw({
    common: { type: String },
    official: { type: String },
    nativeName: {
      eng: {
        official: { type: String },
        common: { type: String }
      }
    }
  }))
  name: string;

  @Prop([String])
  tld: string[]

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


}

export const CountrySchema = SchemaFactory.createForClass(Country);
