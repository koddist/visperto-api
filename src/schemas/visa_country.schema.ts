import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import {
  VisaRequirementDocument,
  VisaRequirementSchema,
} from './visa_requirement.schema';

export type VisaCountryDocument = VisaCountry & Document;

@Schema({ collection: 'visa_countries' })
export class VisaCountry extends Document {
  @Prop({ index: true, required: true })
  name: string;

  @Prop([{ type: VisaRequirementSchema, required: true, _id: false }])
  visa_requirements: VisaRequirementDocument[]; // @TODO change property name to "visaRequirements"
}

export const VisaCountrySchema = SchemaFactory.createForClass(VisaCountry);
