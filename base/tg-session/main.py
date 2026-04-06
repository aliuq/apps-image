from telethon import TelegramClient
from telethon.errors import PasswordHashInvalidError, SessionPasswordNeededError
from telethon.sessions import StringSession
import asyncio
from datetime import datetime, timezone
import os
from dotenv import load_dotenv
import qrcode
from typing import Tuple
import sys
import termios
import tty
from getpass import getpass

load_dotenv()

is_debug = os.getenv('DEBUG', 'false').lower() == 'true'

# Define color codes
class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    GREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    DEFAULT = '\033[99m'

def print_color(text: str, color: str, bold: bool = False) -> None:
    """Print colored text in terminal"""
    if bold:
        print(f"{Colors.BOLD}{color}{text}{Colors.ENDC}")
    else:
        print(f"{color}{text}{Colors.ENDC}")


def masked_input(prompt: str) -> str:
    if not sys.stdin.isatty() or not sys.stdout.isatty():
        return getpass(prompt)

    file_descriptor = sys.stdin.fileno()
    original_settings = termios.tcgetattr(file_descriptor)
    buffer = []

    try:
        sys.stdout.write(prompt)
        sys.stdout.flush()
        tty.setraw(file_descriptor)

        while True:
            char = sys.stdin.read(1)

            if char in {"\r", "\n"}:
                sys.stdout.write("\n")
                sys.stdout.flush()
                return "".join(buffer)

            if char == "\x03":
                raise KeyboardInterrupt

            if char in {"\x7f", "\b"}:
                if buffer:
                    buffer.pop()
                    sys.stdout.write("\b \b")
                    sys.stdout.flush()
                continue

            buffer.append(char)
            sys.stdout.write("*")
            sys.stdout.flush()
    finally:
        termios.tcsetattr(file_descriptor, termios.TCSADRAIN, original_settings)


def get_qr_expiry_seconds(qr_login) -> int:
    expires_at = qr_login.expires
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    remaining_seconds = int((expires_at - datetime.now(timezone.utc)).total_seconds())
    return max(0, remaining_seconds)


def format_qr_expiry(qr_login) -> str:
    expires_at = qr_login.expires
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    local_expires_at = expires_at.astimezone()
    return local_expires_at.strftime("%Y-%m-%d %H:%M:%S %Z")


def render_qr_login(qr_login) -> None:
    qr = qrcode.QRCode(border=1)
    qr.add_data(qr_login.url)
    qr.make(fit=True)
    qr.print_ascii(invert=True)

    print_color(
        f"\nQR code expires at: {format_qr_expiry(qr_login)} "
        f"({get_qr_expiry_seconds(qr_login)}s remaining)",
        Colors.WARNING,
    )


def update_waiting_status(remaining_seconds: int) -> None:
    sys.stdout.write(
        f"\r{Colors.BLUE}Waiting for scan... {remaining_seconds:>3}s remaining{Colors.ENDC}"
    )
    sys.stdout.flush()


def finish_waiting_status() -> None:
    sys.stdout.write("\n")
    sys.stdout.flush()

def get_credentials() -> Tuple[int, str]:
    """Get API credentials"""
    api_id = os.getenv('API_ID')
    api_hash = os.getenv('API_HASH')

    if not api_id or not api_hash:
        print_color("\nTo obtain API credentials:\n", Colors.WARNING)
        print_color("  1. Visit https://my.telegram.org/", Colors.DEFAULT)
        print_color("  2. Login with your Telegram account", Colors.DEFAULT)
        print_color("  3. Click on 'API Development tools'", Colors.DEFAULT)
        print_color("  4. Create a new application\n", Colors.DEFAULT)

    if api_id:
        print_color("Got API ID from environment variables", Colors.GREEN)
    else:
        api_id = input(f"{Colors.BLUE}Please enter your API ID: {Colors.ENDC}").strip()

    if not api_id.isdigit():
        raise ValueError("API ID must be a numeric value")

    if api_hash:
        print_color("Got API Hash from environment variables", Colors.GREEN)
    else:
        api_hash = masked_input(f"{Colors.BLUE}Please enter your API Hash: {Colors.ENDC}").strip()

    return int(api_id), api_hash

