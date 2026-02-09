import { IsString, IsNotEmpty, IsOptional, IsObject } from 'class-validator';

export class AnalyzeRequestDto {
    @IsString()
    @IsNotEmpty()
    prompt: string;

    @IsObject()
    @IsOptional()
    filters?: Record<string, any>;
}
