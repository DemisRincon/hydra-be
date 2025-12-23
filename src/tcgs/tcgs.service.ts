import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { CreateTcgDto } from './dto/create-tcg.dto.js';
import { UpdateTcgDto } from './dto/update-tcg.dto.js';

@Injectable()
export class TcgsService {
  constructor(private prisma: PrismaService) {}

  async create(createTcgDto: CreateTcgDto) {
    // Check if TCG with same name already exists
    const existing = await this.prisma.tcgs.findUnique({
      where: { name: createTcgDto.name },
    });

    if (existing) {
      throw new ConflictException('TCG with this name already exists');
    }

    return this.prisma.tcgs.create({
      data: createTcgDto,
    });
  }

  async findAll() {
    return this.prisma.tcgs.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findActive() {
    return this.prisma.tcgs.findMany({
      where: { is_active: true },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const tcg = await this.prisma.tcgs.findUnique({
      where: { id },
      include: {
        singles: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!tcg) {
      throw new NotFoundException(`TCG with ID ${id} not found`);
    }

    return tcg;
  }

  async update(id: string, updateTcgDto: UpdateTcgDto) {
    // Check if TCG exists
    const tcg = await this.prisma.tcgs.findUnique({
      where: { id },
    });

    if (!tcg) {
      throw new NotFoundException(`TCG with ID ${id} not found`);
    }

    // If name is being updated, check for conflicts
    if (updateTcgDto.name && updateTcgDto.name !== tcg.name) {
      const existing = await this.prisma.tcgs.findUnique({
        where: { name: updateTcgDto.name },
      });

      if (existing) {
        throw new ConflictException('TCG with this name already exists');
      }
    }

    return this.prisma.tcgs.update({
      where: { id },
      data: updateTcgDto,
    });
  }

  async remove(id: string) {
    // Check if TCG exists
    const tcg = await this.prisma.tcgs.findUnique({
      where: { id },
      include: {
        singles: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!tcg) {
      throw new NotFoundException(`TCG with ID ${id} not found`);
    }

    // Check if TCG has associated singles
    if (tcg.singles.length > 0) {
      throw new ConflictException(
        `Cannot delete TCG with ID ${id} because it has ${tcg.singles.length} associated singles`,
      );
    }

    return this.prisma.tcgs.delete({
      where: { id },
    });
  }
}



