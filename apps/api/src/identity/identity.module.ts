import { Module } from "@nestjs/common"

import { IdentityController } from "./identity.controller"
import { IdentityService } from "./identity.service"
import { IdentitySimulator } from "./identity.simulator"

@Module({
  controllers: [IdentityController],
  providers: [IdentityService, IdentitySimulator],
})
export class IdentityModule {}
