import { Module } from "@nestjs/common"

import { FaceVerificationService } from "../face/face.service"
import { IdentityController } from "./identity.controller"
import { IdentityService } from "./identity.service"
import { IdentitySimulator } from "./identity.simulator"

@Module({
  controllers: [IdentityController],
  providers: [IdentityService, IdentitySimulator, FaceVerificationService],
  exports: [FaceVerificationService],
})
export class IdentityModule {}
