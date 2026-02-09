import { AiAnalysisService } from './ai-analysis.service';
import { AnalyzeRequestDto } from './dto/analyze-request.dto';
export declare class AiAnalysisController {
    private readonly aiAnalysisService;
    constructor(aiAnalysisService: AiAnalysisService);
    analyze(request: AnalyzeRequestDto): Promise<{
        insight: any;
        sql: any;
        data: any[];
        count: number;
    }>;
}
