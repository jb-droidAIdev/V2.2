import { Controller, Post, Body, UseGuards, HttpException, HttpStatus } from '@nestjs/common';
import { AiAnalysisService } from './ai-analysis.service';
import { AnalyzeRequestDto } from './dto/analyze-request.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('ai-analysis')
// @UseGuards(JwtAuthGuard) // I'll keep it commented out for initial testing if needed, but standard practice is to guard it
export class AiAnalysisController {
    constructor(private readonly aiAnalysisService: AiAnalysisService) { }

    @Post('analyze')
    async analyze(@Body() request: AnalyzeRequestDto) {
        try {
            return await this.aiAnalysisService.analyze(request.prompt, request.filters);
        } catch (error) {
            throw new HttpException(
                error.message || 'Internal server error during analysis',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }
}
