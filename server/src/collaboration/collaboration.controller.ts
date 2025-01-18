import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CollaborationService } from './collaboration.service';
import { successResponse } from 'src/utils';
import { JwtAuthGuard, RoleGuard, StatusActiveGuard } from 'src/common/guard';
import { GetUser, Roles } from 'src/common/decorators';
import { TutorIdGuard } from 'src/common/guard/tutor-id.guard';

@UseGuards(JwtAuthGuard, RoleGuard, StatusActiveGuard)
@Controller('collaboration')
export class CollaborationController {
  constructor(private collaborationService: CollaborationService) {}

  // GET TUTOR COLLABORATIONS LIST
  @Roles('tutor')
  @UseGuards(TutorIdGuard)
  @Get('tutor')
  async getCollaborationByTutor(@GetUser() user, @Req() req) {
    try {
      const tutorId = req.tutorId;
      const collaborations =
        await this.collaborationService.getCollaborationByTutorId(
          tutorId,
          user,
        );

      if (collaborations.length === 0) {
        return successResponse([], 'No collaboration records found', 200);
      }

      return successResponse(
        collaborations,
        'Collaborations found successfully',
        200,
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  //   UPDATE STATUS COLLABORATION
  @Patch(':collaborationId')
  @Roles('admin', 'tutor')
  async updateCollaborationStatus(collaborationId: number, @GetUser() user) {
    try {
      const updatedCollaboration =
        await this.collaborationService.updateCollaborationStatus(
          collaborationId,
          user,
        );

      const { newStatus, message } = updatedCollaboration;
      return successResponse(newStatus, message, 200);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  //   DELELETE COLLABORATION
  @Delete('delete/:collaborationId')
  @Roles('admin, tutor')
  async deleteCollaboration(collaborationId: number, @GetUser() user) {
    try {
      const deletedCollaboration =
        await this.collaborationService.deleteCollaboration(
          collaborationId,
          user,
        );
      return successResponse(
        deletedCollaboration,
        'Collaboration deleted successfully',
        200,
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  // -----------
  //   ADMIN
  // -----------

  //   GET ALL COLLABORATIONS
  @Roles('admin')
  @Get('all')
  async getAllCollaboration() {
    try {
      const collaborations =
        await this.collaborationService.getAllCollaborations();
      return successResponse(
        collaborations,
        'Collaborations found successfully',
        200,
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  //   GET COLLABORATION BY TUTOR ID
  @Roles('admin')
  @Get('tutor/:id')
  async getCollaborationById(id: number, @GetUser() user) {
    try {
      const collaboration =
        await this.collaborationService.getCollaborationByTutorId(id, user);
      return successResponse(
        collaboration,
        'Collaboration found successfully',
        200,
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
