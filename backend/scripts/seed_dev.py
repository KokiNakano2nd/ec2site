from app import config
from app.database import Base, SessionLocal, engine
from app.seed import seed_initial_data


def main() -> None:
    if config.APP_ENV not in {"local", "test"}:
        raise RuntimeError("Seed is allowed only when APP_ENV is local or test")

    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        seed_initial_data(db)


if __name__ == "__main__":
    main()
