import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from .logging_config import get_logger

logger = get_logger(__name__)

SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
FROM_EMAIL = os.getenv("FROM_EMAIL", "noreply@techstore.local")


def send_email(to: str, subject: str, body_html: str) -> None:
    if not SMTP_HOST:
        print(f"[EMAIL] To: {to}")
        print(f"[EMAIL] Subject: {subject}")
        print(f"[EMAIL] ---")
        plain = body_html.replace("<br>", "\n").replace("</p>", "\n").replace("</li>", "\n")
        import re
        plain = re.sub(r"<[^>]+>", "", plain).strip()
        print(plain)
        print(f"[EMAIL] ---")
        return
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = FROM_EMAIL
        msg["To"] = to
        msg.attach(MIMEText(body_html, "html", "utf-8"))
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as smtp:
            smtp.starttls()
            if SMTP_USER:
                smtp.login(SMTP_USER, SMTP_PASSWORD)
            smtp.sendmail(FROM_EMAIL, to, msg.as_string())
        logger.info("メール送信成功(to=%s, subject=%s)", to, subject)
    except Exception as e:
        logger.error("メール送信失敗(to=%s, subject=%s): %s", to, subject, e)


def send_order_confirmation(user_email: str, order_id: int, total_price: float, items: list[dict]) -> None:
    subject = f"【TechStore】ご注文確認 #{order_id}"
    items_html = "".join(
        f"<li>{item['name']} × {item['quantity']}個 — ¥{int(item['price'] * item['quantity']):,}</li>"
        for item in items
    )
    body_html = f"""
<html><body style="font-family:sans-serif;color:#333;max-width:560px;margin:0 auto;padding:24px">
  <h2 style="color:#1a1a2e">ご注文ありがとうございます</h2>
  <p>以下の内容でご注文を承りました。</p>
  <table style="width:100%;border-collapse:collapse;margin:16px 0">
    <tr style="background:#f5f5f5">
      <th style="text-align:left;padding:8px 12px;font-size:13px">注文番号</th>
      <td style="padding:8px 12px;font-size:13px"><strong>#{order_id}</strong></td>
    </tr>
  </table>
  <h3 style="margin-top:20px;font-size:14px">注文内容</h3>
  <ul style="padding-left:20px;font-size:14px;line-height:1.8">{items_html}</ul>
  <p style="font-size:16px;font-weight:bold;margin-top:16px;border-top:1px solid #eee;padding-top:16px">
    合計（税込）: ¥{int(total_price):,}
  </p>
  <p style="font-size:13px;color:#888;margin-top:24px">TechStore カスタマーサポート</p>
</body></html>
"""
    send_email(user_email, subject, body_html)


def send_status_notification(user_email: str, order_id: int, status: str) -> None:
    status_labels = {
        "processing": ("処理中", "ご注文の処理を開始しました。"),
        "shipped": ("発送済み", "商品を発送しました。もうしばらくお待ちください。"),
        "completed": ("完了", "ご注文が完了しました。またのご利用をお待ちしております。"),
    }
    if status not in status_labels:
        return
    label, message = status_labels[status]
    subject = f"【TechStore】注文ステータス更新 #{order_id}（{label}）"
    body_html = f"""
<html><body style="font-family:sans-serif;color:#333;max-width:560px;margin:0 auto;padding:24px">
  <h2 style="color:#1a1a2e">注文ステータスのお知らせ</h2>
  <p>注文番号 <strong>#{order_id}</strong> のステータスが更新されました。</p>
  <p style="font-size:15px;font-weight:bold;color:#5b8bf5">{label}</p>
  <p>{message}</p>
  <p style="font-size:13px;color:#888;margin-top:24px">TechStore カスタマーサポート</p>
</body></html>
"""
    send_email(user_email, subject, body_html)
