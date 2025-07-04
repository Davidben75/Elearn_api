import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ICollaboration, IUserWithRole } from '../common/interfaces';
import { PrismaService } from '../database/prisma.service';
import { CollaborationDto } from './dto/collaboration.dto';
import { formatDateToLocal } from '../utils';
import { Prisma } from '@prisma/client';

@Injectable()
export class CollaborationService {
  constructor(private prismaService: PrismaService) {}

  async addNewCollaboration(
    collaboration: ICollaboration,
    prisma: PrismaService | Prisma.TransactionClient = this.prismaService,
  ) {
    try {
      if (
        collaboration.learnerId !== collaboration.tutorId &&
        collaboration.learnerId !== null &&
        collaboration.tutorId !== null
      ) {
        console.log(collaboration);
        const learnerId = collaboration.learnerId;
        const tutorId = collaboration.tutorId;

        await prisma.collaboration.create({
          data: {
            learnerId: learnerId,
            tutorId: tutorId,
            status: 'ACTIVE',
          },
        });
        console.log('Collaboration added successfully');
      }
    } catch (error) {
      console.error('Error adding new collaboration:', error);
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new Error('Unable to add new collaboration');
    }
  }

  async findCollaboration(
    learnerId: number,
    tutorId: number,
    prisma: PrismaService | Prisma.TransactionClient = this.prismaService,
  ) {
    try {
      return await prisma.collaboration.findFirst({
        where: {
          AND: [
            {
              learnerId: learnerId,
            },
            {
              tutorId: tutorId,
            },
          ],
        },
      });
    } catch (error) {
      console.error('Error finding collaboration:', error);
      throw new Error('Unable to find collaboration');
    }
  }

  async getCollaborationByTutorId(tutorId: number) {
    try {
      const collaborations = await this.prismaService.collaboration.findMany({
        where: {
          tutorId: tutorId,
        },
        select: {
          learner: {
            select: {
              id: true,
              name: true,
              email: true,
              lastName: true,
              status: true,
            },
          },
        },
      });

      const learners = collaborations.map(
        (collaboration) => collaboration.learner,
      );

      return learners;
    } catch (error) {
      console.error('Error finding collaboration:', error);
      throw new Error('Unable to find collaboration');
    }
  }

  async getAllCollaborations(): Promise<CollaborationDto[]> {
    try {
      const collaborations = await this.prismaService.collaboration.findMany({
        include: {
          learner: true,
          tutor: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return collaborations.map((collaboration) => ({
        id: collaboration.id,
        learnerId: collaboration.learnerId,
        tutorId: collaboration.tutorId,
        status: collaboration.status,
        createdAt: formatDateToLocal(collaboration.createdAt),
        learnerName: collaboration.learner.name,
        learnerLastName: collaboration.learner.lastName,
        learnerEmail: collaboration.learner.email,
        tutorEmail: collaboration.tutor.email,
        tutorName: collaboration.tutor.name,
        tutorLastName: collaboration.tutor.lastName,
      }));
    } catch (error) {
      console.error('Error finding collaboration:', error);
      throw new Error('Unable to find collaboration');
    }
  }

  async deleteCollaboration(collaborationId: number, user: IUserWithRole) {
    try {
      const deletedCollaboration =
        await this.prismaService.collaboration.findUnique({
          where: { id: collaborationId },
          select: { tutorId: true },
        });

      if (!deletedCollaboration) {
        throw new NotFoundException(
          `Collaboration with ID ${collaborationId} not found`,
        );
      }

      if (user.role !== 'ADMIN' && user.id !== deletedCollaboration.tutorId) {
        throw new UnauthorizedException(
          'You are not authorized to perform this action',
        );
      }

      await this.prismaService.collaboration.delete({
        where: { id: collaborationId },
      });

      return { message: 'Collaboration deleted successfully' };
    } catch (error) {
      console.error('Error deleting collaboration:', error.message);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error('Unable to delete collaboration');
    }
  }

  async updateCollaborationStatus(
    collaborationId: number,
    user: IUserWithRole,
  ) {
    try {
      const collaboration = await this.prismaService.collaboration.findUnique({
        where: { id: collaborationId },
        select: { status: true, tutorId: true },
      });

      if (!collaboration) {
        throw new NotFoundException(
          `Collaboration with ID ${collaborationId} not found`,
        );
      }

      if (user.role !== 'ADMIN' && user.id !== collaboration.tutorId) {
        throw new UnauthorizedException(
          'You are not authorized to perform this action',
        );
      }

      const newStatus =
        collaboration.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

      await this.prismaService.collaboration.update({
        where: { id: collaborationId },
        data: { status: newStatus },
      });

      return { message: 'Status updated successfully', newStatus };
    } catch (error) {
      console.error('Error updating collaboration status:', error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error('Unable to update collaboration status');
    }
  }
}
