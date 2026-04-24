import asyncio
import re
import requests
import random
import string
from playwright.async_api import async_playwright

# --- CẤU HÌNH CỦA KN XZX ---
API_KEY = "fce_9b395dd0e52feefeb103b0795846103aa6afa0b07e1697a1bd8fff6ba7979ade"
MAIL_URL = "https://www.freecustom.email/api"

def generate_password():
    return "".join(random.choices(string.ascii_letters + string.digits, k=12)) + "@Kn"

async def get_otp(email_id):
    headers = {"Authorization": f"Bearer {API_KEY}"}
    for _ in range(20): # Đợi tối đa 100 giây
        await asyncio.sleep(5)
        try:
            res = requests.get(f"{MAIL_URL}/emails/{email_id}/messages", headers=headers).json()
            if res.get('messages'):
                body = res['messages'][0]['body']
                otp = re.findall(r'\d{6}', body)
                if otp: return otp[0]
        except: pass
    return None

async def register_tiktok(acc_index):
    async with async_playwright() as p:
        # Giả lập thiết bị di động để né Captcha gắt
        iphone = p.devices['iPhone 13']
        browser = await p.chromium.launch(headless=True) # Chạy ngầm trên GitHub
        context = await browser.new_context(**iphone)
        page = await context.new_page()

        print(f"[Acc {acc_index}] Đang lấy mail...")
        headers_mail = {"Authorization": f"Bearer {API_KEY}"}
        res_mail = requests.post(f"{MAIL_URL}/emails", headers=headers_mail).json()
        email = res_mail['email']
        email_id = res_mail['id']
        password = generate_password()

        # Truy cập trang đăng ký
        await page.goto("https://www.tiktok.com/signup/repository/email", wait_until="networkidle")
        
        # Điền thông tin
        await page.fill('input[name="email"]', email)
        await page.fill('input[type="password"]', password)
        await asyncio.sleep(1)
        
        # Click nút gửi mã
        await page.click('button[type="submit"]')
        print(f"[Acc {acc_index}] Đã bấm gửi mã. Đang đợi OTP...")

        # Đợi lấy mã OTP từ API Mail
        otp_code = await get_otp(email_id)
        
        if otp_code:
            await page.fill('input[placeholder="Enter 6-digit code"]', otp_code)
            await asyncio.sleep(2)
            await page.keyboard.press("Enter")
            
            # Lưu lại nếu thành công
            with open("clones.txt", "a") as f:
                f.write(f"Email: {email} | Pass: {password} | Status: Success\n")
            print(f"[SUCCESS] Acc {acc_index} thành công!")
        else:
            print(f"[FAILED] Acc {acc_index} không nhận được OTP.")

        await browser.close()

async def main():
    # Chạy song song 5 luồng (mỗi luồng làm 2 acc để đủ 10 acc)
    # Không nên chạy quá nhiều luồng cùng lúc trên GitHub để tránh lỗi
    for i in range(0, 10, 5):
        tasks = [register_tiktok(j) for j in range(i, i+5)]
        await asyncio.gather(*tasks)

if __name__ == "__main__":
    asyncio.run(main())
