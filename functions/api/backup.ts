// Cloudflare Pages Function: /api/backup
// Handles Cloudflare KV cloud backup for Digital Hishob-Khata

interface Env {
  CLOUDFLARE_API_TOKEN?: string;
  CLOUDFLARE_ACCOUNT_ID?: string;
}

const DEFAULT_ACCOUNT_ID = '036d7d22b6189673995f09c9397fb1af';
const KV_NAMESPACE_ID = '2d10c88d46e745b2b8b3dbea18be5069';

export const onRequestPost = async (context: { request: Request; env: Env }): Promise<Response> => {
  try {
    const backupData = await context.request.json();
    const token = context.env?.CLOUDFLARE_API_TOKEN;
    const accountId = context.env?.CLOUDFLARE_ACCOUNT_ID || DEFAULT_ACCOUNT_ID;

    if (!token) {
      return new Response(
        JSON.stringify({ success: false, error: 'CLOUDFLARE_API_TOKEN environment variable not set in Pages settings.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const payload = JSON.stringify({
      data: backupData,
      backed_up_at: new Date().toISOString(),
    });

    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${KV_NAMESPACE_ID}/values/latest_backup`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: payload,
      }
    );

    if (!res.ok) {
      const err = await res.text();
      return new Response(JSON.stringify({ success: false, error: err }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({ success: true, timestamp: new Date().toISOString() }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const onRequestGet = async (context: { env: Env }): Promise<Response> => {
  try {
    const token = context.env?.CLOUDFLARE_API_TOKEN;
    const accountId = context.env?.CLOUDFLARE_ACCOUNT_ID || DEFAULT_ACCOUNT_ID;

    if (!token) {
      return new Response(
        JSON.stringify({ success: false, error: 'CLOUDFLARE_API_TOKEN environment variable not set in Pages settings.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${KV_NAMESPACE_ID}/values/latest_backup`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (res.status === 404) {
      return new Response(
        JSON.stringify({ success: false, message: 'No backup found in Cloudflare' }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const body = await res.json();
    return new Response(JSON.stringify({ success: true, backup: body }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

