import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type VisaRequirementDocument = VisaRequirement & Document;

@Schema({ collection: 'visaRequirement' })
export class VisaRequirement extends Document {
  @Prop({ required: true })
  country: string;

  @Prop([String])
  visa: string[];

  @Prop({ default: 0 })
  days: number;
}

export const VisaRequirementSchema =
  SchemaFactory.createForClass(VisaRequirement);
