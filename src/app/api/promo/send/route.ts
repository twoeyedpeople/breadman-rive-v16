import { NextRequest } from "next/server";

// development link for vault
//const VAULT_BASE_URL = "https://vault-esp-staging-au-kvwr4chkta-ts.a.run.app/v1";

const VAULT_BASE_URL = "https://api.vault-portal.com/v1";

const CODE_CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function generateCode(length = 6): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => CODE_CHARSET[b % CODE_CHARSET.length]).join(
    ""
  );
}

async function readBody(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const phoneRaw = (body as { phone?: unknown } | null)?.phone;
    const phone =
      typeof phoneRaw === "string" ? phoneRaw.replace(/\D/g, "") : "";

    if (phone.length < 10 || phone.length > 15) {
      return Response.json(
        { error: "Please provide a valid phone number" },
        { status: 400 }
      );
    }

    const username = requireEnv("VAULT_USERNAME");
    const password = requireEnv("VAULT_PASSWORD");
    const campaignId = Number(process.env.VAULT_CAMPAIGN_ID ?? "1582");
    const email = process.env.VAULT_EMAIL ?? "travisaweerts@gmail.com";

    console.log("LOGIN ", JSON.stringify({ username, password }));

    let loginBody: { access_token?: string } | null = null;
    let loginRes: Response;
    try {
      loginRes = await fetch(`${VAULT_BASE_URL}/users/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          username: "travisaweerts@gmail.com",
          password: `m2ay4Z$GH!4n&aH6`,
        }),
        cache: "no-store",
      });
      loginBody = (await readBody(loginRes)) as {
        access_token?: string;
      } | null;
    } catch (err) {
      console.error("Vault login network error", err);
      return Response.json(
        { error: "Network error while authenticating with Vault." },
        { status: 502 }
      );
    }

    const accessToken = loginBody?.access_token;

    if (!loginRes.ok || !accessToken) {
      console.error("Vault login failed", loginRes.status, loginBody);
      return Response.json(
        {
          error:
            "Unable to authenticate with Vault. Please try again in a moment.",
          details: loginBody ?? null,
        },
        { status: 502 }
      );
    }

    const code = generateCode(6);

    const createRes = await fetch(`${VAULT_BASE_URL}/cards/create`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        campaign_id: campaignId,
        code,
        first_name: "Traveller",
        last_name: "Merry",
        value: 10.0,
        phone,
        email,
        send_sms: true,
        get_link: true,
      }),
      cache: "no-store",
    });

    const createBody = await readBody(createRes);

    if (!createRes.ok) {
      return Response.json(
        {
          error:
            "Unable to create card at the moment. Please try again shortly.",
          details: createBody ?? null,
        },
        { status: 502 }
      );
    }

    return Response.json({
      success: true,
      code,
      result: createBody,
    });
  } catch (error) {
    console.error("Promo send error", error);
    return Response.json(
      { error: "Unexpected server error while sending promo." },
      { status: 500 }
    );
  }
}
export const runtime = "nodejs";
