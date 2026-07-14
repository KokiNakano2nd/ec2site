import os
import tempfile

import uvicorn


def main() -> None:
    with tempfile.TemporaryDirectory(prefix="ec_site_e2e_") as temp_dir:
        database_path = os.path.join(temp_dir, "e2e.db")
        os.environ.update(
            {
                "APP_ENV": "test",
                "DATABASE_URL": f"sqlite:///{database_path}",
                "SECRET_KEY": "e2e-secret-key-not-for-production-only",
                "STRIPE_ENABLED": "false",
                "STRIPE_SECRET_KEY": "",
                "EMAIL_DELIVERY": "console",
            }
        )
        from app.database import Base, SessionLocal, engine
        from app.seed import seed_initial_data

        Base.metadata.create_all(bind=engine)
        with SessionLocal() as db:
            seed_initial_data(db)
        uvicorn.run("app.main:app", host="127.0.0.1", port=8000)


if __name__ == "__main__":
    main()
