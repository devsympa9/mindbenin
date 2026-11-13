import { Injectable } from "@nestjs/common"
import type { User } from "@prisma/client"

const FIRST_NAMES = [
  "Awa",
  "Kossi",
  "Chantal",
  "Ibrahim",
  "Grâce",
  "Sèna",
  "Rachida",
  "Arnaud",
  "Fatou",
  "Dossou",
  "Mireille",
  "Gildas",
]

const LAST_NAMES = [
  "Hounkpatin",
  "Dossou-Yovo",
  "Sossou",
  "Adjamossi",
  "Kpadonou",
  "Ahouansou",
  "Gbaguidi",
  "Tossou",
  "Djossou",
  "Bio Tchané",
  "Hounkpe",
  "Zinsou",
]

const BIRTH_PLACES = [
  "Cotonou",
  "Porto-Novo",
  "Abomey-Calavi",
  "Parakou",
  "Ouidah",
  "Bohicon",
  "Natitingou",
]

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]!
}

function randomDigits(length: number): string {
  let value = String(Math.floor(Math.random() * 9) + 1)

  while (value.length < length) {
    value += String(Math.floor(Math.random() * 10))
  }

  return value
}

export function publicUser(user: User) {
  return {
    id: user.id,
    npi: user.npi,
    firstName: user.firstName,
    lastName: user.lastName,
    birthDate: user.birthDate.toISOString(),
    birthPlace: user.birthPlace,
    gender: user.gender,
    phone: user.phone,
  }
}

/**
 * Simulation du scan facial et de l'interrogation ANIP.
 * En V1 réelle, cette méthode appellera l'API ANIP avec la photo.
 */
@Injectable()
export class IdentitySimulator {
  scan() {
    const firstName = pick(FIRST_NAMES)
    const lastName = pick(LAST_NAMES)
    const year = 1965 + Math.floor(Math.random() * 40)
    const month = Math.floor(Math.random() * 12)
    const day = 1 + Math.floor(Math.random() * 27)

    return {
      npi: randomDigits(13),
      firstName,
      lastName,
      birthDate: new Date(Date.UTC(year, month, day)),
      birthPlace: pick(BIRTH_PLACES),
      gender: Math.random() > 0.5 ? "Féminin" : "Masculin",
      phone: `01${randomDigits(8)}`,
      photoSeed: `${firstName}-${lastName}`,
    }
  }
}
