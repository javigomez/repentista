/** Public entrypoint for application use cases. */
export type ApplicationHandler = () => void;
export * from "./batch-originality-assessment/index.js";
export * from "./octonol-meter/index.js";
export * from "./v4-final-word-selection/index.js";
export * from "./naturalness-assessment/index.js";
