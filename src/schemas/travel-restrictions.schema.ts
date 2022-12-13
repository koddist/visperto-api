import { Prop, raw, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TravelRestrictionsDocument = TravelRestrictions & Document;

@Schema({ collection: 'travelRestrictions' })
export class TravelRestrictions extends Document {
  @Prop(
    raw({
      name: { type: String },
      code: { type: String },
      areaType: { type: String },
    }),
  )
  area: Record<string, any>;

  @Prop(
    raw({
      lastUpdate: { type: String },
      text: { type: String },
    }),
  )
  summary: Record<string, any>;

  @Prop(
    raw({
      text: { type: String },
    }),
  )
  diseaseRiskLevel: Record<string, any>;

  @Prop(
    raw({
      governmentSiteLink: { type: String },
    }),
  )
  dataSources: Record<string, any>;

  @Prop(
    raw({
      transportation: raw({
        lastUpdate: { type: String },
        text: { type: String },
        transportationType: { type: String },
        isBanned: { type: String },
      }),
      declarationDocuments: raw({
        lastUpdate: { type: String },
        text: { type: String },
        isRequired: { type: String },
        travelDocumentationLink: { type: String },
        healthDocumentationLink: { type: String },
      }),
      entry: raw({
        lastUpdate: { type: String },
        text: { type: String },
        ban: { type: String },
        referenceLink: { type: String },
      }),
      travelVaccination: raw({
        lastUpdate: { type: String },
        isRequired: { type: String },
        referenceLink: { type: String },
        details: { type: String },
        vaccinatedTravellers: raw({
          policy: { type: String },
          exemptions: { type: String },
        }),
      }),
      masks: raw({
        lastUpdate: { type: String },
        text: { type: String },
        isRequired: { type: String },
      }),
    }),
  )
  areaAccessRestriction: Record<string, any>;
}

export const TravelRestrictionsSchema =
  SchemaFactory.createForClass(TravelRestrictions);
