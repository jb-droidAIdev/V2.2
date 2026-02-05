import { Controller, Get, Post, Body, Param, Patch, UseGuards, Delete, Req, HttpException, HttpStatus } from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('campaigns')
export class CampaignsController {
    constructor(private readonly campaignsService: CampaignsService) { }

    @UseGuards(JwtAuthGuard)
    @Get()
    findAll() {
        return this.campaignsService.findAll();
    }

    @UseGuards(JwtAuthGuard)
    @Get('mine/assigned')
    findAssigned(@Req() req: any) {
        return this.campaignsService.findAssigned(req.user.id);
    }

    @UseGuards(JwtAuthGuard)
    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.campaignsService.findOneDetail(id);
    }

    @UseGuards(JwtAuthGuard)
    @Post()
    create(@Body() body: any) {
        return this.campaignsService.create(body);
    }

    @UseGuards(JwtAuthGuard)
    @Patch(':id')
    update(@Param('id') id: string, @Body() body: any) {
        return this.campaignsService.update(id, body);
    }

    @UseGuards(JwtAuthGuard)
    @Post(':id/assign-qa')
    assignQa(@Param('id') id: string, @Body('userId') userId: string) {
        return this.campaignsService.assignQa(id, userId);
    }

    @UseGuards(JwtAuthGuard)
    @Delete(':id')
    async remove(@Param('id') id: string) {
        try {
            return await this.campaignsService.remove(id);
        } catch (error) {
            console.error('Delete Campaign Error:', error);
            throw new HttpException(
                error.message || 'Failed to delete campaign due to checks',
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }
}
