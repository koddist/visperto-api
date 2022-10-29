import { IsArray, IsNotEmpty, IsString } from "class-validator";
import { VisaRequirementDto } from "./visa_requirement.dto";

export class VisaCountryDto {
    @IsString()
    @IsNotEmpty()
    readonly name: string;

    @IsArray()
    readonly visa_requirements: VisaRequirementDto[];
}