async def test_session_string(session_string: str, api_id: int, api_hash: str) -> bool:
    """Test if the session string is valid"""
    try:
        print_color("\nTesting session string...\n", Colors.BLUE)
        client = TelegramClient(StringSession(session_string), api_id, api_hash)
        await client.connect()

        if not await client.is_user_authorized():
            await client.disconnect()
            print_color("Test failed: Invalid session string", Colors.FAIL)
            return False

        me = await client.get_me()
        await client.disconnect()
        name = " ".join(part for part in [me.first_name, me.last_name] if part)
        username = f" (@{me.username})" if me.username else ""
        print_color(f"Test successful! Account info: {name or me.id}{username}", Colors.GREEN)
        return True
    except Exception as e:
        print_color(f"Test failed: {str(e)}", Colors.FAIL)
        return False


def get_two_factor_password() -> str:
    return masked_input(f"{Colors.BLUE}Please enter your Telegram 2FA password: {Colors.ENDC}")


async def complete_two_factor_sign_in(client: TelegramClient, max_attempts: int = 3) -> bool:
    for attempt in range(1, max_attempts + 1):
        try:
            await client.sign_in(password=get_two_factor_password())
            return True
        except PasswordHashInvalidError:
            if attempt == max_attempts:
                print_color("Invalid 2FA password. Maximum attempts reached.", Colors.FAIL)
                return False

            print_color(
                f"Invalid 2FA password. Please try again ({attempt}/{max_attempts}).",
                Colors.WARNING,
            )

    return False

async def stringGenerate():
    client = None
    try:
        print_color("====== Telegram Session String Generator ======", Colors.HEADER, True)

        api_id, api_hash = get_credentials()
        if not api_id or not api_hash:
            print_color("Error: API credentials cannot be empty", Colors.FAIL)
            return

        client = TelegramClient(StringSession(), api_id, api_hash)
        await client.connect()

        print_color("\nPlease scan the QR code with Telegram app:\n", Colors.BLUE)

        try:
            # Get QR login info
            qr_login = await client.qr_login()
            render_qr_login(qr_login)

            while True:
                try:
                    remaining_seconds = get_qr_expiry_seconds(qr_login)
                    if remaining_seconds <= 0:
                        finish_waiting_status()
                        print_color("QR code expired. Generating a new QR code...", Colors.WARNING)
                        await qr_login.recreate()
                        render_qr_login(qr_login)
                        continue

                    update_waiting_status(remaining_seconds)

                    if await qr_login.wait(timeout=min(1, remaining_seconds)):
                        finish_waiting_status()
                        break
                except asyncio.TimeoutError:
                    continue
                except SessionPasswordNeededError:
                    finish_waiting_status()
                    print_color("\nTelegram account requires a 2FA password.", Colors.WARNING)
                    if not await complete_two_factor_sign_in(client):
                        return
                    break
                except Exception as e:
                    finish_waiting_status()
                    print_color(f"\nError during QR scan: {str(e)}", Colors.FAIL)
                    return

            print_color("\nQR code scanned! Getting session info...", Colors.GREEN)

            # Ensure login success
            if not await client.is_user_authorized():
                print_color("\nLogin failed: Authorization unsuccessful", Colors.FAIL)
                return

            session_string = client.session.save()
            print_color("\n=== Session String Generated Successfully ===", Colors.GREEN, True)
            print_color("Please save your session string securely:", Colors.WARNING)

            os.makedirs("session", exist_ok=True)
            with open("session/.session", "w", encoding="utf-8") as f:
                f.write(session_string)

            if is_debug:
                print(f"\n{session_string}\n")
            else:
                print_color("\nSession string has been saved to '/app/session/.session'", Colors.DEFAULT)

            # Test the generated session string
            is_valid = await test_session_string(session_string, api_id, api_hash)
            if not is_valid:
                print_color("\nWarning: The generated session string might not work properly!", Colors.WARNING)

        except Exception as e:
            print_color(f"\nError during QR login process: {str(e)}", Colors.FAIL)
            return

    except KeyboardInterrupt:
        print_color("\n\nOperation cancelled", Colors.WARNING)
    except Exception as e:
        print_color(f"\nError occurred: {str(e)}", Colors.FAIL)
    finally:
        if client:
            try:
                await client.disconnect()
            except:
                pass

if __name__ == "__main__":
    asyncio.run(stringGenerate())
