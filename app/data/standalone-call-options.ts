/** Explicitly unconfigured until SMD approves its own labels/values.
 * Figma has a dropdown but the export does not contain its option list.
 * Do not invent options or consume a nonexistent CMS Publication in standalone.
 */
export const standaloneCallPurposeOptions: readonly Readonly<{ value: string; label: string }>[] = [];
