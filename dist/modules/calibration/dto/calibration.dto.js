"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetMyCalibrationTasksDto = exports.GetSessionsQueryDto = exports.CalculateResultsDto = exports.BulkSubmitScoresDto = exports.SubmitCalibrationScoreDto = exports.ValidateAnchorDto = exports.RandomizeAccuracyDto = exports.RandomizeRepeatabilityDto = exports.RandomizeReproducibilityDto = exports.RandomizeTicketsDto = exports.UpdateCalibrationSessionDto = exports.CreateCalibrationSessionDto = exports.CalibrationParticipantRole = exports.CalibrationAnchorStatus = exports.CalibrationTicketType = exports.CalibrationSessionStatus = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
var CalibrationSessionStatus;
(function (CalibrationSessionStatus) {
    CalibrationSessionStatus["SCHEDULED"] = "SCHEDULED";
    CalibrationSessionStatus["ANCHOR_PENDING"] = "ANCHOR_PENDING";
    CalibrationSessionStatus["SCORING_OPEN"] = "SCORING_OPEN";
    CalibrationSessionStatus["SCORING_CLOSED"] = "SCORING_CLOSED";
    CalibrationSessionStatus["COMPLETED"] = "COMPLETED";
    CalibrationSessionStatus["CANCELLED"] = "CANCELLED";
})(CalibrationSessionStatus || (exports.CalibrationSessionStatus = CalibrationSessionStatus = {}));
var CalibrationTicketType;
(function (CalibrationTicketType) {
    CalibrationTicketType["REPRODUCIBILITY"] = "REPRODUCIBILITY";
    CalibrationTicketType["REPEATABILITY"] = "REPEATABILITY";
    CalibrationTicketType["ACCURACY"] = "ACCURACY";
})(CalibrationTicketType || (exports.CalibrationTicketType = CalibrationTicketType = {}));
var CalibrationAnchorStatus;
(function (CalibrationAnchorStatus) {
    CalibrationAnchorStatus["PENDING_VALIDATION"] = "PENDING_VALIDATION";
    CalibrationAnchorStatus["VALIDATED"] = "VALIDATED";
    CalibrationAnchorStatus["REJECTED"] = "REJECTED";
    CalibrationAnchorStatus["NON_MATCHING"] = "NON_MATCHING";
})(CalibrationAnchorStatus || (exports.CalibrationAnchorStatus = CalibrationAnchorStatus = {}));
var CalibrationParticipantRole;
(function (CalibrationParticipantRole) {
    CalibrationParticipantRole["RATER"] = "RATER";
    CalibrationParticipantRole["QA_TL"] = "QA_TL";
    CalibrationParticipantRole["AM_SDM"] = "AM_SDM";
})(CalibrationParticipantRole || (exports.CalibrationParticipantRole = CalibrationParticipantRole = {}));
class CreateCalibrationSessionDto {
    constructor() {
        this.reproducibilityTicketCount = 4;
        this.repeatabilityTicketCount = 2;
        this.accuracyTicketCount = 6;
        this.highScoreMin = 95;
        this.highScoreMax = 100;
        this.midScoreMin = 88;
        this.midScoreMax = 94;
        this.lowScoreMin = 0;
        this.lowScoreMax = 87;
        this.targetRnR = 15.0;
        this.targetAccuracy = 5.0;
    }
}
exports.CreateCalibrationSessionDto = CreateCalibrationSessionDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCalibrationSessionDto.prototype, "campaignId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCalibrationSessionDto.prototype, "title", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCalibrationSessionDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateCalibrationSessionDto.prototype, "scheduledAt", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], CreateCalibrationSessionDto.prototype, "reproducibilityTicketCount", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], CreateCalibrationSessionDto.prototype, "repeatabilityTicketCount", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], CreateCalibrationSessionDto.prototype, "accuracyTicketCount", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], CreateCalibrationSessionDto.prototype, "highScoreMin", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], CreateCalibrationSessionDto.prototype, "highScoreMax", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], CreateCalibrationSessionDto.prototype, "midScoreMin", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], CreateCalibrationSessionDto.prototype, "midScoreMax", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], CreateCalibrationSessionDto.prototype, "lowScoreMin", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], CreateCalibrationSessionDto.prototype, "lowScoreMax", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateCalibrationSessionDto.prototype, "targetRnR", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateCalibrationSessionDto.prototype, "targetAccuracy", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], CreateCalibrationSessionDto.prototype, "raterUserIds", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCalibrationSessionDto.prototype, "qaTlUserId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCalibrationSessionDto.prototype, "amSdmUserId", void 0);
class UpdateCalibrationSessionDto {
}
exports.UpdateCalibrationSessionDto = UpdateCalibrationSessionDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateCalibrationSessionDto.prototype, "title", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateCalibrationSessionDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], UpdateCalibrationSessionDto.prototype, "scheduledAt", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(CalibrationSessionStatus),
    __metadata("design:type", String)
], UpdateCalibrationSessionDto.prototype, "status", void 0);
class RandomizeTicketsDto {
}
exports.RandomizeTicketsDto = RandomizeTicketsDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RandomizeTicketsDto.prototype, "sessionId", void 0);
class RandomizeReproducibilityDto {
}
exports.RandomizeReproducibilityDto = RandomizeReproducibilityDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RandomizeReproducibilityDto.prototype, "sessionId", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], RandomizeReproducibilityDto.prototype, "ticketCount", void 0);
class RandomizeRepeatabilityDto {
}
exports.RandomizeRepeatabilityDto = RandomizeRepeatabilityDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RandomizeRepeatabilityDto.prototype, "sessionId", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], RandomizeRepeatabilityDto.prototype, "ticketCount", void 0);
class RandomizeAccuracyDto {
    constructor() {
        this.highCount = 2;
        this.midCount = 2;
        this.lowCount = 2;
    }
}
exports.RandomizeAccuracyDto = RandomizeAccuracyDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RandomizeAccuracyDto.prototype, "sessionId", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], RandomizeAccuracyDto.prototype, "highCount", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], RandomizeAccuracyDto.prototype, "midCount", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], RandomizeAccuracyDto.prototype, "lowCount", void 0);
class ValidateAnchorDto {
}
exports.ValidateAnchorDto = ValidateAnchorDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ValidateAnchorDto.prototype, "anchorId", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], ValidateAnchorDto.prototype, "approved", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ValidateAnchorDto.prototype, "rejectionReason", void 0);
class SubmitCalibrationScoreDto {
}
exports.SubmitCalibrationScoreDto = SubmitCalibrationScoreDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SubmitCalibrationScoreDto.prototype, "sessionId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SubmitCalibrationScoreDto.prototype, "ticketId", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], SubmitCalibrationScoreDto.prototype, "totalScore", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], SubmitCalibrationScoreDto.prototype, "scoreDetails", void 0);
class BulkSubmitScoresDto {
}
exports.BulkSubmitScoresDto = BulkSubmitScoresDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], BulkSubmitScoresDto.prototype, "sessionId", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => SubmitCalibrationScoreDto),
    __metadata("design:type", Array)
], BulkSubmitScoresDto.prototype, "scores", void 0);
class CalculateResultsDto {
}
exports.CalculateResultsDto = CalculateResultsDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CalculateResultsDto.prototype, "sessionId", void 0);
class GetSessionsQueryDto {
    constructor() {
        this.page = 1;
        this.limit = 20;
    }
}
exports.GetSessionsQueryDto = GetSessionsQueryDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GetSessionsQueryDto.prototype, "campaignId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(CalibrationSessionStatus),
    __metadata("design:type", String)
], GetSessionsQueryDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], GetSessionsQueryDto.prototype, "page", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], GetSessionsQueryDto.prototype, "limit", void 0);
class GetMyCalibrationTasksDto {
}
exports.GetMyCalibrationTasksDto = GetMyCalibrationTasksDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(CalibrationSessionStatus),
    __metadata("design:type", String)
], GetMyCalibrationTasksDto.prototype, "status", void 0);
//# sourceMappingURL=calibration.dto.js.map