import os


def get_openai_api_key() -> str:
    try:
        with open(".env", "r", encoding="utf-8") as env_file:
            for line in env_file:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, value = line.split("=", 1)
                if key == "OPENAI_API_KEY":
                    return value.strip()
    except FileNotFoundError:
        pass

    return os.getenv("OPENAI_API_KEY", "")


api_key = get_openai_api_key()

if not api_key:
    raise ValueError("OPENAI_API_KEY is not set.")

print("OPENAI_API_KEY was loaded.")
