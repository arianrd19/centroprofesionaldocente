from slowapi import Limiter
from fastapi import Request


def get_client_ip(request: Request) -> str:
    """
    Obtiene IP real del cliente detrás de proxy (Render/Cloudflare).
    Fallback: request.client.host.
    """
    cf_ip = request.headers.get("cf-connecting-ip")
    if cf_ip:
        return cf_ip.strip()

    x_forwarded_for = request.headers.get("x-forwarded-for")
    if x_forwarded_for:
        return x_forwarded_for.split(",")[0].strip()

    if request.client and request.client.host:
        return request.client.host

    return "unknown"


limiter = Limiter(key_func=get_client_ip)
