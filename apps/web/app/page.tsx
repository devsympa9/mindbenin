import Link from "next/link"
import {
  IconArrowRight,
  IconBolt,
  IconBuildingBank,
  IconCheck,
  IconClock,
  IconCreditCard,
  IconDeviceMobile,
  IconMapPin,
  IconMicrophone,
  IconScan,
  IconShieldCheck,
  IconSparkles,
} from "@tabler/icons-react"

import { Brand } from "@/components/brand"

const PROBLEMS = [
  {
    stat: "4 h",
    title: "de queue à la DEI",
    description: "Se lever à 5 h pour espérer passer avant la fermeture du guichet.",
  },
  {
    stat: "3×",
    title: "le même déplacement",
    description: "Revenir parce qu'il manque une pièce, un cachet ou une photocopie.",
  },
  {
    stat: "20 000",
    title: "FCFA de taxi",
    description: "Deux jours perdus, sans compter l'argent glissé pour « accélérer ».",
  },
]

const JOURNEY = [
  {
    icon: IconScan,
    title: "Tu es reconnu",
    description: "Un scan du visage, et l'ANIP te renvoie ton NPI, ton nom et ta photo.",
  },
  {
    icon: IconMicrophone,
    title: "Tu penses",
    description: "Dis « je veux mon passeport » ou touche une carte de service.",
  },
  {
    icon: IconBolt,
    title: "L'app exécute",
    description: "Dossier créé, formulaire pré-rempli, prix officiel calculé en 30 secondes.",
  },
  {
    icon: IconCreditCard,
    title: "Tu payes",
    description: "MTN MoMo ou Moov Money, reçu instantané, sans espèces.",
  },
  {
    icon: IconMapPin,
    title: "Tu suis",
    description: "Une barre de progression jusqu'à « prêt à récupérer », puis tu viens chercher.",
  },
]

const TECHNOLOGIES = [
  {
    icon: IconMicrophone,
    title: "IA vocale",
    description: "Français, fon, yoruba : la demande se dit, elle ne se remplit pas.",
  },
  {
    icon: IconShieldCheck,
    title: "Reconnaissance faciale",
    description: "Ton visage devient ta pièce d'identité, plus besoin de photocopies.",
  },
  {
    icon: IconBuildingBank,
    title: "Interopérabilité",
    description: "ANIP, DEI, mairies, DGI : l'app parle directement aux bases de l'État.",
  },
]

