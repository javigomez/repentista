import type { QuatrainStructureInput } from "./index.js";

export function validQuatrainStructure(): QuatrainStructureInput {
  return {
    rhymeScheme: "0-A-0-A",
    verses: [
      { slot: "V1", role: "PRESENTACION", text: "Presenta al gato" },
      { slot: "V2", role: "PREPARACION", text: "Promete el melón" },
      { slot: "V3", role: "GIRO_TENSION", text: "Se distrae un montón" },
      { slot: "V4", role: "REMATE", text: "Y guarda el jamón" },
    ],
    plannedFinalWords: { V2: "melón", V4: "jamón" },
  };
}
