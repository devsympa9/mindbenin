import { Controller, Get, NotFoundException, Param } from "@nestjs/common"

import { PrismaService } from "../prisma/prisma.service"

@Controller("services")
export class ServicesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list() {
    return this.prisma.service.findMany({
      where: { active: true },
      orderBy: { createdAt: "asc" },
    })
  }

  @Get(":slug")
  async get(@Param("slug") slug: string) {
    const service = await this.prisma.service.findUnique({ where: { slug } })

    if (!service || !service.active) {
      throw new NotFoundException("Service introuvable.")
    }

    return service
  }
}
