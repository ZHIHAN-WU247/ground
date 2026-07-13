export function isCheckoutOrderAuthReady(accessToken: string | null | undefined) {
  return Boolean(accessToken?.trim());
}
