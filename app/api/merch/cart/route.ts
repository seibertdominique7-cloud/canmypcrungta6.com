import {
  addFourthwallCartItems,
  changeFourthwallCartItem,
  createFourthwallCart,
  FourthwallApiError,
  FourthwallConfigurationError,
  getFourthwallCart,
} from '../../../lib/fourthwall';
import { isRequestSameOrigin } from '../../../lib/admin-auth';

export const dynamic = 'force-dynamic';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: Request) {
  const cartId = new URL(request.url).searchParams.get('cartId')?.trim() ?? '';
  if (!UUID_PATTERN.test(cartId)) {
    return Response.json({ error: 'A valid cart ID is required.' }, { status: 400 });
  }

  try {
    const cart = await getFourthwallCart(cartId);
    return noStoreJson({ cart });
  } catch (error) {
    return fourthwallErrorResponse(error);
  }
}

export async function POST(request: Request) {
  if (!isRequestSameOrigin(request)) {
    return Response.json({ error: 'Invalid request origin.' }, { status: 403 });
  }

  const body = await readCartBody(request, false);
  if ('error' in body) {
    return Response.json({ error: body.error }, { status: 400 });
  }

  try {
    const item = { variantId: body.variantId, quantity: body.quantity };
    const cart = body.cartId
      ? await addFourthwallCartItems(body.cartId, [item])
      : await createFourthwallCart([item]);
    return noStoreJson({ cart });
  } catch (error) {
    return fourthwallErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  if (!isRequestSameOrigin(request)) {
    return Response.json({ error: 'Invalid request origin.' }, { status: 403 });
  }

  const body = await readCartBody(request, true);
  if ('error' in body) {
    return Response.json({ error: body.error }, { status: 400 });
  }
  if (!body.cartId) {
    return Response.json({ error: 'A valid cart ID is required.' }, { status: 400 });
  }

  try {
    const cart = await changeFourthwallCartItem(body.cartId, {
      variantId: body.variantId,
      quantity: body.quantity,
    });
    return noStoreJson({ cart });
  } catch (error) {
    return fourthwallErrorResponse(error);
  }
}

async function readCartBody(request: Request, allowZero: boolean): Promise<
  | {
      cartId?: string;
      variantId: string;
      quantity: number;
    }
  | { error: string }
> {
  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return { error: 'A valid JSON body is required.' };
  }

  if (!input || typeof input !== 'object') {
    return { error: 'Cart information is required.' };
  }

  const value = input as Record<string, unknown>;
  const cartId = typeof value.cartId === 'string' ? value.cartId.trim() : '';
  const variantId = typeof value.variantId === 'string' ? value.variantId.trim() : '';
  const quantity = Number(value.quantity);

  if (cartId && !UUID_PATTERN.test(cartId)) return { error: 'The cart ID is invalid.' };
  if (!UUID_PATTERN.test(variantId)) return { error: 'The product option is invalid.' };
  if (
    !Number.isInteger(quantity) ||
    quantity < (allowZero ? 0 : 1) ||
    quantity > 25
  ) {
    return { error: `Quantity must be between ${allowZero ? 0 : 1} and 25.` };
  }

  return {
    cartId: cartId || undefined,
    variantId,
    quantity,
  };
}

function noStoreJson(payload: unknown, init?: ResponseInit) {
  return Response.json(payload, {
    ...init,
    headers: {
      'Cache-Control': 'no-store',
      ...init?.headers,
    },
  });
}

function fourthwallErrorResponse(error: unknown) {
  if (error instanceof FourthwallConfigurationError) {
    return noStoreJson({ error: error.message }, { status: 503 });
  }
  if (error instanceof FourthwallApiError) {
    return noStoreJson(
      { error: error.message, code: error.code },
      { status: error.status >= 500 ? 502 : error.status },
    );
  }
  console.error('[Fourthwall cart] Unexpected request failure.');
  return noStoreJson(
    { error: 'The cart is temporarily unavailable. Please try again.' },
    { status: 500 },
  );
}
