/** robots.txt gate (design §6.1). Stub — allows all for now. Wire a real
 *  fetch-and-parse of robots.txt before enabling any non-API page scrape. */
export function isAllowed(_url: string): Promise<boolean> {
  return Promise.resolve(true);
}
