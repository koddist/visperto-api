import { IsArray, IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class VisaRequirementDto {
  @IsString()
  @IsNotEmpty()
  readonly country: string;

  @IsArray()
  readonly visa: string[];

  @IsNumber()
  readonly days: number;
}
