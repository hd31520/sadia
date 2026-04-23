export const CART_ROUTE_PATH = "/cart";
export const CART_ROUTE_SEGMENT = "cart";
export const CART_ROUTE_ALIAS_SEGMENTS = ["card", "cart-sale", "pos", "checkout"];
export const CART_ROUTE_PATHS = [
  CART_ROUTE_PATH,
  ...CART_ROUTE_ALIAS_SEGMENTS.map((segment) => `/${segment}`),
];

export function isCartRoutePath(pathname = "") {
  const normalized = String(pathname || "").replace(/\/+$/, "") || "/";
  return CART_ROUTE_PATHS.some(
    (path) => normalized === path || normalized.startsWith(`${path}/`)
  );
}
