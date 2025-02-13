from telethon.sync import TelegramClient
from telethon.sessions import StringSession
import asyncio
import os
from dotenv import load_dotenv
import qrcode
from typing import Tuple
import sys
import time
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

def get_credentials() -> Tuple[str, str]:
    """Get API credentials"""
    api_id = os.getenv('API_ID')
    api_hash = os.getenv('API_HASH')

    if not api_id and not api_hash:
        print_color("\nTo obtain API credentials:\n", Colors.WARNING)
        print_color("  1. Visit https://my.telegram.org/", Colors.DEFAULT)
        print_color("  2. Login with your Telegram account", Colors.DEFAULT)
        print_color("  3. Click on 'API Development tools'", Colors.DEFAULT)
        print_color("  4. Create a new application\n", Colors.DEFAULT)

    if api_id:
        print_color("Got API ID from environment variables", Colors.GREEN)
    else:
        if is_debug:
            api_id = input(f"{Colors.BLUE}Please enter your API ID: {Colors.ENDC}").strip()
        else:
            api_id = getpass(f"{Colors.BLUE}Please enter your API ID: {Colors.ENDC}").strip()

    if api_hash:
        print_color("Got API Hash from environment variables", Colors.GREEN)
    else:
        if is_debug:
            api_hash = input(f"{Colors.BLUE}Please enter your API Hash: {Colors.ENDC}").strip()
        else:
            api_hash = getpass(f"{Colors.BLUE}Please enter your API Hash: {Colors.ENDC}").strip()

    return api_id, api_hash

async def test_session_string(session_string: str, api_id: str, api_hash: str) -> bool:
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
        print_color(f"Test successful! Account info: {me.first_name} {me.last_name} (@{me.username})", Colors.GREEN)
        return True
    except Exception as e:
        print_color(f"Test failed: {str(e)}", Colors.FAIL)
        return False

async def stringGenerate():
    client = None
    try:
        print_color("====== Telegram Session String Generator ======\n", Colors.HEADER, True)

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

            # Display QR code in console
            qr = qrcode.QRCode(border=1)
            qr.add_data(qr_login.url)
            qr.make(fit=True)
            qr.print_ascii(invert=True)

            print_color("\nWaiting for scan...", Colors.BLUE)

            # Login timeout handling
            timeout = 60  # 60 seconds timeout
            start_time = time.time()

            while True:
                try:
                    if await qr_login.wait(timeout=1):
                        break

                    if time.time() - start_time > timeout:
                        print_color("\nLogin timeout! Please run the program again.", Colors.FAIL)
                        return

                    sys.stdout.write(".")
                    sys.stdout.flush()
                except asyncio.TimeoutError:
                    continue
                except Exception as e:
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

            with open("session/.session", "w") as f:
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
