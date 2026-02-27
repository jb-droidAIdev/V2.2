import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  UseGuards,
  Delete,
  Req,
  Query,
} from '@nestjs/common';
import { FormsService } from './forms.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions/permissions.guard';
import { Permissions } from '../auth/permissions/permissions.decorator';
import { Permission } from '../auth/permissions/permissions.service';

@Controller('forms')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class FormsController {
  constructor(private readonly formsService: FormsService) {}

  // ──────────────────────────────────────────────────────────────
  // IMPORTANT: Static routes MUST come before wildcard :id routes.
  // NestJS matches routes top-to-bottom; placing :id first would
  // swallow every static segment (drafts, available, versions/:vid).
  // ──────────────────────────────────────────────────────────────

  // List all published/archived forms — any authenticated user
  @Get()
  findAll(@Query('archived') archived?: string) {
    return this.formsService.findAll(archived === 'true');
  }

  // List draft forms — any authenticated user with PAGE_FORMS access
  @Get('drafts')
  getDrafts() {
    return this.formsService.getDrafts();
  }

  // Find forms available for a campaign/team — any authenticated user
  @Get('available')
  findAvailable(
    @Query('campaignId') campaignId?: string,
    @Query('teamName') teamName?: string,
  ) {
    return this.formsService.findByCampaignOrTeam(campaignId, teamName);
  }

  // Publish a version — static sub-path before :id — requires FORM_PUBLISH
  @Permissions(Permission.FORM_PUBLISH)
  @Patch('versions/:vid/publish')
  publishVersion(@Param('vid') vid: string) {
    return this.formsService.publishVersion(vid);
  }

  // Get active form for a specific campaign — static prefix before :id
  @Get('campaign/:campaignId/active')
  findActiveByCampaign(
    @Param('campaignId') campaignId: string,
    @Req() req: any,
  ) {
    return this.formsService.findActiveByCampaign(campaignId, req.user.id);
  }

  // Create a new form — requires FORM_CREATE
  @Permissions(Permission.FORM_CREATE)
  @Post()
  create(@Body() body: any) {
    return this.formsService.create(body);
  }

  // ── Routes with :id wildcard below ─────────────────────────────

  // Get a single form by ID
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.formsService.findOne(id);
  }

  // Get all versions of a form
  @Get(':id/versions')
  getVersions(@Param('id') id: string) {
    return this.formsService.getVersions(id);
  }

  // Save new version (builder content) — requires FORM_CREATE
  @Permissions(Permission.FORM_CREATE)
  @Post(':id/versions')
  createVersion(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.formsService.createVersion(id, body, req.user.id);
  }

  // Archive a form — requires FORM_ARCHIVE
  @Permissions(Permission.FORM_ARCHIVE)
  @Patch(':id/archive')
  archive(@Param('id') id: string) {
    return this.formsService.archive(id);
  }

  // Update form metadata — requires FORM_CREATE (edit)
  @Permissions(Permission.FORM_CREATE)
  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.formsService.update(id, body);
  }

  // Delete a form permanently — requires FORM_DELETE
  @Permissions(Permission.FORM_DELETE)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.formsService.remove(id);
  }

  // Get QA analysts assigned to a form
  @Get(':id/assigned-qas')
  getAssignedQAs(@Param('id') id: string) {
    return this.formsService.getAssignedQAs(id);
  }

  // Assign QA analysts to a form — requires USER_MANAGE
  @Permissions(Permission.USER_MANAGE)
  @Post(':id/assign-qas')
  assignQAs(@Param('id') id: string, @Body('userIds') userIds: string[]) {
    return this.formsService.assignQAs(id, userIds);
  }

  // Duplicate a form — requires FORM_DUPLICATE
  @Permissions(Permission.FORM_DUPLICATE)
  @Post(':id/duplicate')
  duplicate(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.formsService.duplicate(id, body, req.user.id);
  }
}
