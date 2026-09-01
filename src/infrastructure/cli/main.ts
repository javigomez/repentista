import type { ApplicationHandler } from "../../application/application-handler.js";

export function runCli(application: ApplicationHandler): void {
  application();
}

export function main(): void {
  runCli(() => {
    console.log("Repentista listo para desarrollar subproyectos TypeScript.");
  });
}
