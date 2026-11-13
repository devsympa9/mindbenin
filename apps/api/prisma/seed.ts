import "dotenv/config"

import { Prisma, PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const services: Prisma.ServiceCreateInput[] = [
  {
    slug: "passeport",
    name: "Passeport biométrique",
    shortName: "Passeport",
    description:
      "Demande ou renouvellement de passeport biométrique. Ton dossier est transmis à la DEI avec ta photo et ton NPI.",
    icon: "passport",
    officialPrice: 50_000,
    commission: 1_000,
    processingDays: 10,
    pickupLocation: "DEI — Direction de l'Émigration et de l'Immigration, Cotonou",
    requirements: [
      "Identité NPI vérifiée",
      "Photo d'identité récente",
      "Ancien passeport (en cas de renouvellement)",
    ],
    fields: [
      {
        name: "typeDemande",
        label: "Type de demande",
        type: "select",
        options: ["Première demande", "Renouvellement", "Perte", "Vol"],
        required: true,
      },
      {
        name: "typePasseport",
        label: "Type de passeport",
        type: "select",
        options: ["Ordinaire", "Diplomatique", "De service"],
        required: true,
      },
    ],
  },
  {
    slug: "acte-naissance",
    name: "Acte de naissance",
    shortName: "Acte de naissance",
    description:
      "Extrait d'acte de naissance délivré par ta mairie d'arrondissement, pré-rempli depuis les registres ANIP.",
    icon: "certificate",
    officialPrice: 2_000,
    commission: 1_000,
    processingDays: 2,
    pickupLocation: "Mairie d'arrondissement — Cotonou",
    requirements: ["Identité NPI vérifiée", "Registre de naissance retrouvé"],
    fields: [
      {
        name: "nombreCopies",
        label: "Nombre de copies",
        type: "select",
        options: ["1 copie", "2 copies", "3 copies"],
        required: true,
      },
      {
        name: "usage",
        label: "Usage du document",
        type: "select",
        options: ["Scolarité", "Mariage", "Voyage", "Démarche administrative"],
        required: true,
      },
    ],
  },
  {
    slug: "casier-judiciaire",
    name: "Casier judiciaire",
    shortName: "Casier judiciaire",
    description:
      "Extrait de casier judiciaire (bulletin n°3) demandé auprès du tribunal de première instance.",
    icon: "gavel",
    officialPrice: 5_000,
    commission: 1_000,
    processingDays: 3,
    pickupLocation: "Tribunal de première instance — Cotonou",
    requirements: ["Identité NPI vérifiée", "Empreinte digitale enregistrée"],
    fields: [
      {
        name: "motif",
        label: "Motif de la demande",
        type: "select",
        options: ["Emploi", "Voyage", "Études", "Autre"],
        required: true,
      },
    ],
  },
  {
    slug: "tvm",
    name: "Taxe sur les véhicules à moteur",
    shortName: "TVM",
    description:
      "Paiement de la taxe annuelle sur les véhicules à moteur, transmis à la DGI avec ta carte grise.",
    icon: "car",
    officialPrice: 15_000,
    commission: 1_000,
    processingDays: 1,
    pickupLocation: "DGI — Centre des impôts de Cotonou",
    requirements: [
      "Identité NPI vérifiée",
      "Carte grise du véhicule",
      "Assurance en cours de validité",
    ],
    fields: [
      {
        name: "categorieVehicule",
        label: "Catégorie du véhicule",
        type: "select",
        options: ["Voiture particulière", "Utilitaire", "Moto", "Camion"],
        required: true,
      },
      {
        name: "puissanceFiscale",
        label: "Puissance fiscale",
        type: "select",
        options: ["4 à 6 CV", "7 à 9 CV", "10 CV et plus"],
        required: true,
      },
      {
        name: "immatriculation",
        label: "Immatriculation",
        type: "text",
        placeholder: "Ex : AB 1234 RB",
        required: true,
      },
    ],
  },
  {
    slug: "visite-technique",
    name: "Visite technique automobile",
    shortName: "Visite technique",
    description:
      "Réservation et paiement de la visite technique de ton véhicule dans un centre agréé.",
    icon: "tool",
    officialPrice: 12_000,
    commission: 1_000,
    processingDays: 1,
    pickupLocation: "Centre de visite technique — Cotonou",
    requirements: [
      "Identité NPI vérifiée",
      "Carte grise du véhicule",
      "Véhicule en état de présentation",
    ],
    fields: [
      {
        name: "typeVehicule",
        label: "Type de véhicule",
        type: "select",
        options: ["Voiture particulière", "Utilitaire", "Moto", "Camion"],
        required: true,
      },
      {
        name: "immatriculation",
        label: "Immatriculation",
        type: "text",
        placeholder: "Ex : AB 1234 RB",
        required: true,
      },
      {
        name: "centre",
        label: "Centre de visite",
        type: "select",
        options: ["Cotonou", "Porto-Novo", "Parakou", "Abomey-Calavi"],
        required: true,
      },
    ],
  },
  {
    slug: "facture-soneb",
    name: "Facture d'eau SONEB",
    shortName: "SONEB",
    description:
      "Paie ta facture d'eau SONEB avec ton numéro de facture ou de compteur, sans passer à l'agence.",
    icon: "droplet",
    officialPrice: 0,
    commission: 500,
    amountField: "montantFacture",
    processingDays: 1,
    pickupLocation: "SONEB — Agence de Cotonou",
    requirements: ["Identité NPI vérifiée", "Numéro de facture ou de compteur"],
    fields: [
      {
        name: "numeroFacture",
        label: "Numéro de facture ou de compteur",
        type: "text",
        placeholder: "Ex : 123456789",
        required: true,
      },
      {
        name: "montantFacture",
        label: "Montant de la facture (FCFA)",
        type: "text",
        placeholder: "Ex : 12 500",
        required: true,
      },
    ],
  },
  {
    slug: "facture-sbee",
    name: "Facture d'électricité SBEE",
    shortName: "SBEE",
    description:
      "Paie ta facture d'électricité SBEE avec ton numéro de facture ou de compteur, sans passer à l'agence.",
    icon: "bolt",
    officialPrice: 0,
    commission: 500,
    amountField: "montantFacture",
    processingDays: 1,
    pickupLocation: "SBEE — Agence de Cotonou",
    requirements: ["Identité NPI vérifiée", "Numéro de facture ou de compteur"],
    fields: [
      {
        name: "numeroFacture",
        label: "Numéro de facture ou de compteur",
        type: "text",
        placeholder: "Ex : 987654321",
        required: true,
      },
      {
        name: "montantFacture",
        label: "Montant de la facture (FCFA)",
        type: "text",
        placeholder: "Ex : 15 000",
        required: true,
      },
    ],
  },
  {
    slug: "impots",
    name: "Déclaration d'impôts",
    shortName: "Impôts",
    description:
      "Déclaration fiscale pré-remplie et déposée auprès de la DGI, avec suivi de l'accusé de réception.",
    icon: "tax",
    officialPrice: 2_000,
    commission: 1_000,
    processingDays: 1,
    pickupLocation: "DGI — Centre des impôts de Cotonou",
    requirements: ["Identité NPI vérifiée", "Revenus de l'année déclarés"],
    fields: [
      {
        name: "typeDeclaration",
        label: "Type de déclaration",
        type: "select",
        options: ["Impôt sur le revenu", "Patente", "Revenu foncier"],
        required: true,
      },
      {
        name: "revenuAnnuel",
        label: "Revenu annuel (FCFA)",
        type: "text",
        placeholder: "Ex : 2 400 000",
        required: true,
      },
    ],
  },
]

async function main() {
  for (const service of services) {
    await prisma.service.upsert({
      where: { slug: service.slug },
      update: service,
      create: service,
    })
  }

  const count = await prisma.service.count()
  console.log(`Seed terminé : ${count} services disponibles.`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
