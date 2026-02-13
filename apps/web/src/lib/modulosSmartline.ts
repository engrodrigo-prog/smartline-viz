import { BrainCircuit, Droplets, GitBranch, Link2, Mountain, Plane, Trees, Users } from "lucide-react";

export const modulosSmartline = [
  {
    id: "floodedAreas",
    moduleKey: "landing.modules.items.floodedAreas.module",
    icon: Droplets,
    categoryKey: "landing.modules.categories.environmental",
    challenge: {
      titleKey: "landing.modules.items.floodedAreas.challenge.title",
      descriptionKey: "landing.modules.items.floodedAreas.challenge.description",
      impactKey: "landing.modules.items.floodedAreas.challenge.impact",
    },
    solution: {
      titleKey: "landing.modules.items.floodedAreas.solution.title",
      descriptionKey: "landing.modules.items.floodedAreas.solution.description",
      benefitKey: "landing.modules.items.floodedAreas.solution.benefit",
    },
    path: "/ambiental/alagadas",
  },
  {
    id: "vegetation",
    moduleKey: "landing.modules.items.vegetation.module",
    icon: Trees,
    categoryKey: "landing.modules.categories.environmental",
    challenge: {
      titleKey: "landing.modules.items.vegetation.challenge.title",
      descriptionKey: "landing.modules.items.vegetation.challenge.description",
      impactKey: "landing.modules.items.vegetation.challenge.impact",
    },
    solution: {
      titleKey: "landing.modules.items.vegetation.solution.title",
      descriptionKey: "landing.modules.items.vegetation.solution.description",
      benefitKey: "landing.modules.items.vegetation.solution.benefit",
    },
    path: "/ambiental/vegetacao",
  },
  {
    id: "rightOfWay",
    moduleKey: "landing.modules.items.rightOfWay.module",
    icon: Mountain,
    categoryKey: "landing.modules.categories.environmental",
    challenge: {
      titleKey: "landing.modules.items.rightOfWay.challenge.title",
      descriptionKey: "landing.modules.items.rightOfWay.challenge.description",
      impactKey: "landing.modules.items.rightOfWay.challenge.impact",
    },
    solution: {
      titleKey: "landing.modules.items.rightOfWay.solution.title",
      descriptionKey: "landing.modules.items.rightOfWay.solution.description",
      benefitKey: "landing.modules.items.rightOfWay.solution.benefit",
    },
    path: "/ambiental/ocupacao",
  },
  {
    id: "splices",
    moduleKey: "landing.modules.items.splices.module",
    icon: Link2,
    categoryKey: "landing.modules.categories.structure",
    challenge: {
      titleKey: "landing.modules.items.splices.challenge.title",
      descriptionKey: "landing.modules.items.splices.challenge.description",
      impactKey: "landing.modules.items.splices.challenge.impact",
    },
    solution: {
      titleKey: "landing.modules.items.splices.solution.title",
      descriptionKey: "landing.modules.items.splices.solution.description",
      benefitKey: "landing.modules.items.splices.solution.benefit",
    },
    path: "/estrutura/emendas",
  },
  {
    id: "crossings",
    moduleKey: "landing.modules.items.crossings.module",
    icon: GitBranch,
    categoryKey: "landing.modules.categories.structure",
    challenge: {
      titleKey: "landing.modules.items.crossings.challenge.title",
      descriptionKey: "landing.modules.items.crossings.challenge.description",
      impactKey: "landing.modules.items.crossings.challenge.impact",
    },
    solution: {
      titleKey: "landing.modules.items.crossings.solution.title",
      descriptionKey: "landing.modules.items.crossings.solution.description",
      benefitKey: "landing.modules.items.crossings.solution.benefit",
    },
    path: "/estrutura/travessias",
  },
  {
    id: "droneMissions",
    moduleKey: "landing.modules.items.droneMissions.module",
    icon: Plane,
    categoryKey: "landing.modules.categories.operations",
    challenge: {
      titleKey: "landing.modules.items.droneMissions.challenge.title",
      descriptionKey: "landing.modules.items.droneMissions.challenge.description",
      impactKey: "landing.modules.items.droneMissions.challenge.impact",
    },
    solution: {
      titleKey: "landing.modules.items.droneMissions.solution.title",
      descriptionKey: "landing.modules.items.droneMissions.solution.description",
      benefitKey: "landing.modules.items.droneMissions.solution.benefit",
    },
    path: "/operacao/missoes",
  },
  {
    id: "teamManagement",
    moduleKey: "landing.modules.items.teamManagement.module",
    icon: Users,
    categoryKey: "landing.modules.categories.operations",
    challenge: {
      titleKey: "landing.modules.items.teamManagement.challenge.title",
      descriptionKey: "landing.modules.items.teamManagement.challenge.description",
      impactKey: "landing.modules.items.teamManagement.challenge.impact",
    },
    solution: {
      titleKey: "landing.modules.items.teamManagement.solution.title",
      descriptionKey: "landing.modules.items.teamManagement.solution.description",
      benefitKey: "landing.modules.items.teamManagement.solution.benefit",
    },
    path: "/equipes/rastreamento",
  },
  {
    id: "digitalTwinAI",
    moduleKey: "landing.modules.items.digitalTwinAI.module",
    icon: BrainCircuit,
    categoryKey: "landing.modules.categories.advancedAnalytics",
    challenge: {
      titleKey: "landing.modules.items.digitalTwinAI.challenge.title",
      descriptionKey: "landing.modules.items.digitalTwinAI.challenge.description",
      impactKey: "landing.modules.items.digitalTwinAI.challenge.impact",
    },
    solution: {
      titleKey: "landing.modules.items.digitalTwinAI.solution.title",
      descriptionKey: "landing.modules.items.digitalTwinAI.solution.description",
      benefitKey: "landing.modules.items.digitalTwinAI.solution.benefit",
    },
    path: "/analises/gemeo-digital",
  },
] as const;
