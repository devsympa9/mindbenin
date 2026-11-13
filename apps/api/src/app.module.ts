import "dotenv/config"

import { Module } from "@nestjs/common"
import { JwtModule } from "@nestjs/jwt"

import { AdminModule } from "./admin/admin.module"
import { AppController } from "./app.controller"
import { DossiersModule } from "./dossiers/dossiers.module"
import { IdentityModule } from "./identity/identity.module"
import { PaymentsModule } from "./payments/payments.module"
import { PrismaModule } from "./prisma/prisma.module"
import { ServicesModule } from "./services/services.module"

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET ?? "mindbenin-dev-secret",
      signOptions: { expiresIn: "30d" },
    }),
    IdentityModule,
    ServicesModule,
    DossiersModule,
    PaymentsModule,
    AdminModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
