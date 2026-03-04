import { IsString, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class ActionPlanItemDto {
  @IsString()
  activity: string;

  @IsString()
  owner: string;

  @IsString()
  deadline: string;

  @IsString()
  successMeasurement: string;

  @IsString()
  goal: string;
}

export class CreateCoachingLogDto {
  @IsString()
  auditId: string;

  @IsOptional()
  @IsString()
  supervisorRemarks?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ActionPlanItemDto)
  actionPlan?: ActionPlanItemDto[];
}

export class UpdateCoachingLogDto {
  @IsOptional()
  @IsString()
  supervisorRemarks?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ActionPlanItemDto)
  actionPlan?: ActionPlanItemDto[];

  @IsOptional()
  @IsString()
  agentCommitment?: string;
}
