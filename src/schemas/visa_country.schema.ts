import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import {
  VisaRequirementDocument,
  VisaRequirementSchema,
} from './visa_requirement.schema';

export type VisaCountryDocument = VisaCountry & Document;

@Schema({ collection: 'visaRequirements' })
export class VisaCountry extends Document {
  @Prop({ index: true, required: true })
  name: string;

  @Prop([{ type: VisaRequirementSchema, required: true, _id: false }])
  visaRequirements: VisaRequirementDocument[];
}

export const VisaCountrySchema = SchemaFactory.createForClass(VisaCountry);