const PHASES = [
  {
    label: "Phase 1 · MVP",
    title: "La démo",
    description: "Scan, paiement et administration simulés. 4 services, un parcours complet.",
    state: "Aujourd'hui",
  },
  {
    label: "Phase 2 · V1",
    title: "Le réel",
    description: "API ANIP et MTN MoMo réelles, un seul service : l'acte de naissance.",
    state: "Prochaine étape",
  },
  {
    label: "Phase 3 · 2050",
    title: "La vision",
    description: "Toutes les administrations : santé, école, permis, impôts.",
    state: "Vision",
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-svh bg-background">
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
          <Brand />
          <div className="flex items-center gap-2">
            <Link
              href="/scan"
              className="hidden text-xs font-medium text-muted-foreground transition hover:text-foreground sm:block"
            >
              Se connecter
            </Link>
            <Link
              href="/app"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90"
            >
              Ouvrir l&apos;app <IconArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute -left-24 top-0 size-72 rounded-full bg-primary/10 blur-3xl" />
          <div className="pointer-events-none absolute -right-24 top-24 size-80 rounded-full bg-amber-400/10 blur-3xl" />

          <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 lg:grid-cols-2 lg:py-24">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border bg-background px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-primary">
                <IconSparkles size={12} aria-hidden="true" /> MVP · Bénin 2026
              </span>

              <h1 className="mt-5 text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
                Tu penses,
                <br />
                <span className="text-primary">l&apos;État exécute.</span>
              </h1>

              <p className="mt-5 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                Passeport, acte de naissance, casier judiciaire, impôts. MindBenin remplit le
                formulaire avec ton NPI, paie les frais officiels et suit ton dossier. Tu ne fais
                plus la queue : tu viens récupérer.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href="/scan"
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
                >
                  <IconScan size={18} aria-hidden="true" /> Scanner mon visage
                </Link>
                <Link
                  href="/app"
                  className="inline-flex h-11 items-center gap-2 rounded-xl border px-5 text-sm font-medium transition hover:bg-secondary"
                >
                  Voir les services <IconArrowRight size={16} aria-hidden="true" />
                </Link>
              </div>

              <dl className="mt-10 grid max-w-lg grid-cols-3 gap-4">
                {[
                  ["2 j → 5 min", "de démarche"],
                  ["3 → 1", "déplacement"],
                  ["0", "photocopie"],
                ].map(([value, label]) => (
                  <div key={label}>
                    <dt className="text-lg font-semibold tracking-tight text-primary sm:text-xl">
                      {value}
                    </dt>
                    <dd className="mt-0.5 text-[11px] text-muted-foreground">{label}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="relative mx-auto w-full max-w-xs">
              <div className="rounded-[2rem] border bg-card p-4 shadow-2xl">
                <div className="flex items-center justify-between px-1 text-[10px] text-muted-foreground">
                  <span className="font-semibold text-foreground">MindBenin</span>
                  <span>9:41</span>
                </div>

                <div className="mt-4 rounded-2xl bg-primary p-4 text-primary-foreground">
                  <p className="text-[10px] uppercase tracking-wide opacity-80">Passeport</p>
                  <p className="mt-1 font-mono text-xs font-semibold">BJ-2026-88742</p>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/25">
                    <div className="h-full w-3/4 rounded-full bg-white" />
                  </div>
                  <p className="mt-2 text-[10px] opacity-90">Prêt à récupérer · DEI Cotonou</p>
                </div>

                <div className="mt-3 space-y-2 rounded-2xl border bg-background p-3">
                  {[
                    "Identité ANIP vérifiée",
                    "Formulaire pré-rempli",
                    "51 000 FCFA payés via MoMo",
                  ].map((line) => (
                    <div key={line} className="flex items-center gap-2 text-[10px]">
                      <span className="grid size-4 place-items-center rounded-full bg-primary/10 text-primary">
                        <IconCheck size={9} aria-hidden="true" />
                      </span>
                      {line}
                    </div>
                  ))}
                </div>

                <div className="mt-3 flex items-center justify-between rounded-2xl border bg-background p-3">
                  <div className="flex items-center gap-2">
                    <span className="grid size-7 place-items-center rounded-lg bg-primary/10 text-primary">
                      <IconDeviceMobile size={14} aria-hidden="true" />
                    </span>
                    <div>
                      <p className="text-[10px] font-semibold">Notification</p>
                      <p className="text-[9px] text-muted-foreground">Ton passeport est prêt</p>
                    </div>
                  </div>
                  <span className="text-[9px] text-muted-foreground">maintenant</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y bg-secondary/40">
          <div className="mx-auto grid max-w-6xl gap-6 px-5 py-14 md:grid-cols-3">
            <div className="md:col-span-1">
              <h2 className="text-2xl font-semibold tracking-tight">
                Le problème n&apos;est pas l&apos;administration.
                <span className="block text-primary">C&apos;est la file d&apos;attente.</span>
              </h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-3 md:col-span-2">
              {PROBLEMS.map((problem) => (
                <div key={problem.title} className="rounded-2xl border bg-background p-4">
                  <p className="text-2xl font-semibold tracking-tight">{problem.stat}</p>
                  <p className="mt-1 text-xs font-medium">{problem.title}</p>
                  <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                    {problem.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-16">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              Le parcours
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight">
              Cinq étapes, zéro guichet.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              L&apos;administration vient à toi dans ton téléphone. Toi, tu viens juste récupérer.
            </p>
          </div>

          <ol className="mt-10 grid gap-4 md:grid-cols-5">
            {JOURNEY.map((step, index) => {
              const Icon = step.icon

              return (
                <li key={step.title} className="rounded-2xl border bg-card p-4">
                  <div className="flex items-center justify-between">
                    <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
                      <Icon size={18} aria-hidden="true" />
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      0{index + 1}
                    </span>
                  </div>
                  <p className="mt-3 text-sm font-semibold">{step.title}</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                    {step.description}
                  </p>
                </li>
              )
            })}
          </ol>
        </section>

        <section className="border-y bg-secondary/40">
          <div className="mx-auto grid max-w-6xl gap-8 px-5 py-16 lg:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                Transparence
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight">
                Le prix officiel, plus 1 000 FCFA de confort.
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                MindBenin ne touche pas à l&apos;argent de l&apos;État. La commission paie le
                service : dossier pré-rempli, paiement mobile money, suivi et notification.
              </p>

              <div className="mt-6 rounded-2xl border bg-background p-5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Passeport officiel</span>
                  <span className="font-medium">50 000 FCFA</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Frais MindBenin</span>
                  <span className="font-medium">1 000 FCFA</span>
                </div>
                <div className="mt-3 border-t pt-3">
                  <div className="flex items-center justify-between text-base font-semibold">
                    <span>Tu payes</span>
                    <span className="text-primary">51 000 FCFA</span>
                  </div>
                  <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                    1 000 usagers par jour × 1 000 FCFA = 1 000 000 FCFA par jour, sans prendre un
                    franc à l&apos;État.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid content-start gap-4">
              {TECHNOLOGIES.map((technology) => {
                const Icon = technology.icon

                return (
                  <div key={technology.title} className="flex gap-4 rounded-2xl border bg-background p-5">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                      <Icon size={20} aria-hidden="true" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold">{technology.title}</p>
                      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                        {technology.description}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-16">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              La trajectoire
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight">
              De la démo à l&apos;État plateforme.
            </h2>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {PHASES.map((phase, index) => (
              <div
                key={phase.label}
                className={
                  index === 0
                    ? "rounded-2xl border border-primary/30 bg-primary/5 p-5"
                    : "rounded-2xl border bg-card p-5"
                }
              >
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {phase.label}
                  </p>
                  <span className="rounded-full bg-background px-2 py-0.5 text-[9px] font-medium text-muted-foreground">
                    {phase.state}
                  </span>
                </div>
                <p className="mt-3 text-lg font-semibold tracking-tight">{phase.title}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                  {phase.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 pb-16">
          <div className="relative overflow-hidden rounded-3xl bg-primary px-6 py-12 text-primary-foreground sm:px-10">
            <div className="pointer-events-none absolute -right-10 -top-10 size-48 rounded-full bg-white/10 blur-2xl" />
            <div className="relative flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] opacity-80">
                  Think &amp; Go
                </p>
                <h2 className="mt-2 max-w-md text-2xl font-semibold tracking-tight sm:text-3xl">
                  Ton prochain passeport commence par un scan.
                </h2>
                <p className="mt-2 max-w-md text-xs leading-relaxed opacity-90">
                  Démo ouverte : identité, administration et paiement simulés, parcours complet.
                </p>
              </div>
              <Link
                href="/scan"
                className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl bg-background px-5 text-sm font-semibold text-primary transition hover:bg-background/90"
              >
                <IconScan size={18} aria-hidden="true" /> Essayer
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-3 px-5 py-6 text-[11px] text-muted-foreground sm:flex-row sm:items-center">
          <Brand />
          <p>
            MVP de démonstration · Aucune donnée réelle, aucun paiement réel.{" "}
            <span className="inline-flex items-center gap-1">
              <IconClock size={12} aria-hidden="true" /> 2026
            </span>
          </p>
        </div>
      </footer>
    </div>
  )
}
