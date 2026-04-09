import { IsString, IsObject, IsBoolean, IsOptional, IsInt } from 'class-validator';

export interface PolicyRule {
    type: string;
    value?: any;
    enabled?: boolean;
    priority?: number;
}

export class CreatePolicyDto {
    @IsString()
    name!: string;

    @IsObject()
    rule!: PolicyRule;
}

export class UpdatePolicyDto {
    @IsObject()
    @IsOptional()
    rule?: PolicyRule;

    @IsBoolean()
    @IsOptional()
    enabled?: boolean;

    @IsInt()
    @IsOptional()
    priority?: number;
}